import React from "react";
import { Check, CheckCheck } from "lucide-react";

interface MessageStatusTicksProps {
  status?: "sent" | "delivered" | "read";
}

export const MessageStatusTicks: React.FC<MessageStatusTicksProps> = ({ status = "sent" }) => {
  if (status === "read") {
    return (
      <span title="Read" className="inline-flex items-center text-cyan-400">
        <CheckCheck className="w-3.5 h-3.5" />
      </span>
    );
  }

  if (status === "delivered") {
    return (
      <span title="Delivered" className="inline-flex items-center text-gray-300">
        <CheckCheck className="w-3.5 h-3.5" />
      </span>
    );
  }

  // default: sent
  return (
    <span title="Sent" className="inline-flex items-center text-gray-400">
      <Check className="w-3.5 h-3.5" />
    </span>
  );
};
