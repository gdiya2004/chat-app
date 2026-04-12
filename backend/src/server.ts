import express from "express";
import cors from "cors";
import { login } from "./auth.js";
import type { Request, Response } from "express";

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://letsconnectx.vercel.app"
  ],
  credentials: true
}));
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Auth server running on port ${PORT}`);
});