import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { login } from "./auth.js";
import type { Request, Response } from "express";

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or any localhost origin
      if (
        !origin ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        origin === "https://letsconnectx.vercel.app"
      ) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for development
      }
    },
    credentials: true,
  })
);
app.use(express.json());

app.post("/login", (req: Request, res: Response) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    const token = login(username);

    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.AUTH_PORT || 3000;

app.listen(PORT, () => {
  console.log(`🔐 Auth server running on port ${PORT}`);
});