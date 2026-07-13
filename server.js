import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { randomUUID } from 'crypto';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'dist')));

// --- Contact email reveal ---
// The address is never present in the served HTML/JS, so page scrapers can't
// harvest it. It lives here (or in the CONTACT_EMAIL env var, which wins) and
// is handed out only on an explicit POST, rate-limited per IP. The fallback
// is stored reversed+base64 so repo-crawling address harvesters miss it too.
const CONTACT_EMAIL = process.env.CONTACT_EMAIL ||
  Buffer.from('bW9jLmxpYW1nQDIxcmVkb3liZGl2YWQ=', 'base64').toString().split('').reverse().join('');

const REVEAL_LIMIT = 10;                    // reveals per IP...
const REVEAL_WINDOW_MS = 60 * 60 * 1000;    // ...per hour
const revealHits = new Map();

app.post('/api/contact-reveal', (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const rec = revealHits.get(ip);
  if (!rec || now > rec.resetAt) {
    revealHits.set(ip, { count: 1, resetAt: now + REVEAL_WINDOW_MS });
  } else if (++rec.count > REVEAL_LIMIT) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  res.set('Cache-Control', 'no-store');
  res.json({ email: CONTACT_EMAIL });
});

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
const backlogSessions = loadData('backlog.json', {});

for (const r in pokerSessions) pokerSessions[r].participants = {};
for (const r in retroSessions) {
  retroSessions[r].timer = { isRunning: false, durationSeconds: 0, startedAt: null };
}
for (const r in wbsSessions) wbsSessions[r].participants = {};

// Rooms idle beyond the TTL are dropped at startup so the data files don't
// grow forever. Sessions persisted before lastActivity existed get stamped
// now and age out from there.
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function pruneStale(store) {
  const now = Date.now();
  for (const roomId in store) {
    const last = store[roomId].lastActivity ?? store[roomId].createdAt;
    if (!last) store[roomId].lastActivity = now;
    else if (now - last > SESSION_TTL_MS) delete store[roomId];
  }
}
pruneStale(pokerSessions);
pruneStale(retroSessions);
pruneStale(wbsSessions);
pruneStale(backlogSessions);

const touch = (session) => { session.lastActivity = Date.now(); };

// Coerce an incoming story to a safe shape before it enters a shared backlog.
function sanitizeStory(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const str = (v) => (typeof v === 'string' ? v : '');
  const id = str(raw.id);
  if (!id) return null;
  const story = {
    id,
    title: str(raw.title),
    asA: str(raw.asA),
    iWant: str(raw.iWant),
    soThat: str(raw.soThat),
    criteria: Array.isArray(raw.criteria) ? raw.criteria.filter(c => typeof c === 'string') : [],
  };
  if (raw.points !== undefined && raw.points !== null && raw.points !== '' && !isNaN(Number(raw.points))) {
    story.points = Number(raw.points);
  }
  if (str(raw.epic)) story.epic = str(raw.epic);
  if (str(raw.feature)) story.feature = str(raw.feature);
  if (['draft', 'ready', 'estimated'].includes(raw.status)) story.status = raw.status;
  return story;
}

const RETRO_COLUMNS = ['wentWell', 'toImprove', 'actionItems'];
const RETRO_VOTE_LIMIT = 3;
const WBS_NODE_TYPES = ['epic', 'feature', 'story'];

const sessions = { poker: pokerSessions, retro: retroSessions, wbs: wbsSessions, backlog: backlogSessions };

