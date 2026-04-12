import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const [mssges, setMssges] = useState<
    { text: string; sender: string }[]
  >([]);
  const wsRef = useRef<WebSocket | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // ✅ LOGIN FUNCTION
  const handleLogin = async () => {
    if (!username) return;

    const res = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    });

    const data = await res.json();

    localStorage.setItem("token", data.token);

    setJoined(true);
  };

  // ✅ SEND MESSAGE
const sendMessage = () => {
  if (
    !input ||
    !wsRef.current ||
    wsRef.current.readyState !== WebSocket.OPEN // 🔥 IMPORTANT
  ) {
    console.log("WebSocket not ready");
    return;
  }

  const token = localStorage.getItem("token");

  wsRef.current.send(
    JSON.stringify({
      type: "chat",
      payload: {
        message: input,
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

    const ws = new WebSocket(import.meta.env.VITE_WS_URL);

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === "history") {
        setMssges([...data.payload]);
        setLoading(false);
      } else {
        setMssges((prev) => [...prev, data]);
      }
    };

   ws.onopen = () => {
  console.log("✅ WebSocket connected");

  const token = localStorage.getItem("token");
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("roomId") || "test";

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
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="bg-white p-6 rounded-xl flex flex-col gap-4">
          <input
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="p-3 border rounded-lg"
          />
          <button
            onClick={handleLogin}
            className="bg-purple-600 text-white p-3 rounded-lg"
          >
            Join Chat
          </button>
        </div>
      </div>
    );
  }

  // ✅ LOADING SCREEN
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        Loading chats...
      </div>
    );
  }

  // ✅ MAIN CHAT UI
  return (
    <div className="h-screen bg-black flex flex-col">
      {/* Username display */}
      <div className="text-white p-3 border-b border-gray-700">
        Logged in as: {username}
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {mssges.map((m, index) => (
          <div
            key={index}
            className={`flex ${
              m.sender === username ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`px-4 py-2 rounded-xl max-w-xs break-words ${
                m.sender === username
                  ? "bg-purple-600 text-white"
                  : "bg-white text-black"
              }`}
            >
              <div className="text-xs opacity-70">{m.sender}</div>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input box */}
      <div className="w-full bg-white flex items-center p-3 gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          placeholder="Type a message..."
          className="flex-1 p-3 border rounded-lg outline-none"
        />

        <button
          onClick={sendMessage}
          className="bg-purple-600 text-white px-5 py-3 rounded-lg hover:bg-purple-700 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default App;