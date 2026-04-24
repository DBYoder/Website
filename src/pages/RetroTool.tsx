import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { io, Socket } from 'socket.io-client';
import { COLORS } from '../GlobalStyles';
import ToolShell from '../components/ToolShell';
import { Tag, Btn, Label, Box } from '../components/Core';

// --- Types ---
interface RetroCard {
  id: string;
  text: string;
  votes: number;
  owner: string;
}

type ColKey = 'wentWell' | 'toImprove' | 'actionItems';

interface RetroTimer {
  isRunning: boolean;
  durationSeconds: number;
  startedAt: number | null;
}

interface RetroSession {
  columns: Record<ColKey, RetroCard[]>;
  timer: RetroTimer;
}

// --- Styles ---
const RetroContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  @media (max-width: 768px) { overflow: visible; }
`;

const Toolbar = styled.div`
  height: 52px;
  border-bottom: 1px solid ${COLORS.border};
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 32px;
  background: ${COLORS.surface};
  flex-shrink: 0;
  @media (max-width: 768px) {
    padding: 0 12px;
    gap: 8px;
    flex-wrap: wrap;
    height: auto;
    min-height: 52px;
    padding-top: 8px;
    padding-bottom: 8px;
  }
`;

const ColumnsGrid = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0;
  overflow: hidden;
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    overflow: visible;
    flex: none;
  }
`;

const Column = styled.div<{ last?: boolean }>`
  border-right: ${props => props.last ? 'none' : `1px solid ${COLORS.border}`};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${COLORS.bg};
  @media (max-width: 768px) {
    border-right: none;
    border-bottom: 1px solid ${COLORS.border};
    overflow: visible;
    min-height: 300px;
  }
`;

const Input = styled.input`
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
  color: ${COLORS.primary};
  padding: 12px 16px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 18px;
  width: 320px;
  &:focus {
    outline: none;
    border-color: ${COLORS.magenta};
  }
  @media (max-width: 768px) { width: 100%; font-size: 16px; }
`;

const ColumnHeader = styled.div`
  padding: 24px 32px;
  border-bottom: 1px solid ${COLORS.border};
  display: flex;
  align-items: center;
  gap: 12px;
  background: ${COLORS.surface};
  flex-shrink: 0;
`;

const ColumnDot = styled.div<{ color: string }>`
  width: 10px;
  height: 10px;
  background: ${props => props.color};
  box-shadow: 0 0 8px ${props => props.color};
`;

const CardList = styled.div`
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const RetroCard = styled.div`
  background: ${COLORS.card};
  border: 1px solid ${COLORS.border};
  padding: 20px 24px;
  position: relative;
  transition: all 0.2s;

  &:hover {
    border-color: ${COLORS.borderBright};
    transform: translateX(4px);
  }
`;

const VoteContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const VoteBtn = styled.button<{ color: string }>`
  appearance: none;
  -webkit-appearance: none;
  background: none;
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px;

  &:hover span {
    color: ${props => props.color};
  }
`;

const AddCardArea = styled.div`
  padding: 0 24px 24px;
`;

const AddCardBtn = styled.button`
  appearance: none;
  -webkit-appearance: none;
  background: none;
  width: 100%;
  border: 1px dashed ${COLORS.border};
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${COLORS.borderBright};
    background: rgba(255, 255, 255, 0.02);
  }
`;

const CardInput = styled.textarea`
  width: 100%;
  height: 80px;
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
  padding: 12px;
  color: ${COLORS.primary};
  font-family: 'Share Tech Mono', monospace;
  font-size: 13px;
  resize: none;
  line-height: 1.5;

  &:focus {
    outline: none;
    border-color: ${COLORS.magenta};
  }
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

const TimerInput = styled.input`
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
  color: ${COLORS.primary};
  padding: 6px 10px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 14px;
  width: 64px;
  text-align: center;

  &:focus {
    outline: none;
    border-color: ${COLORS.magenta};
  }
`;

const ErrorText = styled.span`
  font-family: 'Share Tech Mono', monospace;
  font-size: 11px;
  color: ${COLORS.magenta};
  letter-spacing: 0.1em;
`;

const COL_CONFIG: Record<ColKey, { title: string; color: string }> = {
  wentWell: { title: 'Went Well', color: COLORS.lime },
  toImprove: { title: 'To Improve', color: COLORS.yellow },
  actionItems: { title: 'Action Items', color: COLORS.cyan },
};

type ConnectionStatus = 'connecting' | 'connected' | 'error';

const RetroTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const socketRef = useRef<Socket | null>(null);
  const roomCodeRef = useRef('');
  const wasCountingDownRef = useRef(false);

  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [session, setSession] = useState<RetroSession | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [joinError, setJoinError] = useState('');

  // Inline card input state
  const [inputCol, setInputCol] = useState<ColKey | null>(null);
  const [inputText, setInputText] = useState('');
  const [inputError, setInputError] = useState('');

  // Timer input state
  const [showTimerInput, setShowTimerInput] = useState(false);
  const [timerMins, setTimerMins] = useState('5');
  const [timerError, setTimerError] = useState('');

  // Sync roomCode to ref so effects don't need it as a dependency
  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);

  useEffect(() => {
    const socket = io(window.location.origin);
    socketRef.current = socket;

    socket.on('connect', () => setConnectionStatus('connected'));
    socket.on('disconnect', () => setConnectionStatus('connecting'));
    socket.on('connect_error', () => setConnectionStatus('error'));

    socket.on('retro:state', (newState: RetroSession) => {
      setSession(newState);
      if (newState.timer.isRunning && newState.timer.startedAt !== null) {
        const elapsed = Math.floor((Date.now() - newState.timer.startedAt) / 1000);
        const remaining = Math.max(0, newState.timer.durationSeconds - elapsed);
        setTimeLeft(remaining);
      } else if (!newState.timer.isRunning) {
        setTimeLeft(0);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Client-side countdown; emits stopTimer when it hits zero
  useEffect(() => {
    if (timeLeft <= 0) {
      if (wasCountingDownRef.current) {
        wasCountingDownRef.current = false;
        socketRef.current?.emit('retro:stopTimer', { roomId: roomCodeRef.current });
      }
      return;
    }
    wasCountingDownRef.current = true;
    const id = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  const handleJoin = () => {
    const trimRoom = roomCode.trim().toUpperCase();
    const trimUser = username.trim();
    if (!trimUser) { setJoinError('Username is required'); return; }
    if (!trimRoom) { setJoinError('Room code is required'); return; }
    setJoinError('');
    setRoomCode(trimRoom);
    socketRef.current?.emit('retro:join', { roomId: trimRoom, username: trimUser });
    setIsJoined(true);
  };

  const handleStartNew = () => {
    const trimUser = username.trim();
    if (!trimUser) { setJoinError('Username is required'); return; }
    setJoinError('');
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(newCode);
    socketRef.current?.emit('retro:join', { roomId: newCode, username: trimUser });
    setIsJoined(true);
  };

  const handleSubmitNote = (col: ColKey) => {
    const text = inputText.trim();
    if (!text) { setInputError('Note cannot be empty'); return; }
    setInputError('');
    socketRef.current?.emit('retro:addCard', { roomId: roomCodeRef.current, colKey: col, text, username });
    setInputCol(null);
    setInputText('');
  };

  const handleVote = (colKey: ColKey, cardId: string) => {
    socketRef.current?.emit('retro:vote', { roomId: roomCodeRef.current, colKey, cardId });
  };

  const handleStartTimer = () => {
    const mins = parseInt(timerMins, 10);
    if (isNaN(mins) || mins < 1 || mins > 60) {
      setTimerError('Enter a value between 1 and 60');
      return;
    }
    setTimerError('');
    setShowTimerInput(false);
    socketRef.current?.emit('retro:startTimer', { roomId: roomCodeRef.current, durationSeconds: mins * 60 });
  };

  const handleStopTimer = () => {
    socketRef.current?.emit('retro:stopTimer', { roomId: roomCodeRef.current });
    setTimeLeft(0);
  };

  const handleExport = () => {
    if (!session) return;
    const date = new Date().toLocaleDateString();
    const formatCards = (cards: RetroCard[]) =>
      cards.length > 0
        ? cards.map(c => `  • ${c.text} (by ${c.owner}, ${c.votes} vote${c.votes !== 1 ? 's' : ''})`).join('\n')
        : '  (none)';
    const content = [
      'RETROSPECTIVE EXPORT',
      `Date: ${date}  |  Room: ${roomCodeRef.current}`,
      '',
      '=== WENT WELL ===',
      formatCards(session.columns.wentWell),
      '',
      '=== TO IMPROVE ===',
      formatCards(session.columns.toImprove),
      '',
      '=== ACTION ITEMS ===',
      formatCards(session.columns.actionItems),
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retro-${roomCodeRef.current}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isJoined) {
    return (
      <ToolShell toolName="Retro Board" toolColor={COLORS.magenta} activeNav="retro" onBack={onBack}>
        <JoinOverlay>
          <Box w={400} style={{ padding: 48, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Label color={COLORS.magenta} size={16}>retro session</Label>
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
                style={{ width: '100%', justifyContent: 'center', borderColor: COLORS.magenta, color: COLORS.magenta, background: 'rgba(255,0,170,0.08)', fontSize: 14, padding: '14px' }}
                aria-label="Start new retro session"
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
                style={{ width: '100%' }}
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
      <ToolShell toolName="Retro Board" toolColor={COLORS.magenta} activeNav="retro" onBack={onBack}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="wf-mono" style={{ color: COLORS.muted }}>connecting...</span>
        </div>
      </ToolShell>
    );
  }

  return (
    <ToolShell toolName="Retro Board" toolColor={COLORS.magenta} activeNav="retro" onBack={onBack}>
      <RetroContainer>
        <Toolbar>
          <span className="wf-mono" style={{ fontSize: 13, color: COLORS.magenta }}>Room: {roomCode}</span>
          <div style={{ flex: 1, height: 1, background: COLORS.border }} />

          {connectionStatus !== 'connected' && (
            <Tag color={connectionStatus === 'error' ? COLORS.magenta : COLORS.yellow} role="status">
              {connectionStatus === 'error' ? 'offline' : 'reconnecting...'}
            </Tag>
          )}

          {timeLeft > 0 && (
            <>
              <Tag color={COLORS.yellow} role="timer" aria-label={`${formatTime(timeLeft)} remaining`}>
                {formatTime(timeLeft)}
              </Tag>
              <Btn onClick={handleStopTimer} aria-label="Stop timer" style={{ padding: '6px 16px', fontSize: 11 }}>
                stop
              </Btn>
            </>
          )}

          {showTimerInput ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TimerInput
                type="number"
                value={timerMins}
                onChange={e => setTimerMins(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStartTimer()}
                min="1"
                max="60"
                aria-label="Timer duration in minutes"
                autoFocus
              />
              <span className="wf-mono" style={{ fontSize: 11, color: COLORS.muted }}>min</span>
              <Btn primary onClick={handleStartTimer} style={{ padding: '6px 16px', fontSize: 11, borderColor: COLORS.yellow, color: COLORS.yellow, background: 'rgba(255,238,0,0.08)' }}>
                start
              </Btn>
              <Btn onClick={() => { setShowTimerInput(false); setTimerError(''); }} style={{ padding: '6px 12px', fontSize: 11 }}>
                ✕
              </Btn>
              {timerError && <ErrorText role="alert">{timerError}</ErrorText>}
            </div>
          ) : timeLeft <= 0 ? (
            <Btn onClick={() => setShowTimerInput(true)} style={{ padding: '8px 24px' }} aria-label="Set timer">
              timer
            </Btn>
          ) : null}

          <Btn onClick={handleExport} style={{ padding: '8px 20px' }} aria-label="Export retro notes">
            export ↓
          </Btn>
        </Toolbar>

        <ColumnsGrid role="list" aria-label="Retrospective columns">
          {(['wentWell', 'toImprove', 'actionItems'] as ColKey[]).map((key, ci) => {
            const config = COL_CONFIG[key];

            return (
              <Column key={key} last={ci === 2} role="listitem" aria-label={config.title}>
                <ColumnHeader>
                  <ColumnDot color={config.color} aria-hidden="true" />
                  <span className="wf-mono" style={{ fontSize: 14, color: config.color, flex: 1 }}>{config.title}</span>
                  <Label style={{ fontSize: 12 }} aria-label={`${session.columns[key].length} cards`}>
                    {session.columns[key].length}
                  </Label>
                </ColumnHeader>

                <CardList>
                  {session.columns[key].map((note) => (
                    <RetroCard key={note.id}>
                      <div className="wf-body" style={{ fontSize: 15, color: COLORS.primary, lineHeight: 1.4 }}>
                        {note.text}
                      </div>
                      <VoteContainer>
                        <span className="wf-mono" style={{ fontSize: 11, color: COLORS.muted }}>by {note.owner}</span>
                        <VoteBtn
                          color={config.color}
                          onClick={() => handleVote(key, note.id)}
                          aria-label={`Upvote this card (${note.votes} vote${note.votes !== 1 ? 's' : ''})`}
                        >
                          <span style={{ fontSize: 14, color: config.color }} aria-hidden="true">▲</span>
                          <span className="wf-mono" style={{ fontSize: 13, color: note.votes > 0 ? config.color : COLORS.muted }}>
                            {note.votes}
                          </span>
                        </VoteBtn>
                      </VoteContainer>
                    </RetroCard>
                  ))}
                </CardList>

                <AddCardArea>
                  {inputCol === key ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <CardInput
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitNote(key); }
                          if (e.key === 'Escape') { setInputCol(null); setInputText(''); setInputError(''); }
                        }}
                        placeholder="What's on your mind... (Enter to submit, Shift+Enter for newline)"
                        aria-label={`Add note to ${config.title}`}
                        autoFocus
                      />
                      {inputError && <ErrorText role="alert">{inputError}</ErrorText>}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Btn
                          primary
                          onClick={() => handleSubmitNote(key)}
                          style={{ flex: 1, justifyContent: 'center', borderColor: config.color, color: config.color, background: 'transparent', fontSize: 11, padding: '8px' }}
                        >
                          add
                        </Btn>
                        <Btn
                          onClick={() => { setInputCol(null); setInputText(''); setInputError(''); }}
                          style={{ padding: '8px 14px', fontSize: 11 }}
                          aria-label="Cancel adding note"
                        >
                          ✕
                        </Btn>
                      </div>
                    </div>
                  ) : (
                    <AddCardBtn
                      onClick={() => { setInputCol(key); setInputText(''); setInputError(''); }}
                      aria-label={`Add card to ${config.title}`}
                    >
                      <span className="wf-mono" style={{ fontSize: 13, color: COLORS.muted }}>+ add card</span>
                    </AddCardBtn>
                  )}
                </AddCardArea>
              </Column>
            );
          })}
        </ColumnsGrid>
      </RetroContainer>
    </ToolShell>
  );
};

export default RetroTool;
