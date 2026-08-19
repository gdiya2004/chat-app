import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const [mssges, setMssges] = useState<{ text: string; sender: string }[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // ✅ LOGIN FUNCTION
  const handleLogin = async () => {
    if (!username.trim()) return;

    setIsLoggingIn(true);
    setLoginError("");

    try {
      const authBaseUrl = import.meta.env.VITE_AUTH_URL || "http://localhost:8080";
      const res = await fetch(`${authBaseUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (!res.ok) {
        throw new Error(`Login failed with status ${res.status}`);
      }

      const data = await res.json();
      console.log("LOGIN RESPONSE:", data);

      if (data.token) {
        localStorage.setItem("token", data.token);
        setJoined(true);
      } else {
        setLoginError("No token received from auth server");
      }
    } catch (err) {
      console.error("Login error:", err);
      setLoginError("Could not connect to Auth server. Ensure backend is running.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ✅ SEND MESSAGE
  const sendMessage = () => {
    if (
      !input.trim() ||
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN
    ) {
      console.log("WebSocket not ready");
      return;
    }

    const token = localStorage.getItem("token");

    wsRef.current.send(
      JSON.stringify({
        type: "chat",
        payload: {
          message: input.trim(),
          token,
        },
      })
    );

    setInput("");
  };

  // ✅ AUTO SCROLL
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mssges]);

  // ✅ WEBSOCKET CONNECTION
  useEffect(() => {
    if (!joined) return;

    setMssges([]);
    setLoading(true);

    const params = new URLSearchParams(window.location.search);
    const roomId = params.get("roomId") || "test";
    const customPort = params.get("port");

    const defaultWsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";
    const wsUrl = customPort
      ? `ws://${window.location.hostname}:${customPort}`
      : defaultWsUrl;

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.type === "history") {
          setMssges(Array.isArray(data.payload) ? data.payload : []);
          setLoading(false);
        } else {
          setMssges((prev) => [...prev, data]);
        }
      } catch (err) {
        console.error("Error parsing incoming message:", err);
      }
    };

    ws.onopen = () => {
      console.log("✅ WebSocket connected to", wsUrl);

      const token = localStorage.getItem("token");

      ws.send(
        JSON.stringify({
          type: "join",
          payload: {
            roomId,
            token,
          },
        })
      );
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setLoading(false);
    };

    ws.onclose = () => {
      console.log("Disconnected from server");
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [joined]);

  // ✅ JOIN SCREEN
  if (!joined) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 px-4">
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl flex flex-col gap-5 w-full max-w-sm shadow-2xl">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Real-Time Chat
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Enter your username to join
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="flex flex-col gap-4"
          >
            <input
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="p-3 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl outline-none focus:border-purple-500 transition"
              autoFocus
            />

            {loginError && (
              <div className="text-red-400 text-xs text-center bg-red-950/50 border border-red-800 p-2 rounded-lg">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn || !username.trim()}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium p-3 rounded-xl transition duration-200 shadow-lg shadow-purple-600/30"
            >
              {isLoggingIn ? "Connecting..." : "Join Chat"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ✅ LOADING SCREEN
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-950 text-white gap-3">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-400">Loading chat room...</p>
      </div>
    );
  }

  // ✅ MAIN CHAT UI
  return (
    <div className="h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
          <div>
            <h2 className="text-white font-semibold text-sm">Active Room</h2>
            <p className="text-xs text-gray-400">
              Logged in as <span className="text-purple-400 font-medium">{username}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem("token");
            setJoined(false);
          }}
          className="text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition"
        >
          Leave
        </button>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {mssges.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            No messages yet. Send a message to start chatting!
          </div>
        ) : (
          mssges.map((m, index) => {
            const isMe = m.sender === username;
            return (
              <div
                key={index}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`px-4 py-2.5 rounded-2xl max-w-sm sm:max-w-md break-words shadow-md ${
                    isMe
                      ? "bg-purple-600 text-white rounded-br-none"
                      : "bg-gray-800 text-gray-100 border border-gray-700 rounded-bl-none"
                  }`}
                >
                  {!isMe && (
                    <div className="text-xs font-semibold text-purple-400 mb-0.5">
                      {m.sender}
                    </div>
                  )}
                  <div className="text-sm">{m.text}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input box */}
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="max-w-4xl mx-auto flex items-center gap-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 px-4 py-3 rounded-xl outline-none focus:border-purple-500 transition text-sm"
          />

          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white px-6 py-3 rounded-xl font-medium transition duration-200 text-sm shadow-lg shadow-purple-600/30"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;