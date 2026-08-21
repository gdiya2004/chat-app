import React, { useState } from "react";
import { Users, Video, LogOut, ChevronDown, ChevronUp, Compass, ArrowRight } from "lucide-react";

interface PresenceHeaderProps {
  roomId: string;
  username: string;
  onlineUsers: string[];
  typingUsers: string[];
  onStartCall: (targetUser: string) => void;
  onSwitchRoom: (newRoom: string) => void;
  onLeave: () => void;
}

const POPULAR_ROOMS = ["global-lounge", "tech-talk", "gaming", "general", "ai-chat"];

export const PresenceHeader: React.FC<PresenceHeaderProps> = ({
  roomId,
  username,
  onlineUsers,
  typingUsers,
  onStartCall,
  onSwitchRoom,
  onLeave,
}) => {
  const [showUsersDropdown, setShowUsersDropdown] = useState(false);
  const [showSwitchRoomModal, setShowSwitchRoomModal] = useState(false);
  const [customRoomInput, setCustomRoomInput] = useState("");

  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customRoomInput.trim() && customRoomInput.trim() !== roomId) {
      onSwitchRoom(customRoomInput.trim());
      setShowSwitchRoomModal(false);
      setCustomRoomInput("");
    }
  };

  return (
    <header className="bg-gray-900/90 backdrop-blur-md border-b border-gray-800 sticky top-0 z-30 transition-all">
      <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between">
        {/* Room Info & Live Status */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setShowSwitchRoomModal(true)}
            className="relative group"
            title="Click to Switch Room"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20 group-hover:scale-105 transition">
              #
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-gray-900 rounded-full"></span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSwitchRoomModal(true)}
                className="text-white font-semibold text-sm sm:text-base tracking-tight hover:text-purple-300 flex items-center gap-1.5 transition"
                title="Change Room"
              >
                <span>#{roomId}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono hidden sm:inline">
                  switch
                </span>
              </button>

              <button
                onClick={() => setShowUsersDropdown(!showUsersDropdown)}
                className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium hover:bg-emerald-500/20 transition"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{onlineUsers.length} online</span>
                {showUsersDropdown ? (
                  <ChevronUp className="w-3 h-3 ml-0.5" />
                ) : (
                  <ChevronDown className="w-3 h-3 ml-0.5" />
                )}
              </button>
            </div>

            <div className="h-4 flex items-center">
              {typingUsers.length > 0 ? (
                <div className="flex items-center gap-1.5 text-xs text-purple-400 animate-pulse">
                  <span className="font-medium">{typingUsers.join(", ")}</span>
                  <span>is typing</span>
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce"></span>
                  </span>
                </div>
              ) : (
                <p className="text-xs text-gray-400 truncate">
                  Logged in as <span className="text-purple-400 font-medium">{username}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowSwitchRoomModal(true)}
            className="p-2 sm:px-3 sm:py-1.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-300 border border-purple-500/20 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
            title="Switch Room"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rooms</span>
          </button>

          <button
            onClick={() => setShowUsersDropdown(!showUsersDropdown)}
            className="p-2 sm:px-3 sm:py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-medium flex items-center gap-1.5 border border-gray-700 transition"
            title="View Online Users"
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Members</span>
          </button>

          <button
            onClick={onLeave}
            className="p-2 sm:px-3 sm:py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
            title="Leave Chat Room"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </div>

      {/* Online Users Drawer */}
      {showUsersDropdown && (
        <div className="border-t border-gray-800 bg-gray-950/95 px-6 py-3 transition-all animate-fadeIn">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Active in #{roomId} ({onlineUsers.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {onlineUsers.map((user) => {
              const isSelf = user === username;
              return (
                <div
                  key={user}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
                    isSelf
                      ? "bg-purple-950/40 border-purple-800/50 text-purple-200"
                      : "bg-gray-900 border-gray-800 text-gray-200"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="font-medium">
                    {user} {isSelf && "(You)"}
                  </span>
                  {!isSelf && (
                    <button
                      onClick={() => onStartCall(user)}
                      className="ml-1 p-1 hover:bg-purple-600/30 text-purple-400 hover:text-purple-300 rounded-md transition"
                      title={`Start 1-on-1 Video Call with ${user}`}
                    >
                      <Video className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Switch Room Modal */}
      {showSwitchRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl max-w-sm w-full shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Switch Chat Room</h3>
                <p className="text-xs text-gray-400">Join an existing room or create your own</p>
              </div>
              <button
                onClick={() => setShowSwitchRoomModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            {/* Popular Rooms */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Popular Lounges
              </label>
              <div className="flex flex-wrap gap-2">
                {POPULAR_ROOMS.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      onSwitchRoom(r);
                      setShowSwitchRoomModal(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition border ${
                      r === roomId
                        ? "bg-purple-600 text-white border-purple-500"
                        : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    #{r}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Room Input */}
            <form onSubmit={handleRoomSubmit} className="flex flex-col gap-3">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Or Enter Custom Room ID
              </label>
              <div className="flex gap-2">
                <input
                  placeholder="e.g. project-x, secret-hangout"
                  value={customRoomInput}
                  onChange={(e) => setCustomRoomInput(e.target.value)}
                  className="flex-1 p-2.5 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl outline-none focus:border-purple-500 text-xs transition"
                />
                <button
                  type="submit"
                  disabled={!customRoomInput.trim()}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white p-2.5 rounded-xl text-xs font-medium transition flex items-center justify-center"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
