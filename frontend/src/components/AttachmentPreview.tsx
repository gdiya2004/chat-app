import React from "react";
import { FileText, Download, X, Paperclip, Loader2 } from "lucide-react";

interface AttachmentData {
  fileUrl?: string;
  fileType?: "image" | "file" | string;
  fileName?: string;
  fileSize?: number;
}

export const MessageAttachment: React.FC<AttachmentData> = ({
  fileUrl,
  fileType,
  fileName,
  fileSize,
}) => {
  if (!fileUrl) return null;

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (fileType === "image") {
    return (
      <div className="mt-2 rounded-xl overflow-hidden border border-white/10 group relative max-w-xs">
        <img
          src={fileUrl}
          alt={fileName || "Attachment"}
          className="w-full max-h-60 object-cover rounded-xl transition duration-200 group-hover:scale-105"
          loading="lazy"
          onClick={() => window.open(fileUrl, "_blank")}
        />
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          download={fileName || "image"}
          className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition backdrop-blur-sm"
          title="Download Image"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/20 border border-white/10 max-w-xs">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300">
          <FileText className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-white truncate">{fileName || "Document"}</p>
          {fileSize && (
            <p className="text-[10px] text-gray-400">{formatBytes(fileSize)}</p>
          )}
        </div>
      </div>
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        download={fileName || "file"}
        className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition"
        title="Download"
      >
        <Download className="w-4 h-4" />
      </a>
    </div>
  );
};

interface PendingAttachmentProps {
  attachment: AttachmentData | null;
  isUploading: boolean;
  onRemove: () => void;
}

export const PendingAttachmentBar: React.FC<PendingAttachmentProps> = ({
  attachment,
  isUploading,
  onRemove,
}) => {
  if (!attachment && !isUploading) return null;

  return (
    <div className="px-4 py-2 bg-gray-900/90 border-t border-gray-800 flex items-center justify-between text-xs text-gray-300">
      <div className="flex items-center gap-2">
        {isUploading ? (
          <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
        ) : (
          <Paperclip className="w-4 h-4 text-purple-400" />
        )}
        <span>
          {isUploading
            ? "Uploading attachment..."
            : `Attached: ${attachment?.fileName || "File"}`}
        </span>
      </div>
      {!isUploading && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1 hover:bg-gray-800 rounded-md text-gray-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
