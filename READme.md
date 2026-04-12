# 🚀 Scalable Real-Time Chat Application

A full-stack real-time chat application built with **WebSockets, JWT authentication, MongoDB, and Redis Pub/Sub**, designed to support **multi-room communication and distributed messaging across multiple server instances**.

---

## 🔥 Features

* ⚡ Real-time messaging using WebSockets
* 🧑‍🤝‍🧑 Multi-room chat system
* 🔐 JWT-based authentication (secure users)
* 💾 Persistent chat history (MongoDB)
* 🔄 Load previous messages on join
* 🚀 Redis Pub/Sub for horizontal scaling
* 🎨 Clean UI with chat bubbles & auto-scroll

---

## 🧠 Tech Stack

### Frontend

* React (TypeScript)
* Tailwind CSS

### Backend

* Node.js + Express
* WebSocket (`ws`)

### Database

* MongoDB (Atlas)

### Scaling

* Redis (Pub/Sub)

### Deployment

* Vercel (Frontend)
* Render (Backend)

---

## ⚙️ Architecture

```
Frontend (Vercel)
        ↓
WebSocket (WSS)
        ↓
Backend (Render)
        ↓
Redis Pub/Sub
        ↓
Multiple Server Instances
        ↓
MongoDB
```

---

## 🚀 Live Demo

👉 https://your-frontend-url.vercel.app

---

## 🛠️ Local Setup

### 1. Clone Repository

```
git clone https://github.com/your-username/chat-app.git
cd chat-app
```

---

### 2. Backend Setup

```
cd backend
npm install
npm run dev
```

Create `.env` file:

```
PORT=8080
MONGO_URI=your_mongodb_url
JWT_SECRET=your_secret
REDIS_URL=your_redis_url
```

---

### 3. Frontend Setup

```
cd frontend
npm install
npm run dev
```

Create `.env` file:

```
VITE_WS_URL=ws://localhost:8080
```

---

## 🔑 Environment Variables

### Backend

| Variable   | Description               |
| ---------- | ------------------------- |
| MONGO_URI  | MongoDB connection string |
| JWT_SECRET | Secret key for JWT        |
| REDIS_URL  | Redis connection URL      |

---

### Frontend

| Variable    | Description           |
| ----------- | --------------------- |
| VITE_WS_URL | WebSocket backend URL |

---

## 🧪 Testing (Scaling)

Run multiple backend instances:

```
$env:PORT=8080; node dist/index.js
$env:PORT=8081; node dist/index.js
```

Open:

```
http://localhost:5173?port=8080&roomId=test
http://localhost:5173?port=8081&roomId=test
```

Messages will sync across servers via Redis.

---

## 💼 Resume Highlight

Developed a scalable real-time chat application using WebSockets, JWT authentication, MongoDB, and Redis Pub/Sub, supporting distributed messaging across multiple server instances.

---

## 🚀 Future Improvements

* Online users / presence system
* Typing indicators
* Message notifications
* File sharing support

---

## 🙌 Acknowledgements

Built as part of advanced full-stack and system design learning.

---

## 📬 Contact

Feel free to connect or reach out for collaboration!
