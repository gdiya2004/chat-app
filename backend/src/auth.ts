import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error("JWT_SECRET missing ❌");
}

export const login = (username: string) => {
  return jwt.sign({ username }, SECRET, {
    expiresIn: "1d",
  });
};

export const verifyToken = (token: string): { username: string } | null => {
  try {
    return jwt.verify(token, SECRET) as { username: string };
  } catch {
    return null;
  }
};