import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Redis } from "ioredis";

import { Message } from "./models/Message.js";
import { verifyToken } from "./auth.js";
import { connectDB, isDBConnected } from "./db.js";

connectDB();

interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
  username?: string;
  currentRoom?: string;
}

let pub: Redis | null = null;
let sub: Redis | null = null;
let isRedisConnected = false;

if (process.env.REDIS_URL) {
  try {
    pub = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    sub = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });

    pub.on("connect", () => {
      console.log("✅ Redis Pub connected");
      isRedisConnected = true;
    });
    sub.on("connect", () => {
      console.log("✅ Redis Sub connected");
    });

    pub.on("error", (err: Error) => {
      isRedisConnected = false;
      console.warn("⚠️ Redis Pub error (fallback to in-memory):", err.message);
    });
    sub.on("error", (err: Error) => {
      console.warn("⚠️ Redis Sub error (fallback to in-memory):", err.message);
    });

    pub.connect().catch(() => {
      isRedisConnected = false;
    });
    sub.connect().catch(() => {});

    sub.subscribe("chat").catch(() => {});

    sub.on("message", (channel: string, rawMessage: string) => {
      if (channel !== "chat") return;
      try {
        const parsed = JSON.parse(rawMessage);
        handleRedisIncomingEvent(parsed);
      } catch (err) {
        console.error("Error parsing Redis message:", err);
      }
    });
  } catch (err) {
    console.warn("⚠️ Failed to initialize Redis, running in local mode:", (err as Error).message);
  }
} else {
  console.log("ℹ️ No REDIS_URL provided. Running in single-server local mode.");
}

const PORT = Number(process.env.PORT) || 8080;

const server = http.createServer();
const wss = new WebSocketServer({ server });

server.listen(PORT, () => {
  console.log(`⚡ WebSocket server running on port ${PORT}`);
});

// In-Memory state management
// roomId -> Map<ExtendedWebSocket, username>
const roomUsers = new Map<string, Map<ExtendedWebSocket, string>>();
// roomId -> Array<any>
const inMemoryHistory = new Map<string, Array<any>>();

// Helper: Get unique online usernames in a room
function getOnlineUsers(roomId: string): string[] {
  const userMap = roomUsers.get(roomId);
  if (!userMap) return [];
  return Array.from(new Set(userMap.values()));
}

