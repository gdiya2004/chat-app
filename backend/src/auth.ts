import dotenv from "dotenv";
dotenv.config();

import jwt from "jsonwebtoken";

const getSecret = () => {
  return process.env.JWT_SECRET || "default_secret_chat_app_123";
};

export const login = (username: string) => {
  return jwt.sign({ username }, getSecret(), {
    expiresIn: "1d",
  });
};

export const verifyToken = (token: string): { username: string } | null => {
  try {
    return jwt.verify(token, getSecret()) as { username: string };
  } catch {
    return null;
  }
};