import React, { useEffect, useRef, useState, useCallback } from "react";
import { Send, Paperclip, Loader2, Sparkles } from "lucide-react";
import { MessageStatusTicks } from "./components/MessageStatusTicks";
import { MessageAttachment, PendingAttachmentBar } from "./components/AttachmentPreview";
import { VideoCallModal } from "./components/VideoCallModal";
import type { CallState } from "./components/VideoCallModal";
import { PresenceHeader } from "./components/PresenceHeader";

interface MessageItem {
  messageId: string;
  text?: string;
  sender: string;
  roomId?: string;
  status: "sent" | "delivered" | "read";
  fileUrl?: string;
  fileType?: "image" | "file" | "";
  fileName?: string;
  fileSize?: number;
  createdAt?: string;
}

const STUN_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function App() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState<string>(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("roomId") || "global-lounge";
  });
  const [joined, setJoined] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Presence & Typing State
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // File Upload State
  const [pendingAttachment, setPendingAttachment] = useState<{
    fileUrl: string;
    fileType: "image" | "file";
    fileName: string;
    fileSize: number;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // WebRTC Call State
  const [callState, setCallState] = useState<CallState>({
    isActive: false,
    isIncoming: false,
    caller: "",
    targetUser: "",
    status: "idle",
  });
  const callStateRef = useRef<CallState>(callState);
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);



  const flushIceCandidates = async (pc: RTCPeerConnection) => {
    while (iceCandidatesQueueRef.current.length > 0) {
      const candidate = iceCandidatesQueueRef.current.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn("Error adding queued ICE candidate:", e);
        }
      }
    }
  };


  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const params = new URLSearchParams(window.location.search);
  const customPort = params.get("port");

  const authBaseUrl = import.meta.env.VITE_AUTH_URL || "http://localhost:3000";
  const defaultWsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";
  const wsUrl = customPort
    ? `ws://${window.location.hostname}:${customPort}`
    : defaultWsUrl;

  const handleSwitchRoom = (newRoom: string) => {
    if (!newRoom.trim() || newRoom.trim() === roomId) return;
    setRoomId(newRoom.trim());
    const url = new URL(window.location.href);
    url.searchParams.set("roomId", newRoom.trim());
    window.history.pushState({}, "", url.toString());
  };


  // ==========================================
  // 1. AUTHENTICATION & LOGIN
  // ==========================================
  const handleLogin = async () => {
    if (!username.trim()) return;

    setIsLoggingIn(true);
    setLoginError("");

    try {
      const res = await fetch(`${authBaseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (!res.ok) {
        throw new Error(`Login failed with status ${res.status}`);
      }

      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        setJoined(true);
      } else {
        setLoginError("No token received from authentication server.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setLoginError("Could not connect to Auth server. Ensure backend is running.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ==========================================
  // 2. WEBRTC MEDIA & PEER CONNECTION
  // ==========================================
  const initLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.warn("⚠️ Camera/Mic in use or unavailable on same-device testing, creating simulated animated stream:", err);

      // Create animated canvas stream with user avatar and dynamic movement
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");

      let angle = 0;
      const drawFrame = () => {
        if (!ctx) return;
        // Background gradient
        const grad = ctx.createLinearGradient(0, 0, 640, 480);
        grad.addColorStop(0, "#0f172a");
        grad.addColorStop(1, "#1e1b4b");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 480);

        // Animated pulsing circle
        angle += 0.05;
        const radius = 60 + Math.sin(angle) * 8;
        ctx.beginPath();
        ctx.arc(320, 200, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#7c3aed";
        ctx.fill();

        // User initials
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 36px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(username.slice(0, 2).toUpperCase() || "YOU", 320, 200);

        // Subtitle
        ctx.font = "18px sans-serif";
        ctx.fillStyle = "#a78bfa";
        ctx.fillText(`${username} (Simulated Camera Feed)`, 320, 320);

        requestAnimationFrame(drawFrame);
      };
      drawFrame();

      const stream = canvas.captureStream(30);

      // Create nearly-silent dummy audio oscillator so audio track exists for WebRTC negotiation
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const dest = audioCtx.createMediaStreamDestination();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
      } catch (e) {
        console.warn("AudioContext fallback error:", e);
      }

      setLocalStream(stream);
      return stream;
    }
  };

  const createPeerConnection = (targetUser: string) => {
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch {}
    }

    const pc = new RTCPeerConnection(STUN_SERVERS);
    peerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        const token = localStorage.getItem("token");
        wsRef.current.send(
          JSON.stringify({
            type: "webrtc_ice_candidate",
            payload: {
              targetUser,
              candidate: event.candidate,
              roomId,
              token,
            },
          })
        );
      }
    };

    pc.ontrack = (event) => {
      console.log("🎥 Received remote media track:", event.track.kind);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        const newStream = new MediaStream([event.track]);
        setRemoteStream(newStream);
      }
    };

    return pc;
  };

  const startVideoCall = async (targetUser: string) => {
    if (targetUser === username) return;

    setCallState({
      isActive: true,
      isIncoming: false,
      caller: username,
      targetUser,
      status: "calling",
    });

    await initLocalMedia();
    const token = localStorage.getItem("token");

    // Send call request to target user
    wsRef.current?.send(
      JSON.stringify({
        type: "webrtc_call_request",
        payload: { targetUser, roomId, token },
      })
    );
  };

  const acceptIncomingCall = async () => {
    const caller = callState.caller;
    setCallState((prev) => ({ ...prev, status: "connected" }));

    const stream = await initLocalMedia();
    const token = localStorage.getItem("token");

    const pc = createPeerConnection(caller);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    wsRef.current?.send(
      JSON.stringify({
        type: "webrtc_call_accepted",
        payload: { targetUser: caller, roomId, token },
      })
    );
  };

  const declineIncomingCall = () => {
    const caller = callState.caller;
    const token = localStorage.getItem("token");

    wsRef.current?.send(
      JSON.stringify({
        type: "webrtc_call_declined",
        payload: { targetUser: caller, roomId, token },
      })
    );

    endCall();
  };

  const endCall = () => {
    const token = localStorage.getItem("token");
    const target = callState.isIncoming ? callState.caller : callState.targetUser;

    if (target && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "webrtc_call_ended",
          payload: { targetUser: target, roomId, token },
        })
      );
    }

    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch {}
      peerConnectionRef.current = null;
    }

    iceCandidatesQueueRef.current = [];

    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);

    setCallState({
      isActive: false,
      isIncoming: false,
      caller: "",
      targetUser: "",
      status: "idle",
    });
  };


  // ==========================================
  // 3. SEND MESSAGE & FILE ATTACHMENTS
  // ==========================================
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${authBaseUrl}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setPendingAttachment({
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileName: data.fileName,
        fileSize: data.fileSize,
      });
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sendMessage = () => {
    if ((!input.trim() && !pendingAttachment) || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const token = localStorage.getItem("token");

    wsRef.current.send(
      JSON.stringify({
        type: "chat",
        payload: {
          roomId,
          message: input.trim(),
          token,
          fileUrl: pendingAttachment?.fileUrl || "",
          fileType: pendingAttachment?.fileType || "",
          fileName: pendingAttachment?.fileName || "",
          fileSize: pendingAttachment?.fileSize || 0,
        },
      })
    );

    // Stop typing indicator on send
    if (isTypingRef.current) {
      wsRef.current.send(
        JSON.stringify({
          type: "typing_stop",
          payload: { roomId, token },
        })
      );
      isTypingRef.current = false;
    }

    setInput("");
    setPendingAttachment(null);
  };

  // ==========================================
  // 4. TYPING DEBOUNCE HANDLER
  // ==========================================
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const token = localStorage.getItem("token");

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      wsRef.current.send(
        JSON.stringify({
          type: "typing_start",
          payload: { roomId, token },
        })
      );
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "typing_stop",
            payload: { roomId, token },
          })
        );
        isTypingRef.current = false;
      }
    }, 1500);
  };

  // ==========================================
  // 5. READ RECEIPTS ACKNOWLEDGMENT
  // ==========================================
  const sendReadReceipt = useCallback((messageId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const token = localStorage.getItem("token");
    wsRef.current.send(
      JSON.stringify({
        type: "ack_read",
        payload: { messageId, roomId, token },
      })
    );
  }, [roomId]);

  const sendDeliveredReceipt = useCallback((messageId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const token = localStorage.getItem("token");
    wsRef.current.send(
      JSON.stringify({
        type: "ack_delivered",
        payload: { messageId, roomId, token },
      })
    );
  }, [roomId]);

  // Window Focus listener for read receipts
  useEffect(() => {
    const handleFocus = () => {
      messages.forEach((msg) => {
        if (msg.sender !== username && msg.status !== "read") {
          sendReadReceipt(msg.messageId);
        }
      });
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [messages, username, sendReadReceipt]);

  // Auto Scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  // ==========================================
  // 6. MAIN WEBSOCKET CONNECTION LIFECYCLE
  // ==========================================
  useEffect(() => {
    if (!joined) return;

    setMessages([]);
    setLoading(true);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ Connected to WebSocket Server:", wsUrl);
      const token = localStorage.getItem("token");
      ws.send(
        JSON.stringify({
          type: "join",
          payload: { roomId, token },
        })
      );
    };

    ws.onmessage = async (e) => {
      try {
        const data = JSON.parse(e.data);
        const { type, payload } = data;

        // History
        if (type === "history") {
          const list: MessageItem[] = Array.isArray(payload) ? payload : [];
          setMessages(list);
          setLoading(false);

          // Send delivered/read receipts for history from others
          list.forEach((msg) => {
            if (msg.sender !== username) {
              sendDeliveredReceipt(msg.messageId);
              if (document.hasFocus()) sendReadReceipt(msg.messageId);
            }
          });
        }

        // Real-time Chat
        if (type === "chat") {
          setMessages((prev) => [...prev, payload]);

          if (payload.sender !== username) {
            sendDeliveredReceipt(payload.messageId);
            if (document.hasFocus()) {
              sendReadReceipt(payload.messageId);
            }
          }
        }

        // Presence Update
        if (type === "presence_update") {
          setOnlineUsers(payload.users || []);
        }

        // Typing Indicator
        if (type === "user_typing") {
          const { username: typingUser, isTyping } = payload;
          if (typingUser === username) return;

          setTypingUsers((prev) => {
            if (isTyping) {
              return prev.includes(typingUser) ? prev : [...prev, typingUser];
            } else {
              return prev.filter((u) => u !== typingUser);
            }
          });
        }

        // Message Status Update (Sent -> Delivered -> Read)
        if (type === "message_status_update") {
          const { messageId, status } = payload;
          setMessages((prev) =>
            prev.map((msg) => (msg.messageId === messageId ? { ...msg, status } : msg))
          );
        }

        // WebRTC: Incoming Call Request
        if (type === "webrtc_call_request") {
          // If already in a call, busy with another call, or ringing, reject gracefully
          if (callStateRef.current.status !== "idle") {
            const token = localStorage.getItem("token");
            ws.send(
              JSON.stringify({
                type: "webrtc_call_busy",
                payload: { targetUser: payload.caller, roomId, token },
              })
            );
            return;
          }

          setCallState({
            isActive: true,
            isIncoming: true,
            caller: payload.caller,
            targetUser: username,
            status: "ringing",
          });
        }

        // WebRTC: Call Accepted (Caller receives acceptance, creates offer)
        if (type === "webrtc_call_accepted") {
          setCallState((prev) => ({ ...prev, status: "connected" }));
          try {
            const stream = await initLocalMedia();
            const pc = createPeerConnection(payload.caller);
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const token = localStorage.getItem("token");
            ws.send(
              JSON.stringify({
                type: "webrtc_offer",
                payload: { targetUser: payload.caller, offer, roomId, token },
              })
            );
          } catch (err) {
            console.error("Error creating WebRTC offer on call acceptance:", err);
          }
        }

        // WebRTC: Call Busy
        if (type === "webrtc_call_busy") {
          alert(`${payload.caller || "User"} is currently on another call.`);
          endCall();
        }

        // WebRTC: Call Declined
        if (type === "webrtc_call_declined") {
          alert(`${payload.caller || "User"} declined the call.`);
          endCall();
        }

        // WebRTC: Call Ended
        if (type === "webrtc_call_ended") {
          endCall();
        }


        // WebRTC: Handle Remote Offer (Callee receives offer from caller)
        if (type === "webrtc_offer") {
          try {
            const pc = peerConnectionRef.current || createPeerConnection(payload.caller);
            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
            await flushIceCandidates(pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            const token = localStorage.getItem("token");
            ws.send(
              JSON.stringify({
                type: "webrtc_answer",
                payload: { targetUser: payload.caller, answer, roomId, token },
              })
            );
          } catch (err) {
            console.error("Error processing WebRTC offer:", err);
          }
        }

        // WebRTC: Handle Remote Answer (Caller receives answer from callee)
        if (type === "webrtc_answer") {
          try {
            if (peerConnectionRef.current) {
              await peerConnectionRef.current.setRemoteDescription(
                new RTCSessionDescription(payload.answer)
              );
              await flushIceCandidates(peerConnectionRef.current);
            }
          } catch (err) {
            console.error("Error processing WebRTC answer:", err);
          }
        }

        // WebRTC: Handle ICE Candidate
        if (type === "webrtc_ice_candidate") {
          if (payload.candidate) {
            const pc = peerConnectionRef.current;
            if (pc && pc.remoteDescription && pc.remoteDescription.type) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (iceErr) {
                console.warn("ICE candidate error:", iceErr);
              }
            } else {
              // Queue candidate until setRemoteDescription completes
              iceCandidatesQueueRef.current.push(payload.candidate);
            }
          }
        }

      } catch (err) {
        console.error("Error processing incoming WebSocket payload:", err);
      }
    };

    ws.onclose = () => {
      console.log("🔴 WebSocket Disconnected");
    };

    return () => {
      ws.close();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [joined, roomId, wsUrl, username, sendDeliveredReceipt, sendReadReceipt]);

  // ==========================================
  // 7. RENDER: LOGIN SCREEN
  // ==========================================
  if (!joined) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 px-4">
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl flex flex-col gap-6 w-full max-w-sm shadow-2xl shadow-purple-950/30">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center mx-auto mb-3 text-white shadow-lg shadow-purple-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">LetsConnectX</h1>
            <p className="text-xs text-gray-400 mt-1">Enterprise Real-Time Chat Platform</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="flex flex-col gap-4"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Your Username
              </label>
              <input
                placeholder="e.g. Alice or Bob"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 bg-gray-800/80 border border-gray-700 text-white placeholder-gray-500 rounded-xl outline-none focus:border-purple-500 transition text-sm"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Chat Room
              </label>
              <input
                placeholder="e.g. global-lounge, dev-room"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full p-3 bg-gray-800/80 border border-gray-700 text-white placeholder-gray-500 rounded-xl outline-none focus:border-purple-500 transition text-sm font-mono"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["global-lounge", "tech-talk", "gaming", "general"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoomId(r)}
                    className={`text-[11px] px-2 py-0.5 rounded-lg border transition ${
                      roomId === r
                        ? "bg-purple-600/30 border-purple-500 text-purple-300 font-medium"
                        : "bg-gray-800/60 border-gray-700/60 text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    #{r}
                  </button>
                ))}
              </div>
            </div>

            {loginError && (
              <div className="text-red-400 text-xs text-center bg-red-950/50 border border-red-800 p-2.5 rounded-xl">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn || !username.trim() || !roomId.trim()}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium p-3.5 rounded-xl transition duration-200 shadow-lg shadow-purple-600/30 text-sm flex items-center justify-center gap-2 mt-1"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                `Join #${roomId || "room"}`
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // 8. RENDER: LOADING SCREEN
  // ==========================================
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-950 text-white gap-3">
        <div className="w-9 h-9 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-gray-400 font-medium">Synchronizing chat history for #{roomId}...</p>
      </div>
    );
  }

  // ==========================================
  // 9. RENDER: MAIN CHAT INTERFACE
  // ==========================================
  return (
    <div className="h-screen bg-gray-950 flex flex-col font-sans">
      {/* Top Header with Presence & Call Trigger */}
      <PresenceHeader
        roomId={roomId}
        username={username}
        onlineUsers={onlineUsers}
        typingUsers={typingUsers}
        onStartCall={startVideoCall}
        onSwitchRoom={handleSwitchRoom}
        onLeave={() => {
          localStorage.removeItem("token");
          setJoined(false);
        }}
      />


      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm gap-2">
            <p className="font-medium">No messages yet in #{roomId}</p>
            <p className="text-xs text-gray-600">Send a greeting, attach a file, or start a video call!</p>
          </div>
        ) : (
          messages.map((m, index) => {
            const isMe = m.sender === username;
            return (
              <div
                key={m.messageId || index}
                className={`flex ${isMe ? "justify-end" : "justify-start"} animate-fadeIn`}
              >
                <div
                  className={`px-4 py-2.5 rounded-2xl max-w-sm sm:max-w-md break-words shadow-lg transition duration-150 ${
                    isMe
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-none"
                      : "bg-gray-900 text-gray-100 border border-gray-800 rounded-bl-none"
                  }`}
                >
                  {!isMe && (
                    <div className="text-[11px] font-semibold text-purple-400 mb-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      {m.sender}
                    </div>
                  )}

                  {/* Text Message */}
                  {m.text && <div className="text-sm leading-relaxed">{m.text}</div>}

                  {/* Attachment Preview if present */}
                  {m.fileUrl && (
                    <MessageAttachment
                      fileUrl={m.fileUrl}
                      fileType={m.fileType}
                      fileName={m.fileName}
                      fileSize={m.fileSize}
                    />
                  )}

                  {/* Timestamp & Status Ticks */}
                  <div
                    className={`flex items-center gap-1.5 justify-end mt-1 text-[10px] ${
                      isMe ? "text-purple-200/80" : "text-gray-400"
                    }`}
                  >
                    <span>
                      {m.createdAt
                        ? new Date(m.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Just now"}
                    </span>
                    {isMe && <MessageStatusTicks status={m.status} />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Pending Attachment Preview Bar */}
      <PendingAttachmentBar
        attachment={pendingAttachment}
        isUploading={isUploading}
        onRemove={() => setPendingAttachment(null)}
      />

      {/* Input Action Bar */}
      <div className="bg-gray-900/90 border-t border-gray-800 p-3 sm:p-4 backdrop-blur-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-3"
        >
          {/* File Attachment Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-3 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition border border-gray-700 disabled:opacity-50"
            title="Attach Image or Document"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Text Input */}
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Type a message or share an attachment..."
            className="flex-1 bg-gray-800/90 border border-gray-700 text-white placeholder-gray-500 px-4 py-3 rounded-xl outline-none focus:border-purple-500 transition text-sm"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!input.trim() && !pendingAttachment) || isUploading}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white px-5 py-3 rounded-xl font-medium transition duration-200 text-sm shadow-lg shadow-purple-600/30 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>

      {/* WebRTC Video Call Modal */}
      <VideoCallModal
        callState={callState}
        localStream={localStream}
        remoteStream={remoteStream}
        onAcceptCall={acceptIncomingCall}
        onDeclineCall={declineIncomingCall}
        onEndCall={endCall}
      />
    </div>
  );
}

export default App;