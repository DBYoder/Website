import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { io, Socket } from 'socket.io-client';
import { useLocation } from 'react-router-dom';
import { COLORS } from '../GlobalStyles';
import ToolShell from '../components/ToolShell';
import { Label, Tag, Box, Btn, CornerBracket } from '../components/Core';

// --- Types ---
interface PokerParticipant {
  username: string;
  vote: string | null;
  voted: boolean;
}

interface Story {
  id: string;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  criteria: string[];
  points?: string;
  epic?: string;
  feature?: string;
}

interface PokerSession {
  participants: Record<string, PokerParticipant>;
  gameState: 'voting' | 'revealed';
  currentStory: Story | null;
  backlog: Story[];
}

type ConnectionStatus = 'connecting' | 'connected' | 'error';

// --- CSV helpers ---
const CSV_HEADERS = ['title', 'asA', 'iWant', 'soThat', 'points', 'criteria'];

function escapeCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function parseCSVRow(line: string): string[] {
  const fields: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      fields.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function parseStoriesFromCSV(text: string): Story[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = parseCSVRow(lines[0]).map(h => h.toLowerCase().trim().replace(/\s+/g, ''));
  const idx = (key: string) => header.indexOf(key);
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const row = parseCSVRow(line);
    const get = (key: string, fallback = '') => { const i = idx(key); return i >= 0 ? (row[i] ?? fallback) : fallback; };
    const criteriaStr = get('criteria');
    return {
      id: Math.random().toString(36).substr(2, 9),
      title: get('title'),
      asA: get('asa'),
      iWant: get('iwant'),
      soThat: get('sothat'),
      points: get('points') || undefined,
      criteria: criteriaStr ? criteriaStr.split('|').filter(Boolean) : [],
    };
  }).filter(s => s.title || s.asA);
}

function storiesToCSV(stories: Story[]): string {
  const rows = [
    CSV_HEADERS.join(','),
    ...stories.map(s => [
      s.title, s.asA, s.iWant, s.soThat, s.points ?? '', (s.criteria ?? []).join('|'),
    ].map(escapeCSV).join(',')),
  ];
  return rows.join('\n');
}

// --- Styles ---
const PokerContainer = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
  @media (max-width: 768px) {
    flex-direction: column;
    overflow: visible;
  }
`;

const LeftPanel = styled.div`
  width: 320px;
  border-right: 1px solid ${COLORS.border};
  display: flex;
  flex-direction: column;
  background: ${COLORS.surface};
  @media (max-width: 768px) {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid ${COLORS.border};
  }
`;

const ContentPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 40px 48px;
  overflow-y: auto;
  @media (max-width: 768px) {
    padding: 20px 16px;
    overflow: visible;
  }
`;

const CardDeck = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 32px;
`;

const Card = styled.button<{ active?: boolean; color: string }>`
  appearance: none;
  -webkit-appearance: none;
  width: 80px;
  height: 110px;
  @media (max-width: 768px) { width: 60px; height: 84px; }
  background: ${props => props.active ? `rgba(${parseInt(props.color.slice(1,3), 16)}, ${parseInt(props.color.slice(3,5), 16)}, ${parseInt(props.color.slice(5,7), 16)}, 0.12)` : COLORS.card};
  border: 1px solid ${props => props.active ? props.color : COLORS.border};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  box-shadow: ${props => props.active ? `0 0 20px rgba(${parseInt(props.color.slice(1,3), 16)}, ${parseInt(props.color.slice(3,5), 16)}, ${parseInt(props.color.slice(5,7), 16)}, 0.3)` : 'none'};
  position: relative;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${props => props.color};
    transform: translateY(-4px);
  }
`;

const ParticipantItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
`;

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const BacklogItem = styled.button<{ active?: boolean }>`
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  text-align: left;
  padding: 10px 14px;
  background: ${props => props.active ? 'rgba(0, 245, 255, 0.08)' : 'transparent'};
  border: 1px solid ${props => props.active ? COLORS.cyan : 'transparent'};
  cursor: pointer;
  margin-bottom: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:hover {
    background: rgba(0, 245, 255, 0.04);
  }
`;

