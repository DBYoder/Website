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

app.use(express.static(path.join(__dirname, 'dist')));

const sessions = {
  poker: {},
  retro: {}
};

// Maps socket.id → retro roomId for disconnect cleanup
const socketRetroRoom = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // --- Planning Poker ---
  socket.on('poker:join', ({ roomId, username }) => {
    socket.join(`poker:${roomId}`);

    if (!sessions.poker[roomId]) {
      sessions.poker[roomId] = {
        participants: {},
        gameState: 'voting',
        currentStory: null,
        backlog: []
      };
    }

    sessions.poker[roomId].participants[socket.id] = {
      username,
      vote: null,
      voted: false
    };

    io.to(`poker:${roomId}`).emit('poker:state', sessions.poker[roomId]);
  });

  socket.on('poker:updateBacklog', ({ roomId, backlog }) => {
    if (!sessions.poker[roomId]) {
      sessions.poker[roomId] = {
        participants: {},
        gameState: 'voting',
        currentStory: backlog.length > 0 ? backlog[0] : null,
        backlog: backlog
      };
    } else {
      const session = sessions.poker[roomId];
      session.backlog = backlog;
      if (!session.currentStory && backlog.length > 0) {
        session.currentStory = backlog[0];
      }
    }
    io.to(`poker:${roomId}`).emit('poker:state', sessions.poker[roomId]);
  });

  socket.on('poker:selectStory', ({ roomId, story }) => {
    const session = sessions.poker[roomId];
    if (session) {
      session.currentStory = story;
      session.gameState = 'voting';
      Object.values(session.participants).forEach(p => {
        p.vote = null;
        p.voted = false;
      });
      io.to(`poker:${roomId}`).emit('poker:state', session);
    }
  });

  socket.on('poker:vote', ({ roomId, vote }) => {
    const session = sessions.poker[roomId];
    if (session && session.participants[socket.id]) {
      session.participants[socket.id].vote = vote;
      session.participants[socket.id].voted = true;
      io.to(`poker:${roomId}`).emit('poker:state', session);
    }
  });

  socket.on('poker:reveal', (roomId) => {
    const session = sessions.poker[roomId];
    if (session) {
      session.gameState = 'revealed';
      io.to(`poker:${roomId}`).emit('poker:state', session);
    }
  });

  socket.on('poker:completeStory', ({ roomId, storyId, points }) => {
    const session = sessions.poker[roomId];
    if (session) {
      const storyIndex = session.backlog.findIndex(s => s.id === storyId);
      if (storyIndex !== -1) {
        session.backlog[storyIndex].points = points;
      }

      const nextStory = session.backlog[storyIndex + 1];
      session.currentStory = nextStory || null;
      session.gameState = 'voting';

      Object.values(session.participants).forEach(p => {
        p.vote = null;
        p.voted = false;
      });

      io.to(`poker:${roomId}`).emit('poker:state', session);
    }
  });

  // --- Retro Board ---
  socket.on('retro:join', ({ roomId }) => {
    socket.join(`retro:${roomId}`);
    socketRetroRoom[socket.id] = roomId;

    if (!sessions.retro[roomId]) {
      sessions.retro[roomId] = {
        columns: {
          wentWell: [],
          toImprove: [],
          actionItems: []
        },
        timer: {
          isRunning: false,
          durationSeconds: 0,
          startedAt: null
        }
      };
    }

    io.to(`retro:${roomId}`).emit('retro:state', sessions.retro[roomId]);
  });

  socket.on('retro:addCard', ({ roomId, colKey, text, username }) => {
    const session = sessions.retro[roomId];
    if (session) {
      session.columns[colKey].push({
        text,
        votes: 0,
        owner: username,
        id: Math.random().toString(36).substr(2, 9)
      });
      io.to(`retro:${roomId}`).emit('retro:state', session);
    }
  });

  socket.on('retro:vote', ({ roomId, colKey, cardId }) => {
    const session = sessions.retro[roomId];
    if (session) {
      const card = session.columns[colKey].find(c => c.id === cardId);
      if (card) card.votes += 1;
      io.to(`retro:${roomId}`).emit('retro:state', session);
    }
  });

  socket.on('retro:startTimer', ({ roomId, durationSeconds }) => {
    const session = sessions.retro[roomId];
    if (session) {
      session.timer.durationSeconds = durationSeconds;
      session.timer.startedAt = Date.now();
      session.timer.isRunning = true;
      io.to(`retro:${roomId}`).emit('retro:state', session);
    }
  });

  socket.on('retro:stopTimer', ({ roomId }) => {
    const session = sessions.retro[roomId];
    if (session) {
      session.timer.isRunning = false;
      session.timer.durationSeconds = 0;
      session.timer.startedAt = null;
      io.to(`retro:${roomId}`).emit('retro:state', session);
    }
  });

  socket.on('disconnect', () => {
    // Clean up poker sessions
    for (const roomId in sessions.poker) {
      if (sessions.poker[roomId].participants[socket.id]) {
        delete sessions.poker[roomId].participants[socket.id];
        if (Object.keys(sessions.poker[roomId].participants).length === 0) {
          delete sessions.poker[roomId];
        } else {
          io.to(`poker:${roomId}`).emit('poker:state', sessions.poker[roomId]);
        }
      }
    }

    // Clean up retro sessions
    const retroRoomId = socketRetroRoom[socket.id];
    if (retroRoomId) {
      delete socketRetroRoom[socket.id];
      const room = io.sockets.adapter.rooms.get(`retro:${retroRoomId}`);
      if (!room || room.size === 0) {
        delete sessions.retro[retroRoomId];
      }
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