// Maps socket.id → room for cleanup
const socketRetroRoom = {};
const socketWBSRoom   = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // --- Planning Poker ---
  socket.on('poker:join', ({ roomId, username }, ack) => {
    socket.join(`poker:${roomId}`);
    const existed = !!sessions.poker[roomId];
    if (typeof ack === 'function') ack({ existed });
    if (!existed) {
      sessions.poker[roomId] = { participants: {}, gameState: 'voting', currentStory: null, backlog: [] };
    }
    sessions.poker[roomId].participants[socket.id] = { username, vote: null, voted: false };
    touch(sessions.poker[roomId]);
    io.to(`poker:${roomId}`).emit('poker:state', sessions.poker[roomId]);
    saveData('poker.json', sessions.poker);
  });

  socket.on('poker:updateBacklog', ({ roomId, backlog }) => {
    if (!Array.isArray(backlog)) return;
    if (!sessions.poker[roomId]) {
      sessions.poker[roomId] = { participants: {}, gameState: 'voting', currentStory: backlog[0] || null, backlog };
    } else {
      sessions.poker[roomId].backlog = backlog;
      if (!sessions.poker[roomId].currentStory && backlog.length > 0) {
        sessions.poker[roomId].currentStory = backlog[0];
      }
    }
    touch(sessions.poker[roomId]);
    io.to(`poker:${roomId}`).emit('poker:state', sessions.poker[roomId]);
    saveData('poker.json', sessions.poker);
  });

  // Granular backlog updates: merge/remove by story id so two participants
  // acting at once don't clobber each other's whole backlog.
  socket.on('poker:addStories', ({ roomId, stories }) => {
    const s = sessions.poker[roomId];
    if (!s || !Array.isArray(stories)) return;
    for (const story of stories) {
      if (!story || typeof story.id !== 'string') continue;
      const idx = s.backlog.findIndex(b => b.id === story.id);
      if (idx !== -1) s.backlog[idx] = { ...s.backlog[idx], ...story };
      else s.backlog.push(story);
    }
    if (!s.currentStory && s.backlog.length > 0) s.currentStory = s.backlog[0];
    touch(s);
    io.to(`poker:${roomId}`).emit('poker:state', s);
    saveData('poker.json', sessions.poker);
  });

  socket.on('poker:removeStory', ({ roomId, storyId }) => {
    const s = sessions.poker[roomId];
    if (!s) return;
    s.backlog = s.backlog.filter(b => b.id !== storyId);
    if (s.currentStory && s.currentStory.id === storyId) s.currentStory = null;
    touch(s);
    io.to(`poker:${roomId}`).emit('poker:state', s);
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
      // Auto-reveal once the last participant has voted
      const everyone = Object.values(s.participants);
      if (everyone.length > 0 && everyone.every(p => p.voted)) {
        s.gameState = 'revealed';
      }
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

  socket.on('poker:revote', (roomId) => {
    const s = sessions.poker[roomId];
    if (s) {
      s.gameState = 'voting';
      Object.values(s.participants).forEach(p => { p.vote = null; p.voted = false; });
      io.to(`poker:${roomId}`).emit('poker:state', s);
    }
  });

  socket.on('poker:completeStory', ({ roomId, storyId, points }) => {
    const s = sessions.poker[roomId];
    if (!s) return;
    const idx = s.backlog.findIndex(story => story.id === storyId);
    if (idx === -1) return; // unknown story; -1 would otherwise select backlog[0]
    s.backlog[idx].points = points;
    s.currentStory = s.backlog[idx + 1] || null;
    s.gameState = 'voting';
    Object.values(s.participants).forEach(p => { p.vote = null; p.voted = false; });
    touch(s);
    io.to(`poker:${roomId}`).emit('poker:state', s);
    saveData('poker.json', sessions.poker);
  });

  // --- Retro Board ---
  socket.on('retro:join', ({ roomId }, ack) => {
    socket.join(`retro:${roomId}`);
    socketRetroRoom[socket.id] = roomId;
    if (typeof ack === 'function') ack({ existed: !!sessions.retro[roomId] });
    if (!sessions.retro[roomId]) {
      sessions.retro[roomId] = {
        columns: { wentWell: [], toImprove: [], actionItems: [] },
        timer: { isRunning: false, durationSeconds: 0, startedAt: null }
      };
    }
    touch(sessions.retro[roomId]);
    io.to(`retro:${roomId}`).emit('retro:state', sessions.retro[roomId]);
  });

  socket.on('retro:addCard', ({ roomId, colKey, text, username }) => {
    const s = sessions.retro[roomId];
    if (!s || !RETRO_COLUMNS.includes(colKey) || typeof text !== 'string' || !text.trim()) return;
    s.columns[colKey].push({ text, votes: 0, voters: [], owner: username, id: randomUUID() });
    touch(s);
    io.to(`retro:${roomId}`).emit('retro:state', s);
    saveData('retro.json', sessions.retro);
  });

  // Toggle vote: users have a budget of RETRO_VOTE_LIMIT votes per board;
  // voting a card they already voted removes that vote. Cards persisted
  // before voter tracking keep their anonymous baseline count.
  socket.on('retro:vote', ({ roomId, colKey, cardId, username }) => {
    const s = sessions.retro[roomId];
    if (!s || !RETRO_COLUMNS.includes(colKey)) return;
    if (typeof username !== 'string' || !username) return;
    const card = s.columns[colKey].find(c => c.id === cardId);
    if (!card) return;
    card.voters = card.voters || [];
    const i = card.voters.indexOf(username);
    if (i !== -1) {
      card.voters.splice(i, 1);
      card.votes = Math.max(0, (card.votes || 0) - 1);
    } else {
      const used = RETRO_COLUMNS.reduce((n, k) =>
        n + s.columns[k].reduce((m, c) => m + ((c.voters || []).includes(username) ? 1 : 0), 0), 0);
      if (used >= RETRO_VOTE_LIMIT) return;
      card.voters.push(username);
      card.votes = (card.votes || 0) + 1;
    }
    touch(s);
    io.to(`retro:${roomId}`).emit('retro:state', s);
    saveData('retro.json', sessions.retro);
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
    touch(s);
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
  socket.on('wbs:join', ({ roomId, username }, ack) => {
    socket.join(`wbs:${roomId}`);
    socketWBSRoom[socket.id] = roomId;
    if (typeof ack === 'function') ack({ existed: !!sessions.wbs[roomId] });
    if (!sessions.wbs[roomId]) {
      sessions.wbs[roomId] = { nodes: {}, rootIds: [], participants: {}, status: 'active', createdAt: Date.now() };
    }
    sessions.wbs[roomId].participants[socket.id] = { username };
    touch(sessions.wbs[roomId]);
    io.to(`wbs:${roomId}`).emit('wbs:state', sessions.wbs[roomId]);
  });

  socket.on('wbs:addNode', ({ roomId, parentId, type, title, username }) => {
    const s = sessions.wbs[roomId];
    if (!s || s.status === 'complete') return;
    if (!WBS_NODE_TYPES.includes(type) || typeof title !== 'string' || !title.trim()) return;
    const id = randomUUID();
    s.nodes[id] = { id, type, title, createdBy: username, parentId: parentId || null, childIds: [], collapsed: false };
    if (parentId && s.nodes[parentId]) {
      s.nodes[parentId].childIds.push(id);
    } else {
      s.rootIds.push(id);
    }
    touch(s);
    io.to(`wbs:${roomId}`).emit('wbs:state', s);
    saveData('wbs.json', sessions.wbs);
  });

  // WBS editing is collaborative: any participant in an active session can
  // rename, add to, or edit any node — the breakdown is a shared artifact,
  // not per-author. createdBy is retained only as an informational label.
  socket.on('wbs:renameNode', ({ roomId, nodeId, title }) => {
    const s = sessions.wbs[roomId];
    if (!s || s.status === 'complete') return;
    if (typeof title !== 'string' || !title.trim()) return;
    const node = s.nodes[nodeId];
    if (node) {
      node.title = title;
      touch(s);
      io.to(`wbs:${roomId}`).emit('wbs:state', s);
      saveData('wbs.json', sessions.wbs);
    }
  });

  socket.on('wbs:deleteNode', ({ roomId, nodeId }) => {
    const s = sessions.wbs[roomId];
    if (!s || s.status === 'complete') return;
    const node = s.nodes[nodeId];
    if (!node) return;

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

    touch(s);
    io.to(`wbs:${roomId}`).emit('wbs:state', s);
    saveData('wbs.json', sessions.wbs);
  });

  socket.on('wbs:updateStoryDetails', ({ roomId, nodeId, asA, iWant, soThat, criteria }) => {
    const s = sessions.wbs[roomId];
    if (!s || s.status === 'complete') return;
    const node = s.nodes[nodeId];
    if (node && node.type === 'story') {
      node.asA = typeof asA === 'string' ? asA : '';
      node.iWant = typeof iWant === 'string' ? iWant : '';
      node.soThat = typeof soThat === 'string' ? soThat : '';
      node.criteria = Array.isArray(criteria) ? criteria.filter(c => typeof c === 'string') : [];
      touch(s);
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
      touch(s);
      io.to(`wbs:${roomId}`).emit('wbs:state', s);
      saveData('wbs.json', sessions.wbs);
    }
  });

  // --- Shared backlog (opt-in; the Story tool is local-only by default) ---
  // A backlog room is just a { stories: [...] } document keyed by room code.
  function emitBacklog(roomId) {
    const s = sessions.backlog[roomId];
    io.to(`backlog:${roomId}`).emit('backlog:state', { stories: s.stories });
  }

  socket.on('backlog:join', ({ roomId }, ack) => {
    if (typeof roomId !== 'string' || !roomId) return;
    socket.join(`backlog:${roomId}`);
    const existed = !!sessions.backlog[roomId];
    if (typeof ack === 'function') ack({ existed });
    if (!existed) {
      sessions.backlog[roomId] = { stories: [], createdAt: Date.now() };
    }
    touch(sessions.backlog[roomId]);
    socket.emit('backlog:state', { stories: sessions.backlog[roomId].stories });
    saveData('backlog.json', sessions.backlog);
  });

  // Merge stories by id: existing ids update in place (only non-empty
  // incoming fields overwrite), new ids append — mirrors mergeStoriesById.
  socket.on('backlog:upsert', ({ roomId, stories }) => {
    const s = sessions.backlog[roomId];
    if (!s || !Array.isArray(stories)) return;
    for (const raw of stories) {
      const story = sanitizeStory(raw);
      if (!story) continue;
      const idx = s.stories.findIndex(x => x.id === story.id);
      if (idx === -1) {
        s.stories.push(story);
      } else {
        const informative = Object.fromEntries(
          Object.entries(story).filter(([, v]) =>
            v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))
        );
        s.stories[idx] = { ...s.stories[idx], ...informative };
      }
    }
    touch(s);
    emitBacklog(roomId);
    saveData('backlog.json', sessions.backlog);
  });

  // Full replace — used for reordering and inline edits where fields may clear.
  socket.on('backlog:replace', ({ roomId, stories }) => {
    const s = sessions.backlog[roomId];
    if (!s || !Array.isArray(stories)) return;
    s.stories = stories.map(sanitizeStory).filter(Boolean);
    touch(s);
    emitBacklog(roomId);
    saveData('backlog.json', sessions.backlog);
  });

  socket.on('backlog:remove', ({ roomId, storyId }) => {
    const s = sessions.backlog[roomId];
    if (!s) return;
    s.stories = s.stories.filter(x => x.id !== storyId);
    touch(s);
    emitBacklog(roomId);
    saveData('backlog.json', sessions.backlog);
  });

  socket.on('backlog:clear', ({ roomId }) => {
    const s = sessions.backlog[roomId];
    if (!s) return;
    s.stories = [];
    touch(s);
    emitBacklog(roomId);
    saveData('backlog.json', sessions.backlog);
  });

  // Cross-device estimate sync: poker writes accepted points here by story id.
  socket.on('backlog:setPoints', ({ roomId, storyId, points }) => {
    const s = sessions.backlog[roomId];
    if (!s || isNaN(Number(points))) return;
    const story = s.stories.find(x => x.id === storyId);
    if (!story) return;
    story.points = Number(points);
    story.status = 'estimated';
    touch(s);
    emitBacklog(roomId);
    saveData('backlog.json', sessions.backlog);
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