// Broadcast presence list to all local clients in a room
function broadcastPresenceLocal(roomId: string) {
  const userMap = roomUsers.get(roomId);
  if (!userMap) return;

  const users = getOnlineUsers(roomId);
  const payload = JSON.stringify({
    type: "presence_update",
    payload: { users, roomId },
  });

  userMap.forEach((_name, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

// Relay Presence (Local + Redis)
async function broadcastPresence(roomId: string) {
  broadcastPresenceLocal(roomId);
  if (isRedisConnected && pub) {
    try {
      await pub.publish(
        "chat",
        JSON.stringify({
          eventType: "presence",
          roomId,
          users: getOnlineUsers(roomId),
        })
      );
    } catch {}
  }
}

// Local dispatch of message payload to all sockets in room
function broadcastLocal(roomId: string, messagePayload: any) {
  const userMap = roomUsers.get(roomId);
  if (!userMap) return;

  const payload = JSON.stringify({
    type: "chat",
    payload: messagePayload,
  });

  userMap.forEach((_name, userSocket) => {
    if (userSocket.readyState === WebSocket.OPEN) {
      userSocket.send(payload);
    }
  });
}

// Local dispatch of arbitrary typed event to room
function dispatchRoomEventLocal(roomId: string, eventType: string, payload: any) {
  const userMap = roomUsers.get(roomId);
  if (!userMap) return;

  const raw = JSON.stringify({
    type: eventType,
    payload,
  });

  userMap.forEach((_name, userSocket) => {
    if (userSocket.readyState === WebSocket.OPEN) {
      userSocket.send(raw);
    }
  });
}

// Targeted dispatch of WebRTC / direct signaling event to a specific username
function dispatchTargetedUserLocal(roomId: string, targetUsername: string, eventType: string, payload: any) {
  const userMap = roomUsers.get(roomId);
  if (!userMap) return;

  const raw = JSON.stringify({
    type: eventType,
    payload,
  });

  userMap.forEach((username, userSocket) => {
    if (username === targetUsername && userSocket.readyState === WebSocket.OPEN) {
      userSocket.send(raw);
    }
  });
}

// Handle events incoming from Redis Pub/Sub for multi-server sync
function handleRedisIncomingEvent(data: any) {
  const { eventType, roomId } = data;
  if (!roomId) return;

  switch (eventType) {
    case "chat_message":
      broadcastLocal(roomId, data.messagePayload);
      break;
    case "presence":
      broadcastPresenceLocal(roomId);
      break;
    case "user_typing":
      dispatchRoomEventLocal(roomId, "user_typing", data.payload);
      break;
    case "status_update":
      dispatchRoomEventLocal(roomId, "message_status_update", data.payload);
      break;
    case "webrtc_signal":
      dispatchTargetedUserLocal(roomId, data.targetUser, data.signalType, data.payload);
      break;
    default:
      break;
  }
}

// Broadcast chat message across DB, In-Memory, Redis & Local Sockets
async function broadcastMessage(roomId: string, msgData: any) {
  // Update in-memory history cache
  if (!inMemoryHistory.has(roomId)) {
    inMemoryHistory.set(roomId, []);
  }
  const history = inMemoryHistory.get(roomId)!;
  history.push(msgData);
  if (history.length > 100) history.shift();

  // Async save to MongoDB
  if (isDBConnected()) {
    Message.create(msgData).catch((err) => {
      console.error("❌ Error saving message to DB:", (err as Error).message);
    });
  }

  // Publish to Redis or broadcast locally
  if (isRedisConnected && pub) {
    try {
      await pub.publish(
        "chat",
        JSON.stringify({
          eventType: "chat_message",
          roomId,
          messagePayload: msgData,
        })
      );
    } catch {
      broadcastLocal(roomId, msgData);
    }
  } else {
    broadcastLocal(roomId, msgData);
  }
}

// 💓 Heartbeat Reaper: Ping connections every 30s to reap dead sockets
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((client) => {
    const ws = client as ExtendedWebSocket;
    if (ws.isAlive === false) {
      console.log(`💀 Reaping dead socket for user ${ws.username || "Anonymous"}`);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on("close", () => {
  clearInterval(heartbeatInterval);
});

// WebSocket Connection Lifecycle
wss.on("connection", (socket: ExtendedWebSocket) => {
  socket.isAlive = true;
  socket.on("pong", () => {
    socket.isAlive = true;
  });

  console.log("🟢 New client connected");

  socket.on("message", async (rawMessage) => {
    try {
      const parsed = JSON.parse(rawMessage.toString());
      const { type, payload } = parsed;

      // ==========================================
      // 1. JOIN ROOM
      // ==========================================
      if (type === "join") {
        const { roomId, token } = payload || {};
        if (!roomId || !token) {
          socket.close();
          return;
        }

        const user = verifyToken(token);
        if (!user) {
          console.log("❌ Invalid JWT token");
          socket.close();
          return;
        }

        const username = user.username;
        socket.username = username;
        socket.currentRoom = roomId;

        if (!roomUsers.has(roomId)) {
          roomUsers.set(roomId, new Map());
        }
        roomUsers.get(roomId)!.set(socket, username);

        console.log(`👤 ${username} joined room: ${roomId}`);

        // Broadcast presence
        await broadcastPresence(roomId);

        // Fetch history
        let history: any[] = [];
        if (isDBConnected()) {
          try {
            const messages = await Message.find({ roomId })
              .sort({ createdAt: 1 })
              .limit(50)
              .lean()
              .exec();

            history = messages.map((msg: any) => ({
              messageId: msg.messageId || String(msg._id),
              text: msg.text || "",
              sender: msg.sender || "Anonymous",
              roomId: msg.roomId,
              status: msg.status || "sent",
              readBy: msg.readBy || [],
              fileUrl: msg.fileUrl || "",
              fileType: msg.fileType || "",
              fileName: msg.fileName || "",
              fileSize: msg.fileSize || 0,
              createdAt: msg.createdAt,
            }));
          } catch (dbErr) {
            console.error("❌ Error fetching DB messages:", (dbErr as Error).message);
            history = inMemoryHistory.get(roomId) || [];
          }
        } else {
          history = inMemoryHistory.get(roomId) || [];
        }

        socket.send(
          JSON.stringify({
            type: "history",
            payload: history,
          })
        );
      }

      // ==========================================
      // 2. CHAT MESSAGE (Text & File attachments)
      // ==========================================
      if (type === "chat") {
        const { roomId, message, token, fileUrl, fileType, fileName, fileSize } = payload || {};
        const room = roomId || socket.currentRoom;
        if (!room || !token) return;

        const user = verifyToken(token);
        if (!user) return;

        const sender = user.username;
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        const msgData = {
          messageId,
          text: message || "",
          sender,
          roomId: room,
          status: "sent",
          readBy: [],
          fileUrl: fileUrl || "",
          fileType: fileType || "",
          fileName: fileName || "",
          fileSize: fileSize || 0,
          createdAt: new Date(),
        };

        await broadcastMessage(room, msgData);
      }

      // ==========================================
      // 3. TYPING INDICATORS
      // ==========================================
      if (type === "typing_start" || type === "typing_stop") {
        const { roomId, token } = payload || {};
        const room = roomId || socket.currentRoom;
        if (!room || !token) return;

        const user = verifyToken(token);
        if (!user) return;

        const isTyping = type === "typing_start";
        const typingPayload = { username: user.username, isTyping, roomId: room };

        dispatchRoomEventLocal(room, "user_typing", typingPayload);

        if (isRedisConnected && pub) {
          try {
            await pub.publish(
              "chat",
              JSON.stringify({
                eventType: "user_typing",
                roomId: room,
                payload: typingPayload,
              })
            );
          } catch {}
        }
      }

      // ==========================================
      // 4. MESSAGE STATUS ACKS (Delivered & Read)
      // ==========================================
      if (type === "ack_delivered" || type === "ack_read") {
        const { messageId, roomId, token } = payload || {};
        const room = roomId || socket.currentRoom;
        if (!messageId || !room || !token) return;

        const user = verifyToken(token);
        if (!user) return;

        const newStatus = type === "ack_read" ? "read" : "delivered";

        // Update in DB
        if (isDBConnected()) {
          if (type === "ack_read") {
            Message.updateOne(
              { messageId, roomId: room },
              { $set: { status: "read" }, $addToSet: { readBy: user.username } }
            ).catch(() => {});
          } else {
            Message.updateOne(
              { messageId, roomId: room, status: { $ne: "read" } },
              { $set: { status: "delivered" } }
            ).catch(() => {});
          }
        }

        // Update in-memory history cache if present
        const hist = inMemoryHistory.get(room);
        if (hist) {
          const target = hist.find((m) => m.messageId === messageId);
          if (target) {
            if (newStatus === "read" || target.status !== "read") {
              target.status = newStatus;
            }
          }
        }

        const statusPayload = {
          messageId,
          status: newStatus,
          roomId: room,
          readBy: user.username,
        };

        dispatchRoomEventLocal(room, "message_status_update", statusPayload);

        if (isRedisConnected && pub) {
          try {
            await pub.publish(
              "chat",
              JSON.stringify({
                eventType: "status_update",
                roomId: room,
                payload: statusPayload,
              })
            );
          } catch {}
        }
      }

      // ==========================================
      // 5. WEBRTC SIGNALING RELAY
      // ==========================================
      if (
        type === "webrtc_call_request" ||
        type === "webrtc_call_accepted" ||
        type === "webrtc_call_declined" ||
        type === "webrtc_call_busy" ||
        type === "webrtc_offer" ||
        type === "webrtc_answer" ||
        type === "webrtc_ice_candidate" ||
        type === "webrtc_call_ended"
      ) {
        const { targetUser, roomId, token } = payload || {};
        const room = roomId || socket.currentRoom;
        if (!room || !token) return;

        const user = verifyToken(token);
        if (!user) return;

        const signalPayload = {
          ...payload,
          caller: user.username,
        };

        // Dispatch locally to target user
        dispatchTargetedUserLocal(room, targetUser, type, signalPayload);

        // Relay across Redis for multi-server setups
        if (isRedisConnected && pub) {
          try {
            await pub.publish(
              "chat",
              JSON.stringify({
                eventType: "webrtc_signal",
                roomId: room,
                targetUser,
                signalType: type,
                payload: signalPayload,
              })
            );
          } catch {}
        }
      }
    } catch (err) {
      console.error("❌ Error processing socket message:", err);
    }
  });

  // ==========================================
  // DISCONNECT & CLEANUP
  // ==========================================
  socket.on("close", async () => {
    const room = socket.currentRoom;
    const username = socket.username;
    console.log(`🔴 User ${username || "Anonymous"} disconnected`);

    if (room && roomUsers.has(room)) {
      const userMap = roomUsers.get(room)!;
      userMap.delete(socket);

      if (userMap.size === 0) {
        roomUsers.delete(room);
        console.log(`🗑️ Room deleted from memory: ${room}`);
      }

      await broadcastPresence(room);
    }
  });
});