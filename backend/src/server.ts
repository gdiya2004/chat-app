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
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username required" });
  }

  const token = login(username);

  res.json({ token });
});

app.listen(3000, () => {
  console.log("Auth server running on 3000");
});