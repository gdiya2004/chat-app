import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Redis } from "ioredis";

import { Message } from "./models/Message.js";
import { verifyToken } from "./auth.js";
import { connectDB, isDBConnected } from "./db.js";

connectDB();

let pub: Redis | null = null;
let sub: Redis | null = null;
let isRedisConnected = false;

if (process.env.REDIS_URL) {
  try {
    pub = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Don't spam retries if offline
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
    sub.connect().catch(() => { });

    sub.subscribe("chat").catch(() => { });

    sub.on("message", (channel: string, message: string) => {
      if (channel !== "chat") return;
      try {
        const { roomId, text, sender } = JSON.parse(message);
        broadcastLocal(roomId, text, sender);
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

const rooms = new Map<string, Set<WebSocket>>();
const inMemoryHistory = new Map<string, Array<{ text: string; sender: string }>>();

// Broadcast message to all local room participants
function broadcastLocal(roomId: string, text: string, sender: string) {
  const users = rooms.get(roomId);
  if (!users) return;

  const payload = JSON.stringify({ text, sender });
  users.forEach((userSocket) => {
    if (userSocket.readyState === WebSocket.OPEN) {
      userSocket.send(payload);
    }
  });
}

// Broadcast message (via Redis if available, otherwise local broadcast)
async function broadcastMessage(roomId: string, text: string, sender: string) {
  // Always update in-memory history cache
  if (!inMemoryHistory.has(roomId)) {
    inMemoryHistory.set(roomId, []);
  }
  const history = inMemoryHistory.get(roomId)!;
  history.push({ text, sender });
  if (history.length > 100) history.shift();

  // Save to DB asynchronously if connected
  if (isDBConnected()) {
    Message.create({ text, sender, roomId }).catch((err) => {
      console.error("❌ Error saving message to DB:", (err as Error).message);
    });
  }

  if (isRedisConnected && pub) {
    try {
      await pub.publish("chat", JSON.stringify({ roomId, text, sender }));
    } catch {
      // Fallback to local broadcast if Redis publish fails
      broadcastLocal(roomId, text, sender);
    }
  } else {
    // Single-instance local broadcast
    broadcastLocal(roomId, text, sender);
  }
}

wss.on("connection", (socket) => {
  console.log("🟢 New user connected");

  let currentRoom: string | null = null;

  socket.on("message", async (rawMessage) => {
    try {
      const parsed = JSON.parse(rawMessage.toString());

      // ✅ JOIN ROOM
      if (parsed.type === "join") {
        const roomId = parsed.payload?.roomId;
        const token = parsed.payload?.token;

        if (!roomId || !token) {
          socket.close();
          return;
        }

        // ✅ Verify token
        const user = verifyToken(token);
        if (!user) {
          console.log("❌ Invalid token");
          socket.close();
          return;
        }

        const username = user.username;
        currentRoom = roomId;

        // ✅ Create room if not exists
        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Set());
          console.log(`🆕 Room created: ${roomId}`);
        }

        rooms.get(roomId)?.add(socket);

        console.log(`👤 ${username} joined room: ${roomId}`);

        // ✅ Fetch message history (DB or in-memory fallback)
        let history: Array<{ text: string; sender: string }> = [];

        if (isDBConnected()) {
          try {
            const messages = await Message.find({ roomId })
              .sort({ createdAt: 1 })
              .limit(50)
              .exec();

            history = messages.map((msg) => ({
              text: msg.text || "",
              sender: msg.sender || "Anonymous",
            }));
          } catch (dbErr) {
            console.error("❌ Error fetching DB messages:", (dbErr as Error).message);
            history = inMemoryHistory.get(roomId) || [];
          }
        } else {
          history = inMemoryHistory.get(roomId) || [];
        }

        // Always send history back so frontend can exit loading state
        socket.send(
          JSON.stringify({
            type: "history",
            payload: history,
          })
        );
      }

      // ✅ SEND MESSAGE (SECURE)
      if (parsed.type === "chat") {
        if (!currentRoom) return;

        const text = parsed.payload?.message;
        const token = parsed.payload?.token;

        if (!text || !token) return;

        // ✅ Verify token
        const user = verifyToken(token);
        if (!user) return;

        const sender = user.username; // 🔥 TRUSTED

        await broadcastMessage(currentRoom, text, sender);
      }
    } catch (err) {
      console.error("❌ Error processing message:", err);
    }
  });

  // ✅ CLEANUP ON DISCONNECT
  socket.on("close", () => {
    console.log("🔴 User disconnected");

    if (currentRoom && rooms.has(currentRoom)) {
      const users = rooms.get(currentRoom);
      users?.delete(socket);

      console.log(`👤 User left room: ${currentRoom}`);

      if (users?.size === 0) {
        rooms.delete(currentRoom);
        console.log(`🗑️ Room deleted: ${currentRoom}`);
      }
    }
  });
});