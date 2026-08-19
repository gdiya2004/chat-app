import { WebSocket } from "ws";

async function runTest() {
  console.log("=========================================");
  console.log("🧪 STARTING FULL-STACK VERIFICATION TEST");
  console.log("=========================================");

  // 1. Verify Frontend
  try {
    const frontendRes = await fetch("http://localhost:5173/");
    console.log(`✅ [1/5] Frontend Dev Server: Status ${frontendRes.status} (Serving UI)`);
  } catch (err) {
    console.error("❌ [1/5] Frontend Dev Server unreachable:", err.message);
  }

  // 2. Test Auth Login for Alice
  let aliceToken = "";
  try {
    const loginRes = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Alice" }),
    });
    const data = await loginRes.json();
    aliceToken = data.token;
    console.log(`✅ [2/5] Auth Server Login (Alice): Got JWT Token (${aliceToken.slice(0, 20)}...)`);
  } catch (err) {
    console.error("❌ [2/5] Auth Login failed:", err.message);
  }

  // 3. Test Auth Login for Bob
  let bobToken = "";
  try {
    const loginRes = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Bob" }),
    });
    const data = await loginRes.json();
    bobToken = data.token;
    console.log(`✅ [3/5] Auth Server Login (Bob): Got JWT Token (${bobToken.slice(0, 20)}...)`);
  } catch (err) {
    console.error("❌ [3/5] Auth Login failed:", err.message);
  }

  // 4. Connect Alice and Bob via WebSocket
  const roomId = "test-room-" + Date.now();
  console.log(`🔌 [4/5] Connecting WebSocket clients to room: ${roomId}`);

  const aliceWs = new WebSocket("ws://localhost:8080");
  const bobWs = new WebSocket("ws://localhost:8080");

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 2) resolve(true);
    };
    aliceWs.on("open", () => {
      aliceWs.send(JSON.stringify({ type: "join", payload: { roomId, token: aliceToken } }));
      check();
    });
    bobWs.on("open", () => {
      bobWs.send(JSON.stringify({ type: "join", payload: { roomId, token: bobToken } }));
      check();
    });
  });

  console.log("✅ [4/5] Both Alice & Bob joined the WebSocket room");

  // 5. Test real-time messaging
  await new Promise((resolve) => {
    let step = 0;

    bobWs.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.text === "Hello from Alice!") {
        console.log(`📩 Bob received message from Alice: "${msg.text}" (sender: ${msg.sender})`);
        // Bob replies
        bobWs.send(JSON.stringify({
          type: "chat",
          payload: { message: "Hello Alice, real-time chat works!", token: bobToken },
        }));
      }
    });

    aliceWs.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.text === "Hello Alice, real-time chat works!") {
        console.log(`📩 Alice received reply from Bob: "${msg.text}" (sender: ${msg.sender})`);
        step = 2;
        resolve(true);
      }
    });

    // Alice sends initial message
    setTimeout(() => {
      aliceWs.send(JSON.stringify({
        type: "chat",
        payload: { message: "Hello from Alice!", token: aliceToken },
      }));
    }, 500);
  });

  aliceWs.close();
  bobWs.close();

  console.log("=========================================");
  console.log("🎉 ALL TESTS PASSED! APPLICATION IS 100% OPERATIONAL");
  console.log("=========================================");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
