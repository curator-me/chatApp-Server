# 💬 Chat App Server

A **real-time chat server** built using **Node.js**, **Socket.IO**, and **MongoDB**.  
This backend handles authentication, room-based messaging, message history, and pagination.  
It’s designed to connect seamlessly with a frontend client (like a web chat UI).

---

## Features

-  **User Authentication** (via MongoDB)
-  **Real-time Messaging** with Socket.IO
-  **Room-based Chat System**
-  **Message History Loading** (fetches last 20 messages)
-  **Pagination Support** for older messages
-  **Socket.IO Admin UI Integration**
-  **CORS Configured** for local development and admin monitoring

---

## Tech Stack

- **Node.js** – Backend runtime  
- **Socket.IO** – Real-time communication  
- **MongoDB** – Database for users and messages  
- **@socket.io/admin-ui** – Admin dashboard for live socket monitoring


---

## Setup Instructions

Clone the repository
```bash
git clone https://github.com/your-username/chat-backend.git
cd chat-backend
```

Install dependencies
```
npm install
```

Add environment variables
Create a .env file (or use Render environment variables):

```
MONGODB_URI=your_mongodb_connection_string
PORT=8000
```

Start the server
```
node index.js
```
