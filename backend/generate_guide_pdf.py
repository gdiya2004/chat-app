import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "LetsConnectX — System Design & Advanced Interview Preparation Guide")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(54, 744, 558, 744)

        # Footer
        self.setFont("Helvetica", 8)
        self.drawString(54, 36, "Confidential — Prepared for Technical & System Design Interviews")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, page_str)
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, 46, 558, 46)
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#4f46e5") # Indigo
    dark_heading = colors.HexColor("#0f172a") # Slate 900
    sub_color = colors.HexColor("#475569") # Slate 600

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#1e1b4b"),
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        "DocSubTitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=15,
        textColor=primary_color,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        "SectionH1",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=18,
        textColor=colors.HexColor("#1e1b4b"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        "SectionH2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=primary_color,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        "BodyTextCustom",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        "BulletCustom",
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        "CodeBlock",
        parent=styles["Code"],
        fontName="Courier",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#0f172a"),
        backColor=colors.HexColor("#f8fafc"),
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=6
    )

    callout_style = ParagraphStyle(
        "CalloutText",
        parent=body_style,
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1e293b")
    )

    story = []

    # Title Banner
    story.append(Paragraph("🚀 LetsConnectX: Distributed Real-Time Architecture", title_style))
    story.append(Paragraph("Comprehensive Full-Stack & System Design Interview Preparation Guide", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=12))

    # SECTION 1: ARCHITECTURE OVERVIEW
    story.append(Paragraph("1. Executive Summary & Distributed Architecture", h1_style))
    story.append(Paragraph(
        "<b>LetsConnectX</b> is an enterprise-grade real-time collaborative communication platform engineered for high-concurrency, horizontal scalability, and low latency (<15ms). It combines stateful WebSocket servers, a Redis Pub/Sub message broker, MongoDB persistence, WebRTC peer-to-peer media streaming, and an interactive React + TypeScript client.",
        body_style
    ))

    arch_diagram = """
+-----------------------------------------------------------------------------------+
|                            CLIENT TIER (React + TypeScript)                       |
|   1. HTTP POST /login (JWT Auth)      2. Persistent WSS ws:// (Handshake & ACKs)  |
+------------------------------------------+----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                BACKEND NODE (Node.js + Express + 'ws' WebSocket Engine)           |
|   * Cryptographic JWT Signature Verification (Zero Sender Spoofing)               |
|   * O(1) In-Memory Room Dispatch: Map<roomId, Map<WebSocket, username>>          |
|   * 30s TCP Heartbeat Ping/Pong Reaper (Dead / Zombie Socket Cleanup)             |
|   * Multipart Media Upload Pipeline (/upload with 25MB buffer)                    |
+---------------------+--------------------+--------------------+-------------------+
                      |                    |                    |
                      v                    v                    v
          +-----------------------+ +--------------------+ +------------------------+
          |  REDIS PUB/SUB BUS    | | MONGODB CLUSTER    | | LOCAL CLIENT SOCKETS   |
          |  Channel: 'chat'      | | Coll: 'messages'   | | Direct Frame Dispatch  |
          |  Multi-Node Sync      | | Async Persistence  | | Instant Local Delivery |
          +-----------------------+ +--------------------+ +------------------------+
    """
    story.append(Paragraph(arch_diagram.strip().replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))

    # SECTION 2: CORE FOUNDATION MECHANICS
    story.append(Paragraph("2. Core Foundation Mechanics", h1_style))
    story.append(Paragraph("<b>A. Stateless JWT Authentication with Cryptographic Identity</b>", h2_style))
    story.append(Paragraph(
        "Authentication is decoupled from WebSocket handshakes via REST HTTP (<code>POST /login</code>). Sockets pass tokens during the <code>join</code> and <code>chat</code> payloads. The server extracts identity strictly via <code>jwt.verify()</code> rather than trusting client-provided usernames, eliminating identity spoofing.",
        body_style
    ))

    story.append(Paragraph("<b>B. In-Memory O(1) Hash Map Routing & Sliding-Window Cache</b>", h2_style))
    story.append(Paragraph(
        "Room memberships are maintained locally via <code>Map&lt;string, Map&lt;ExtendedWebSocket, string&gt;&gt;</code>. Sockets are retrieved in O(1) time without iterating global client lists. Recent messages are cached in a 100-message sliding window (<code>shift()</code> on overflow) preventing memory leaks while enabling zero-latency fallback if the database is offline.",
        body_style
    ))

    story.append(Paragraph("<b>C. Triple-Branch Fanout & Horizontal Scaling</b>", h2_style))
    story.append(Paragraph(
        "When a message is received, it executes three decoupled parallel branches: (1) <b>Redis Pub/Sub</b> distributes the payload across N backend instances, (2) <b>MongoDB Atlas</b> commits the record asynchronously in the background, and (3) <b>Local Sockets</b> dispatches the frame directly to all local participants in that room.",
        body_style
    ))

    story.append(Spacer(1, 6))

    # SECTION 3: ADVANCED REAL-TIME FEATURES (NEW UPGRADES)
    story.append(Paragraph("3. Advanced Real-Time Feature Implementations", h1_style))

    story.append(Paragraph("<b>A. Live Presence & TCP Zombie Connection Reaper</b>", h2_style))
    story.append(Paragraph(
        "• <b>Presence Tracking:</b> When clients connect, disconnect, or switch rooms, the backend computes unique active usernames and broadcasts a <code>presence_update</code> payload locally and via Redis.<br/>"
        "• <b>Heartbeat Reaper:</b> Silent TCP half-open disconnects (e.g., entering an elevator) are eliminated via a 30s interval sending <code>ping</code> frames. Sockets failing to return a <code>pong</code> are terminated via <code>socket.terminate()</code> and pruned immediately.",
        body_style
    ))

    story.append(Paragraph("<b>B. Debounced Real-Time Typing Indicators</b>", h2_style))
    story.append(Paragraph(
        "• <b>Network Throttling:</b> Instead of broadcasting every keystroke, the frontend emits <code>typing_start</code> on initial input and sets a 1500ms sliding inactivity timer before sending <code>typing_stop</code>.<br/>"
        "• <b>UI Rendering:</b> Displays animated bouncing dot indicators (<i>'Alice is typing...'</i>) synchronized across all room participants.",
        body_style
    ))

    story.append(Paragraph("<b>C. 3-Phase Message Lifecycle (Sent -> Delivered -> Read Receipts)</b>", h2_style))
    story.append(Paragraph(
        "• <b>Phase 1 — Sent (✓ Single Tick):</b> Server receives and commits message to database with a unique <code>messageId</code>.<br/>"
        "• <b>Phase 2 — Delivered (✓✓ Double Gray Tick):</b> Recipient's active socket receives the frame and emits <code>ack_delivered</code>.<br/>"
        "• <b>Phase 3 — Read (✓✓ Double Cyan Tick):</b> Recipient's window gains focus or message enters viewport, emitting <code>ack_read</code>. The sender's UI updates in real time.",
        body_style
    ))

    story.append(Paragraph("<b>D. 1-on-1 WebRTC Video & Audio Calling with Line-Busy Guard</b>", h2_style))
    story.append(Paragraph(
        "• <b>WebSocket Signaling Relay:</b> Exchanges <code>webrtc_call_request</code>, <code>webrtc_offer</code>, <code>webrtc_answer</code>, and <code>webrtc_ice_candidate</code> across servers.<br/>"
        "• <b>ICE Candidate Queuing:</b> Candidates arriving before <code>setRemoteDescription</code> completes are queued in memory and flushed in order, eliminating connection stalls.<br/>"
        "• <b>Line-Busy Call Guard:</b> When a user is in an active call, third-party incoming calls receive <code>webrtc_call_busy</code>, notifying the caller without interrupting the ongoing stream.<br/>"
        "• <b>Hardware Fallback:</b> Automatically synthesizes an animated avatar stream if a physical webcam is locked by another browser during same-device testing.",
        body_style
    ))

    story.append(Paragraph("<b>E. Media & Attachment Upload Pipeline</b>", h2_style))
    story.append(Paragraph(
        "• <b>Architecture:</b> Heavy binaries are uploaded via HTTP REST (<code>POST /upload</code>) using <code>multer</code> (25MB limit) rather than congesting WebSocket TCP pipes. The generated CDN URL and metadata are dispatched as lightweight JSON payloads.",
        body_style
    ))

    story.append(Paragraph("<b>F. Dynamic Room Selection & On-The-Fly Switching</b>", h2_style))
    story.append(Paragraph(
        "• Users can enter custom rooms or pick presets (<code>#global-lounge</code>, <code>#tech-talk</code>, <code>#gaming</code>). Switching rooms updates the URL (<code>?roomId=...</code>), cleans up old socket room sets, joins the new room, and fetches past history seamlessly.",
        body_style
    ))

    story.append(Spacer(1, 6))

    # SECTION 4: SYSTEM DESIGN & CODING INTERVIEW Q&A
    story.append(Paragraph("4. Top 10 System Design & Technical Interview Q&A", h1_style))

    qa_list = [
        (
            "Q1: Why use WebSockets over HTTP Long-Polling or Server-Sent Events (SSE)?",
            "WebSockets provide bidirectional, full-duplex TCP communication with minimal per-frame header overhead (2–10 bytes vs 1KB+ HTTP headers). SSE is strictly unidirectional (server-to-client), and long-polling suffers from HTTP handshake latency and high server resource exhaustion."
        ),
        (
            "Q2: How does Redis Pub/Sub enable horizontal scaling across multiple WebSocket nodes?",
            "WebSocket connections are stateful and pinned to a specific server instance. When Server A receives a message for Bob (who is connected to Server B), Server A publishes to Redis channel 'chat'. Server B catches the event and dispatches the frame to Bob's socket descriptor in memory."
        ),
        (
            "Q3: What happens if Redis crashes or is not configured?",
            "The backend includes graceful degradation. If Redis fails, 'isRedisConnected' switches to false and falls back to local in-memory dispatching and sliding-window caching, keeping single instances 100% operational."
        ),
        (
            "Q4: How do you prevent memory leaks when thousands of users connect and disconnect?",
            "1. Sockets are held in Set collections and pruned immediately on 'close' events.<br/>2. Empty room keys are deleted from the Map (rooms.delete(roomId)).<br/>3. Message history cache is capped at 100 entries via history.shift().<br/>4. Ping/pong reaper terminates dead sockets every 30 seconds."
        ),
        (
            "Q5: How does the system handle offline users when messages are sent?",
            "Messages are saved to MongoDB Atlas asynchronously. When an offline user comes online and emits 'join', the server queries the database for the last 50 messages and pushes a 'history' payload."
        ),
        (
            "Q6: Why is JWT verified on every socket action instead of relying on client data?",
            "To enforce Zero-Trust security. A malicious client could send '{ sender: \"CEO\" }'. By cryptographically decoding the signed JWT payload, the server strictly trusts the verified identity."
        ),
        (
            "Q7: How is WebRTC integrated with WebSockets?",
            "WebRTC requires an out-of-band signaling mechanism to exchange session metadata (SDP Offer/Answer) and network routes (ICE Candidates). The WebSocket server acts as the low-latency signaling bridge before direct P2P media streaming begins."
        ),
        (
            "Q8: How does the application handle ICE Candidate race conditions?",
            "If ICE candidates arrive before setRemoteDescription() executes, calling addIceCandidate() throws an error. We implemented an in-memory queue (iceCandidatesQueueRef) that holds candidates and flushes them in order once the remote description is set."
        ),
        (
            "Q9: Why shouldn't file attachments be streamed over WebSockets?",
            "Large binary transfers block the single-threaded Node.js event loop and consume WebSocket framing buffers. Uploading via REST (POST /upload) with multipart streaming keeps WebSockets lightweight."
        ),
        (
            "Q10: What is the difference between Redis Pub/Sub and Redis Streams?",
            "Pub/Sub is fire-and-forget (transient). If a server is down during a publish, the message is lost. Redis Streams provides durable append-only logs, consumer groups, message acknowledgment (XACK), and pending retry queues."
        )
    ]

    for q, a in qa_list:
        card_content = [
            Paragraph(f"<b>{q}</b>", h2_style),
            Paragraph(a, body_style)
        ]
        t = Table([[card_content]], colWidths=[500])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#e2e8f0")),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(t)
        story.append(Spacer(1, 4))

    # SECTION 5: RESUME BULLET POINTS
    story.append(Spacer(1, 6))
    story.append(Paragraph("5. Google XYZ Formula Resume Bullet Points", h1_style))
    bullets = [
        "<b>Distributed Real-Time Architecture:</b> Engineered a horizontally scalable real-time chat platform supporting concurrent bidirectional communication across multiple Node.js instances using WebSockets, Redis Pub/Sub, and MongoDB Atlas.",
        "<b>Low-Latency Routing & Memory Optimization:</b> Implemented an O(1) in-memory room routing map and ring-buffer cache with automated garbage collection, reducing message dispatch latency to <15ms while preventing memory leaks on abrupt client disconnections.",
        "<b>Stateless Zero-Trust Security:</b> Designed JWT authentication with cryptographic signature validation on WebSocket handshakes, preventing sender identity spoofing across all distributed cluster nodes.",
        "<b>WebRTC Peer-to-Peer Video Calling:</b> Architected a full WebRTC signaling pipeline with ICE candidate queuing, automatic device fallback, and line-busy guards for seamless in-browser 1-on-1 video/audio calling.",
        "<b>3-Phase Message Delivery Lifecycle:</b> Built an end-to-end receipt synchronization protocol (Sent -> Delivered -> Read) with viewport focus detection and debounced typing indicator events."
    ]
    for b in bullets:
        story.append(Paragraph(f"• {b}", bullet_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[OK] PDF successfully generated at: {filename}")

if __name__ == "__main__":
    out_path = sys.argv[1] if len(sys.argv) > 1 else "LetsConnectX_Interview_Preparation_Guide.pdf"
    build_pdf(out_path)
