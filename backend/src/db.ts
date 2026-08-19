import mongoose from "mongoose";

export const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn("⚠️ MONGO_URI not configured. Database persistence disabled.");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ DB connection error:", (err as Error).message);
    console.log("ℹ️ Running chat server in-memory fallback mode.");
  }
};

export const isDBConnected = () => {
  return mongoose.connection.readyState === 1;
};