const ConsensusBox = styled.div`
  background: ${COLORS.card};
  border: 1px solid ${COLORS.cyan};
  padding: 32px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 24px;
`;

const StatItem = styled.div`
  padding: 20px;
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
  text-align: center;
`;

const JoinOverlay = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: ${COLORS.bg};
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 32px;
  @media (max-width: 768px) {
    padding: 24px 16px;
    align-items: stretch;
    overflow-y: auto;
    justify-content: flex-start;
    padding-top: 48px;
  }
`;

const Input = styled.input`
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
  color: ${COLORS.primary};
  padding: 12px 16px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 18px;
  width: 100%;

  &:focus {
    outline: none;
    border-color: ${COLORS.cyan};
  }
`;

const ErrorText = styled.span`
  font-family: 'Share Tech Mono', monospace;
  font-size: 11px;
  color: ${COLORS.magenta};
  letter-spacing: 0.1em;
`;

const PokerTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const location = useLocation();
  const socketRef = useRef<Socket | null>(null);
  const initialSearchRef = useRef(location.search);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [session, setSession] = useState<PokerSession | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [customPoints, setCustomPoints] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    const socket = io(window.location.origin);
    socketRef.current = socket;

    socket.on('connect', () => setConnectionStatus('connected'));
    socket.on('disconnect', () => setConnectionStatus('connecting'));
    socket.on('connect_error', () => setConnectionStatus('error'));
    socket.on('poker:state', (newState: PokerSession) => setSession(newState));

    // Read URL params once on initial mount
    const params = new URLSearchParams(initialSearchRef.current);
    const urlRoom = params.get('room');
    const urlUser = params.get('user');

    if (urlRoom && urlUser) {
      const room = urlRoom.toUpperCase();
      setRoomCode(room);
      setUsername(urlUser);
      socket.emit('poker:join', { roomId: room, username: urlUser });
      setIsJoined(true);
      const url = new URL(window.location.href);
      url.searchParams.set('room', room);
      window.history.replaceState(null, '', url.toString());
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateRoomUrl = (room: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', room);
    window.history.replaceState(null, '', url.toString());
  };

  const handleJoin = () => {
    const trimRoom = roomCode.trim().toUpperCase();
    const trimUser = username.trim();
    if (!trimUser) { setJoinError('Username is required'); return; }
    if (!trimRoom || !/^[A-Z0-9]+$/.test(trimRoom)) { setJoinError('Enter a valid room code'); return; }
    setJoinError('');
    setRoomCode(trimRoom);
    socketRef.current?.emit('poker:join', { roomId: trimRoom, username: trimUser });
    setIsJoined(true);
    updateRoomUrl(trimRoom);
  };

  const handleStartNew = () => {
    const trimUser = username.trim();
    if (!trimUser) { setJoinError('Username is required'); return; }
    setJoinError('');
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(newCode);
    socketRef.current?.emit('poker:join', { roomId: newCode, username: trimUser });
    setIsJoined(true);
    updateRoomUrl(newCode);
  };

  const handleVote = (val: string) => {
    setSelectedCard(val);
    socketRef.current?.emit('poker:vote', { roomId: roomCode, vote: val });
  };

  const handleReveal = () => {
    socketRef.current?.emit('poker:reveal', roomCode);
  };

  const handleComplete = (points: string) => {
    if (!session?.currentStory) return;
    socketRef.current?.emit('poker:completeStory', {
      roomId: roomCode,
      storyId: session.currentStory.id,
      points
    });
    setSelectedCard(null);
    setCustomPoints('');
  };

  const selectStory = (story: Story) => {
    socketRef.current?.emit('poker:selectStory', { roomId: roomCode, story });
  };

  const handleExport = () => {
    if (!session) return;
    const csv = storiesToCSV(session.backlog);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poker-${roomCode}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const stories = parseStoriesFromCSV(text);
      if (stories.length > 0) {
        socketRef.current?.emit('poker:updateBacklog', { roomId: roomCode, backlog: stories });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!isJoined) {
    return (
      <ToolShell toolName="Planning Poker" toolColor={COLORS.cyan} activeNav="poker" onBack={onBack}>
        <JoinOverlay>
          <Box w={400} style={{ padding: 48, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Label color={COLORS.cyan} size={16}>poker session</Label>
            <Input
              placeholder="USERNAME"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStartNew()}
              aria-label="Username"
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Btn
                primary
                onClick={handleStartNew}
                style={{ width: '100%', justifyContent: 'center', fontSize: 14, padding: '14px' }}
                aria-label="Start new poker session"
              >
                Start New Session +
              </Btn>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '8px 0' }}>
                <div style={{ flex: 1, height: 1, background: COLORS.border }} />
                <span className="wf-mono" style={{ fontSize: 10, color: COLORS.muted }}>OR JOIN EXISTING</span>
                <div style={{ flex: 1, height: 1, background: COLORS.border }} />
              </div>
              <Input
                placeholder="ROOM CODE"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                aria-label="Room code"
              />
              <Btn
                onClick={handleJoin}
                style={{ width: '100%', justifyContent: 'center', fontSize: 14, padding: '14px' }}
                aria-label="Join existing session"
              >
                Join Session →
              </Btn>
            </div>

            {joinError && <ErrorText role="alert">{joinError}</ErrorText>}
            {connectionStatus === 'error' && (
              <ErrorText role="alert">Cannot connect to server. Please refresh.</ErrorText>
            )}
          </Box>
        </JoinOverlay>
      </ToolShell>
    );
  }

  if (!session) {
    return (
      <ToolShell toolName="Planning Poker" toolColor={COLORS.cyan} activeNav="poker" onBack={onBack}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="wf-mono" style={{ color: COLORS.muted }}>connecting...</span>
        </div>
      </ToolShell>
    );
  }

  const participants = Object.values(session.participants);
  const cards = ['1', '2', '3', '5', '8', '13', '21', '?', '☕'];
  const votedCount = participants.filter(p => p.voted).length;

  const numericVotes = participants
    .map(p => parseFloat(p.vote ?? ''))
    .filter(v => !isNaN(v));

  const average = numericVotes.length > 0
    ? (numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length).toFixed(1)
    : '-';

  const voteCounts: Record<string, number> = {};
  numericVotes.forEach(v => { voteCounts[v] = (voteCounts[v] || 0) + 1; });
  let consensus = '-';
  let maxCount = 0;
  for (const v in voteCounts) {
    if (voteCounts[v] > maxCount) {
      maxCount = voteCounts[v];
      consensus = v;
    }
  }

  return (
    <ToolShell toolName="Planning Poker" toolColor={COLORS.cyan} activeNav="poker" onBack={onBack}>
      <PokerContainer>
        <LeftPanel>
          <div style={{ padding: '24px', borderBottom: `1px solid ${COLORS.border}` }}>
            <Label color={COLORS.cyan} style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
              session: {roomCode}
            </Label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Tag color={session.gameState === 'voting' ? COLORS.lime : COLORS.magenta}>
                {session.gameState.toUpperCase()}
              </Tag>
              {session.gameState === 'voting' && (
                <span className="wf-mono" style={{ fontSize: 11, color: COLORS.muted }}>
                  {votedCount}/{participants.length} voted
                </span>
              )}
              {connectionStatus !== 'connected' && (
                <Tag color={connectionStatus === 'error' ? COLORS.magenta : COLORS.yellow} role="status">
                  {connectionStatus === 'error' ? 'offline' : '...'}
                </Tag>
              )}
            </div>
          </div>

          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Label>backlog</Label>
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn onClick={() => fileInputRef.current?.click()} style={{ fontSize: 10, padding: '4px 10px' }} aria-label="Import stories from CSV">
                  import ↑
                </Btn>
                {session.backlog.some(s => s.points) && (
                  <Btn onClick={handleExport} style={{ fontSize: 10, padding: '4px 10px' }} aria-label="Export story points as CSV">
                    export ↓
                  </Btn>
                )}
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} aria-hidden="true" />
            <div style={{ maxHeight: 200, overflowY: 'auto' }} role="list" aria-label="Story backlog">
              {session.backlog.length === 0 ? (
                <div className="wf-mono" style={{ fontSize: 11, color: COLORS.muted }}>No stories pushed yet.</div>
              ) : (
                session.backlog.map((story) => (
                  <BacklogItem
                    key={story.id}
                    active={session.currentStory?.id === story.id}
                    onClick={() => selectStory(story)}
                    role="listitem"
                    aria-label={`Select story: ${story.title}${story.points ? ` (${story.points} pts)` : ''}`}
                    aria-pressed={session.currentStory?.id === story.id}
                  >
                    <div className="wf-mono" style={{ fontSize: 11, color: session.currentStory?.id === story.id ? COLORS.cyan : COLORS.secondary, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {story.title}
                    </div>
                    {story.points && <Tag color={COLORS.lime}>{story.points}</Tag>}
                    <button
                      onClick={e => { e.stopPropagation(); socketRef.current?.emit('poker:updateBacklog', { roomId: roomCode, backlog: session.backlog.filter(s => s.id !== story.id) }); }}
                      aria-label={`Remove story: ${story.title}`}
                      style={{ appearance: 'none', background: 'none', border: 'none', color: COLORS.muted, cursor: 'pointer', fontSize: 12, padding: '0 2px', flexShrink: 0 }}
                    >✕</button>
                  </BacklogItem>
                ))
              )}
            </div>
          </div>

          <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
            <Label style={{ display: 'block', marginBottom: 16 }}>
              {session.gameState === 'voting' ? 'participants' : 'votes'}
            </Label>
            {participants.map((p, i) => (
              <ParticipantItem key={i} aria-label={`${p.username}${p.voted ? ' — voted' : ' — waiting'}`}>
                <Avatar aria-hidden="true">
                  <span className="wf-mono" style={{ fontSize: 14, color: COLORS.secondary }}>
                    {p.username[0].toUpperCase()}
                  </span>
                </Avatar>
                <span className="wf-mono" style={{ fontSize: 13, color: COLORS.secondary, flex: 1 }}>{p.username}</span>
                {session.gameState === 'voting' ? (
                  p.voted ? (
                    <div style={{ width: 20, height: 20, background: COLORS.elevated, border: `1px solid ${COLORS.cyan}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 12, color: COLORS.cyan }} aria-hidden="true">✓</span>
                    </div>
                  ) : (
                    <div style={{ width: 20, height: 20, background: COLORS.elevated, border: `1px dashed ${COLORS.muted}` }} aria-hidden="true" />
                  )
                ) : (
                  <span className="wf-retro" style={{ fontSize: 24, color: COLORS.cyan }} aria-label={`Vote: ${p.vote ?? '?'}`}>
                    {p.vote || '?'}
                  </span>
                )}
              </ParticipantItem>
            ))}
          </div>
        </LeftPanel>

        <ContentPanel>
          <div style={{ marginBottom: 32 }}>
            <Label color={COLORS.cyan} size={14}>current story</Label>
            <div className="wf-title" style={{ fontSize: 24, color: COLORS.primary, marginTop: 8 }}>
              {session.currentStory ? session.currentStory.title : 'No story selected'}
            </div>
            {session.currentStory && (
              <div style={{ marginTop: 12, padding: 24, background: 'rgba(255,255,255,0.03)', border: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(session.currentStory.epic || session.currentStory.feature) && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 12, borderBottom: `1px solid ${COLORS.border}` }}>
                    {session.currentStory.epic && <span className="wf-mono" style={{ fontSize: 10, color: COLORS.magenta, border: `1px solid ${COLORS.magenta}`, padding: '1px 6px', letterSpacing: '0.1em' }}>{session.currentStory.epic}</span>}
                    {session.currentStory.feature && <span className="wf-mono" style={{ fontSize: 10, color: COLORS.cyan, border: `1px solid ${COLORS.cyan}`, padding: '1px 6px', letterSpacing: '0.1em' }}>{session.currentStory.feature}</span>}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span className="wf-mono" style={{ color: COLORS.cyan, fontSize: 13, minWidth: 80 }}>AS A</span>
                  <span className="wf-body" style={{ fontSize: 16, color: COLORS.primary }}>{session.currentStory.asA}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span className="wf-mono" style={{ color: COLORS.cyan, fontSize: 13, minWidth: 80 }}>I WANT</span>
                  <span className="wf-body" style={{ fontSize: 16, color: COLORS.primary }}>{session.currentStory.iWant}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span className="wf-mono" style={{ color: COLORS.cyan, fontSize: 13, minWidth: 80 }}>SO THAT</span>
                  <span className="wf-body" style={{ fontSize: 16, color: COLORS.primary }}>{session.currentStory.soThat}</span>
                </div>

                {session.currentStory.criteria && session.currentStory.criteria.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.border}` }}>
                    <Label style={{ display: 'block', marginBottom: 12 }}>Acceptance Criteria</Label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {session.currentStory.criteria.map((c, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, fontSize: 14 }}>
                          <span style={{ color: COLORS.cyan }} aria-hidden="true">•</span>
                          <span className="wf-body">{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {session.gameState === 'voting' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                <Label color={COLORS.cyan} size={14}>select your estimate</Label>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${COLORS.border}, transparent)` }} />
              </div>

              <CardDeck role="group" aria-label="Voting cards">
                {cards.map((val) => (
                  <Card
                    key={val}
                    active={selectedCard === val}
                    color={COLORS.cyan}
                    onClick={() => handleVote(val)}
                    aria-label={`Vote ${val}`}
                    aria-pressed={selectedCard === val}
                  >
                    <span className="wf-title" style={{ fontSize: selectedCard === val ? 36 : 28, color: selectedCard === val ? COLORS.cyan : COLORS.secondary }}>
                      {val}
                    </span>
                    {selectedCard === val && <CornerBracket color={COLORS.cyan} style={{ top: 0, left: 0 }} size={12} />}
                  </Card>
                ))}
              </CardDeck>

              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <Btn primary onClick={handleReveal} style={{ padding: '16px 40px', fontSize: 14 }} aria-label="Reveal all votes">
                  reveal votes →
                </Btn>
              </div>
            </>
          ) : (
            <ConsensusBox>
              <CornerBracket color={COLORS.cyan} style={{ top: 0, left: 0 }} size={16} />
              <Label color={COLORS.cyan} size={14}>voting results</Label>

              <StatsGrid>
                <StatItem>
                  <Label style={{ display: 'block', marginBottom: 8 }}>Average</Label>
                  <div className="wf-retro" style={{ fontSize: 32, color: COLORS.primary }} aria-label={`Average: ${average}`}>{average}</div>
                </StatItem>
                <StatItem>
                  <Label style={{ display: 'block', marginBottom: 8 }}>Consensus</Label>
                  <div className="wf-retro" style={{ fontSize: 32, color: COLORS.cyan }} aria-label={`Consensus: ${consensus}`}>{consensus}</div>
                </StatItem>
                <StatItem>
                  <Label style={{ display: 'block', marginBottom: 8 }}>Voted</Label>
                  <div className="wf-retro" style={{ fontSize: 32, color: COLORS.primary }} aria-label={`${numericVotes.length} numeric votes`}>{numericVotes.length}</div>
                </StatItem>
              </StatsGrid>

              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <Label style={{ display: 'block', marginBottom: 8 }}>Accept Consensus ({consensus})</Label>
                  <Btn
                    primary
                    onClick={() => handleComplete(consensus)}
                    style={{ width: '100%', justifyContent: 'center', padding: '16px' }}
                    aria-label={`Accept consensus of ${consensus} points`}
                  >
                    Accept {consensus} pts
                  </Btn>
                </div>
                <div style={{ flex: 1 }}>
                  <Label style={{ display: 'block', marginBottom: 8 }}>Custom Value</Label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Input
                      placeholder="PTS"
                      value={customPoints}
                      onChange={e => setCustomPoints(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleComplete(customPoints)}
                      style={{ width: 80, padding: '12px' }}
                      aria-label="Custom story points"
                    />
                    <Btn
                      onClick={() => handleComplete(customPoints)}
                      style={{ flex: 1, justifyContent: 'center' }}
                      aria-label="Set custom points"
                    >
                      Set Points
                    </Btn>
                  </div>
                </div>
              </div>
            </ConsensusBox>
          )}
        </ContentPanel>
      </PokerContainer>
    </ToolShell>
  );
};

export default PokerTool;
