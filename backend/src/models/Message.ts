import mongoose from "mongoose";

export interface IMessage {
  messageId: string;
  text?: string;
  sender: string;
  roomId: string;
  status: "sent" | "delivered" | "read";
  readBy?: string[];
  fileUrl?: string;
  fileType?: "image" | "file" | "";
  fileName?: string;
  fileSize?: number;
  createdAt: Date;
}

const messageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    index: true,
  },
  text: {
    type: String,
    default: "",
  },
  sender: {
    type: String,
    required: true,
  },
  roomId: {
    type: String,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ["sent", "delivered", "read"],
    default: "sent",
  },
  readBy: {
    type: [String],
    default: [],
  },
  fileUrl: {
    type: String,
    default: "",
  },
  fileType: {
    type: String,
    default: "",
  },
  fileName: {
    type: String,
    default: "",
  },
  fileSize: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Message = mongoose.model("Message", messageSchema);