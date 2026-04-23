import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  }
});

const PORT = process.env.PORT || 3000;

// Serve static files from the Vite build directory
app.use(express.static(path.join(__dirname, 'dist')));

// API routes placeholder
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running with Socket.io' });
});

// Socket.io logic for tools
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Planning Poker events
  socket.on('poker:join', (roomId) => {
    socket.join(`poker:${roomId}`);
    console.log(`User ${socket.id} joined poker room: ${roomId}`);
  });

  socket.on('poker:vote', ({ roomId, vote }) => {
    io.to(`poker:${roomId}`).emit('poker:voted', { userId: socket.id, vote });
  });

  // Retro Board events
  socket.on('retro:join', (roomId) => {
    socket.join(`retro:${roomId}`);
    console.log(`User ${socket.id} joined retro room: ${roomId}`);
  });

  socket.on('retro:addCard', ({ roomId, card }) => {
    io.to(`retro:${roomId}`).emit('retro:cardAdded', card);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// For any other request, serve index.html (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
