import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  text: String,
  sender: String,
  roomId: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Message = mongoose.model("Message", messageSchema);