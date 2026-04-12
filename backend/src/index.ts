import RedisPkg from "ioredis";

const Redis = RedisPkg.default;

const pub = new Redis(process.env.REDIS_URL!);
const sub = new Redis(process.env.REDIS_URL!);


import dotenv from "dotenv";
dotenv.config();

import { WebSocketServer, WebSocket } from "ws";

import { Message } from "./models/Message.js";
import { verifyToken } from "./auth.js";

import { connectDB } from "./db.js";
connectDB();


const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: Number(PORT) });
const rooms = new Map<string, Set<WebSocket>>();

sub.subscribe("chat");

sub.on("message", (channel, message) => {
  if (channel !== "chat") return;

  const { roomId, text, sender } = JSON.parse(message);

  const users = rooms.get(roomId);

  users?.forEach((userSocket) => {
    if (userSocket.readyState === WebSocket.OPEN) {
      userSocket.send(
        JSON.stringify({
          text,
          sender,
        })
      );
    }
  });
});

wss.on("connection", (socket) => {
  console.log("🟢 New user connected");

  let currentRoom: string | null = null;

  socket.on("message", async (message) => {
    try {
      const parsed = JSON.parse(message.toString());

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

        // ✅ Fetch old messages
        try {
          const messages = await Message.find({ roomId })
            .sort({ createdAt: 1 })
            .limit(50);

          socket.send(
            JSON.stringify({
              type: "history",
              payload: messages.map((msg) => ({
                text: msg.text,
                sender: msg.sender,
              })),
            })
          );
        } catch (dbErr) {
          console.error("❌ Error fetching messages:", dbErr);
        }
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

        // ✅ Save to DB
        try {
          await Message.create({
            text,
            sender,
            roomId: currentRoom,
          });
        } catch (dbErr) {
          console.error("❌ Error saving message:", dbErr);
        }

        await pub.publish(
          "chat",
          JSON.stringify({
            roomId: currentRoom,
            text,
            sender,
          })
        );
      }
    } catch (err) {
      console.error("❌ Error parsing message:", err);
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