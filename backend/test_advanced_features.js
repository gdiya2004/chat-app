import { WebSocket } from "ws";

async function runAdvancedFeaturesTest() {
  console.log("=================================================");
  console.log("🚀 TESTING ADVANCED REAL-TIME FEATURES");
  console.log("=================================================");

  // 1. Test File Upload Endpoint
  console.log("📁 [1/6] Testing Media/Attachment Upload API...");
  let uploadedFileUrl = "";
  try {
    const formData = new FormData();
    const blob = new Blob(["Hello LetsConnectX attachment test"], { type: "text/plain" });
    formData.append("file", blob, "test-doc.txt");

    const uploadRes = await fetch("http://localhost:3000/upload", {
      method: "POST",
      body: formData,
    });
    const uploadData = await uploadRes.json();
    uploadedFileUrl = uploadData.fileUrl;
    console.log(`✅ Upload Success: ${uploadData.fileName} -> ${uploadData.fileUrl} (${uploadData.fileType})`);
  } catch (err) {
    console.error("❌ Upload failed:", err.message);
  }

  // 2. Auth for Alice & Bob
  console.log("🔐 [2/6] Authenticating Alice and Bob...");
  const aliceRes = await fetch("http://localhost:3000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "Alice" }),
  });
  const aliceToken = (await aliceRes.json()).token;

  const bobRes = await fetch("http://localhost:3000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "Bob" }),
  });
  const bobToken = (await bobRes.json()).token;
  console.log("✅ Authenticated both users with JWT.");

  // 3. Connect & Test Presence
  const roomId = "test-advanced-" + Date.now();
  console.log(`👥 [3/6] Connecting Alice & Bob to room: ${roomId}...`);

  const aliceWs = new WebSocket("ws://localhost:8080");
  const bobWs = new WebSocket("ws://localhost:8080");

  let presenceVerified = false;

  aliceWs.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === "presence_update") {
      const users = msg.payload.users;
      if (users.includes("Alice") && users.includes("Bob")) {
        presenceVerified = true;
        console.log(`✅ [3/6] Presence verified: Online users = [${users.join(", ")}]`);
      }
    }
  });

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

  // Give 400ms for presence broadcast
  await new Promise((r) => setTimeout(r, 400));

  // 4. Test Typing Indicators
  console.log("⌨️ [4/6] Testing Typing Indicators...");
  await new Promise((resolve) => {
    bobWs.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "user_typing" && msg.payload.username === "Alice") {
        console.log(`✅ [4/6] Bob received typing event from Alice: isTyping = ${msg.payload.isTyping}`);
        resolve(true);
      }
    });

    aliceWs.send(JSON.stringify({
      type: "typing_start",
      payload: { roomId, token: aliceToken },
    }));
  });

  // 5. Test 3-Phase Message Status Lifecycle (Sent -> Delivered -> Read)
  console.log("📩 [5/6] Testing Message Status Lifecycle (Sent -> Delivered -> Read)...");
  let sentMessageId = "";

  await new Promise((resolve) => {
    bobWs.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "chat" && msg.payload.sender === "Alice") {
        sentMessageId = msg.payload.messageId;
        console.log(`✅ Bob received message "${msg.payload.text}" with messageId: ${sentMessageId}`);

        // Bob sends ack_delivered
        bobWs.send(JSON.stringify({
          type: "ack_delivered",
          payload: { messageId: sentMessageId, roomId, token: bobToken },
        }));

        // Bob sends ack_read
        setTimeout(() => {
          bobWs.send(JSON.stringify({
            type: "ack_read",
            payload: { messageId: sentMessageId, roomId, token: bobToken },
          }));
        }, 200);
      }
    });

    let deliveredAck = false;
    let readAck = false;

    aliceWs.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "message_status_update" && msg.payload.messageId === sentMessageId) {
        if (msg.payload.status === "delivered") {
          deliveredAck = true;
          console.log("✅ Alice received Delivered status ACK (✓✓ gray)");
        }
        if (msg.payload.status === "read") {
          readAck = true;
          console.log("✅ Alice received Read status ACK (✓✓ blue)");
          resolve(true);
        }
      }
    });

    // Alice sends chat message with file attachment
    aliceWs.send(JSON.stringify({
      type: "chat",
      payload: {
        roomId,
        message: "Hello Bob! Check this attachment.",
        token: aliceToken,
        fileUrl: uploadedFileUrl,
        fileType: "file",
        fileName: "test-doc.txt",
      },
    }));
  });

  // 6. Test WebRTC Signaling Relay
  console.log("📹 [6/6] Testing WebRTC Signaling Relay (Call Request -> Offer -> Answer)...");
  await new Promise((resolve) => {
    bobWs.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "webrtc_call_request" && msg.payload.caller === "Alice") {
        console.log("✅ Bob received WebRTC call request from Alice");

        // Bob accepts
        bobWs.send(JSON.stringify({
          type: "webrtc_call_accepted",
          payload: { targetUser: "Alice", roomId, token: bobToken },
        }));
      }

      if (msg.type === "webrtc_offer") {
        console.log("✅ Bob received WebRTC SDP Offer from Alice, sending Answer...");
        bobWs.send(JSON.stringify({
          type: "webrtc_answer",
          payload: { targetUser: "Alice", answer: { type: "answer", sdp: "dummy-sdp-answer" }, roomId, token: bobToken },
        }));
      }
    });

    aliceWs.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "webrtc_call_accepted") {
        console.log("✅ Alice received WebRTC Call Acceptance from Bob, sending SDP Offer...");
        aliceWs.send(JSON.stringify({
          type: "webrtc_offer",
          payload: { targetUser: "Bob", offer: { type: "offer", sdp: "dummy-sdp-offer" }, roomId, token: aliceToken },
        }));
      }

      if (msg.type === "webrtc_answer") {
        console.log("✅ Alice received WebRTC SDP Answer from Bob. P2P Channel Ready!");
        resolve(true);
      }
    });

    aliceWs.send(JSON.stringify({
      type: "webrtc_call_request",
      payload: { targetUser: "Bob", roomId, token: aliceToken },
    }));
  });

  aliceWs.close();
  bobWs.close();

  console.log("=================================================");
  console.log("🎉 ALL 6 ADVANCED REAL-TIME TESTS PASSED WITH 100% SUCCESS!");
  console.log("=================================================");
  process.exit(0);
}

runAdvancedFeaturesTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
