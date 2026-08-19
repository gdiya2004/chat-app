# 🚀 LetsConnectX – Real-Time Scalable Chat App

A **real-time chat application** built with **WebSockets, Redis Pub/Sub, and JWT authentication**, designed to scale across multiple servers.

---

## 🌐 Live Demo

* Frontend: https://letsconnectx.vercel.app
* Backend (WS): https://letsconnectx.onrender.com
* Auth Server: https://chat-app-auth-qr82.onrender.com

---

## ⚡ Features

* 🔐 JWT-based Authentication
* 💬 Real-time messaging using WebSockets
* 🧠 Redis Pub/Sub for multi-server communication
* 🗂️ Room-based chat system
* 📜 Message history using MongoDB
* 🌍 Deployed on Vercel + Render + Redis Cloud

---

## 🏗️ Tech Stack

### Frontend

* React (Vite)
* TypeScript
* WebSocket API

### Backend

* Node.js
* Express
* WebSocket (ws)
* Redis (ioredis)
* MongoDB (Mongoose)

### Deployment

* Frontend → Vercel
* Backend → Render
* Redis → Redis Cloud

---

## 🧠 System Design

```
User → Frontend (React)
      → Auth Server (JWT)
      → WebSocket Server
      → Redis Pub/Sub
      → MongoDB (store messages)
```

👉 Supports multiple backend instances using Redis.

---

## 🔑 Environment Variables

### Backend (Render)

```
MONGO_URI=your_mongodb_url
REDIS_URL=your_redis_url
JWT_SECRET=your_secret
PORT=10000
```

---

### Frontend (Vercel)

```
VITE_AUTH_URL=https://chat-app-auth-xxxx.onrender.com
VITE_WS_URL=wss://letsconnectx.onrender.com
```

---

## 🛠️ Installation (Local Setup)

### 1. Clone repo

```
git clone https://github.com/gdiya2004/chat-app
```

---

### 2. Setup Backend

```
cd backend
npm install
npm run build
npm run dev
```

---

### 3. Setup Frontend

```
cd frontend
npm install
npm run dev
```

---

## 🧪 How It Works

1. User logs in → receives JWT token
2. Token stored in browser
3. WebSocket connects using token
4. User joins a room
5. Messages:

   * Saved to MongoDB
   * Published via Redis
   * Broadcast to all users in room

---

## 📸 Screenshots

<img width="1910" height="1019" alt="image" src="https://github.com/user-attachments/assets/29a1983b-b6db-41c9-9f57-0c3e5930f0a9" />
<img width="1893" height="1005" alt="image" src="https://github.com/user-attachments/assets/0e8327ed-7ec6-47df-8d38-326e0f49ba96" />


---

## 🚀 Future Improvements

* Typing indicators
* Online/offline status
* File sharing
* Message reactions
* Group chats

---

## 👩‍💻 Author

Diya Gupta

---

## ⭐ If you like this project

Give it a star ⭐ and share it!

---
