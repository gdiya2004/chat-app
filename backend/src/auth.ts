import jwt from "jsonwebtoken";

const SECRET = "your-secret-key"; // move to .env later

export const login = (username: string) => {
  const token = jwt.sign({ username }, SECRET, {
    expiresIn: "1d",
  });

  return token;
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, SECRET) as { username: string };
  } catch {
    return null;
  }
};