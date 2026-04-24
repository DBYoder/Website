import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'dist')));

// --- File persistence ---
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const saveTimers = {};

function loadData(filename, defaultValue) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf8'));
  } catch {
    return defaultValue;
  }
}

function saveData(filename, data) {
  clearTimeout(saveTimers[filename]);
  saveTimers[filename] = setTimeout(() => {
    fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data));
  }, 1000);
}

// Load persisted sessions and clear ephemeral runtime state
const pokerSessions = loadData('poker.json', {});
const retroSessions = loadData('retro.json', {});
const wbsSessions   = loadData('wbs.json', {});

for (const r in pokerSessions) pokerSessions[r].participants = {};
for (const r in retroSessions) {
  retroSessions[r].timer = { isRunning: false, durationSeconds: 0, startedAt: null };
}
for (const r in wbsSessions) wbsSessions[r].participants = {};

const sessions = { poker: pokerSessions, retro: retroSessions, wbs: wbsSessions };

// Maps socket.id → room for cleanup
const socketRetroRoom = {};
const socketWBSRoom   = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // --- Planning Poker ---
  socket.on('poker:join', ({ roomId, username }) => {
    socket.join(`poker:${roomId}`);
    if (!sessions.poker[roomId]) {
      sessions.poker[roomId] = { participants: {}, gameState: 'voting', currentStory: null, backlog: [] };
    }
    sessions.poker[roomId].participants[socket.id] = { username, vote: null, voted: false };
    io.to(`poker:${roomId}`).emit('poker:state', sessions.poker[roomId]);
    saveData('poker.json', sessions.poker);
  });

  socket.on('poker:updateBacklog', ({ roomId, backlog }) => {
    if (!sessions.poker[roomId]) {
      sessions.poker[roomId] = { participants: {}, gameState: 'voting', currentStory: backlog[0] || null, backlog };
    } else {
      sessions.poker[roomId].backlog = backlog;
      if (!sessions.poker[roomId].currentStory && backlog.length > 0) {
        sessions.poker[roomId].currentStory = backlog[0];
      }
    }
    io.to(`poker:${roomId}`).emit('poker:state', sessions.poker[roomId]);
    saveData('poker.json', sessions.poker);
  });

  socket.on('poker:selectStory', ({ roomId, story }) => {
    const s = sessions.poker[roomId];
    if (s) {
      s.currentStory = story;
      s.gameState = 'voting';
      Object.values(s.participants).forEach(p => { p.vote = null; p.voted = false; });
      io.to(`poker:${roomId}`).emit('poker:state', s);
      saveData('poker.json', sessions.poker);
    }
  });

  socket.on('poker:vote', ({ roomId, vote }) => {
    const s = sessions.poker[roomId];
    if (s && s.participants[socket.id]) {
      s.participants[socket.id].vote = vote;
      s.participants[socket.id].voted = true;
      io.to(`poker:${roomId}`).emit('poker:state', s);
    }
  });

  socket.on('poker:reveal', (roomId) => {
    const s = sessions.poker[roomId];
    if (s) {
      s.gameState = 'revealed';
      io.to(`poker:${roomId}`).emit('poker:state', s);
    }
  });

  socket.on('poker:completeStory', ({ roomId, storyId, points }) => {
    const s = sessions.poker[roomId];
    if (s) {
      const idx = s.backlog.findIndex(story => story.id === storyId);
      if (idx !== -1) s.backlog[idx].points = points;
      s.currentStory = s.backlog[idx + 1] || null;
      s.gameState = 'voting';
      Object.values(s.participants).forEach(p => { p.vote = null; p.voted = false; });
      io.to(`poker:${roomId}`).emit('poker:state', s);
      saveData('poker.json', sessions.poker);
    }
  });

  // --- Retro Board ---
  socket.on('retro:join', ({ roomId }) => {
    socket.join(`retro:${roomId}`);
    socketRetroRoom[socket.id] = roomId;
    if (!sessions.retro[roomId]) {
      sessions.retro[roomId] = {
        columns: { wentWell: [], toImprove: [], actionItems: [] },
        timer: { isRunning: false, durationSeconds: 0, startedAt: null }
      };
    }
    io.to(`retro:${roomId}`).emit('retro:state', sessions.retro[roomId]);
  });

  socket.on('retro:addCard', ({ roomId, colKey, text, username }) => {
    const s = sessions.retro[roomId];
    if (s) {
      s.columns[colKey].push({ text, votes: 0, owner: username, id: Math.random().toString(36).substr(2, 9) });
      io.to(`retro:${roomId}`).emit('retro:state', s);
      saveData('retro.json', sessions.retro);
    }
  });

  socket.on('retro:vote', ({ roomId, colKey, cardId }) => {
    const s = sessions.retro[roomId];
    if (s) {
      const card = s.columns[colKey].find(c => c.id === cardId);
      if (card) card.votes += 1;
      io.to(`retro:${roomId}`).emit('retro:state', s);
      saveData('retro.json', sessions.retro);
    }
  });

  socket.on('retro:startTimer', ({ roomId, durationSeconds }) => {
    const s = sessions.retro[roomId];
    if (s) {
      s.timer = { durationSeconds, startedAt: Date.now(), isRunning: true };
      io.to(`retro:${roomId}`).emit('retro:state', s);
    }
  });

  socket.on('retro:deleteCard', ({ roomId, cardId, username }) => {
    const s = sessions.retro[roomId];
    if (!s) return;
    for (const col of Object.values(s.columns)) {
      const idx = col.findIndex(c => c.id === cardId && c.owner === username);
      if (idx !== -1) { col.splice(idx, 1); break; }
    }
    io.to(`retro:${roomId}`).emit('retro:state', s);
    saveData('retro.json', sessions.retro);
  });

  socket.on('retro:stopTimer', ({ roomId }) => {
    const s = sessions.retro[roomId];
    if (s) {
      s.timer = { isRunning: false, durationSeconds: 0, startedAt: null };
      io.to(`retro:${roomId}`).emit('retro:state', s);
    }
  });

  // --- Work Breakdown Structure ---
  socket.on('wbs:join', ({ roomId, username }) => {
    socket.join(`wbs:${roomId}`);
    socketWBSRoom[socket.id] = roomId;
    if (!sessions.wbs[roomId]) {
      sessions.wbs[roomId] = { nodes: {}, rootIds: [], participants: {}, status: 'active', createdAt: Date.now() };
    }
    sessions.wbs[roomId].participants[socket.id] = { username };
    io.to(`wbs:${roomId}`).emit('wbs:state', sessions.wbs[roomId]);
  });

  socket.on('wbs:addNode', ({ roomId, parentId, type, title, username }) => {
    const s = sessions.wbs[roomId];
    if (!s || s.status === 'complete') return;
    const id = Math.random().toString(36).substr(2, 9);
    s.nodes[id] = { id, type, title, createdBy: username, parentId: parentId || null, childIds: [], collapsed: false };
    if (parentId && s.nodes[parentId]) {
      s.nodes[parentId].childIds.push(id);
    } else {
      s.rootIds.push(id);
    }
    io.to(`wbs:${roomId}`).emit('wbs:state', s);
    saveData('wbs.json', sessions.wbs);
  });

  socket.on('wbs:renameNode', ({ roomId, nodeId, title, username }) => {
    const s = sessions.wbs[roomId];
    if (!s || s.status === 'complete') return;
    const node = s.nodes[nodeId];
    if (node && node.createdBy === username) {
      node.title = title;
      io.to(`wbs:${roomId}`).emit('wbs:state', s);
      saveData('wbs.json', sessions.wbs);
    }
  });

  socket.on('wbs:deleteNode', ({ roomId, nodeId, username }) => {
    const s = sessions.wbs[roomId];
    if (!s || s.status === 'complete') return;
    const node = s.nodes[nodeId];
    if (!node || node.createdBy !== username) return;

    const toDelete = [];
    const collect = (id) => {
      toDelete.push(id);
      (s.nodes[id]?.childIds || []).forEach(collect);
    };
    collect(nodeId);

    if (node.parentId) {
      const parent = s.nodes[node.parentId];
      if (parent) parent.childIds = parent.childIds.filter(id => id !== nodeId);
    } else {
      s.rootIds = s.rootIds.filter(id => id !== nodeId);
    }
    toDelete.forEach(id => delete s.nodes[id]);

    io.to(`wbs:${roomId}`).emit('wbs:state', s);
    saveData('wbs.json', sessions.wbs);
  });

  socket.on('wbs:updateStoryDetails', ({ roomId, nodeId, asA, soThat, username }) => {
    const s = sessions.wbs[roomId];
    if (!s || s.status === 'complete') return;
    const node = s.nodes[nodeId];
    if (node && node.type === 'story' && node.createdBy === username) {
      node.asA = asA;
      node.soThat = soThat;
      io.to(`wbs:${roomId}`).emit('wbs:state', s);
      saveData('wbs.json', sessions.wbs);
    }
  });

  socket.on('wbs:toggleCollapse', ({ roomId, nodeId }) => {
    const s = sessions.wbs[roomId];
    if (s && s.nodes[nodeId]) {
      s.nodes[nodeId].collapsed = !s.nodes[nodeId].collapsed;
      io.to(`wbs:${roomId}`).emit('wbs:state', s);
    }
  });

  socket.on('wbs:setStatus', ({ roomId, status }) => {
    const s = sessions.wbs[roomId];
    if (s) {
      s.status = status;
      io.to(`wbs:${roomId}`).emit('wbs:state', s);
      saveData('wbs.json', sessions.wbs);
    }
  });

  socket.on('disconnect', () => {
    // Poker: remove participant but keep session alive
    for (const roomId in sessions.poker) {
      if (sessions.poker[roomId].participants[socket.id]) {
        delete sessions.poker[roomId].participants[socket.id];
        io.to(`poker:${roomId}`).emit('poker:state', sessions.poker[roomId]);
      }
    }

    // Retro: keep session alive
    const retroRoomId = socketRetroRoom[socket.id];
    if (retroRoomId) delete socketRetroRoom[socket.id];

    // WBS: remove participant, keep session alive
    const wbsRoomId = socketWBSRoom[socket.id];
    if (wbsRoomId && sessions.wbs[wbsRoomId]) {
      delete sessions.wbs[wbsRoomId].participants[socket.id];
      delete socketWBSRoom[socket.id];
      io.to(`wbs:${wbsRoomId}`).emit('wbs:state', sessions.wbs[wbsRoomId]);
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
