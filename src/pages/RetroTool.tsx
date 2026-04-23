import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { io, Socket } from 'socket.io-client';
import { COLORS } from '../GlobalStyles';
import ToolShell from '../components/ToolShell';
import { Tag, Btn, Label, Box } from '../components/Core';

const RetroContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Toolbar = styled.div`
  height: 52px;
  border-bottom: 1px solid ${COLORS.border};
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 32px;
  background: ${COLORS.surface};
`;

const ColumnsGrid = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0;
  overflow: hidden;
`;

const Column = styled.div<{ last?: boolean }>`
  border-right: ${props => props.last ? 'none' : `1px solid ${COLORS.border}`};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${COLORS.bg};
`;

const ColumnHeader = styled.div`
  padding: 24px 32px;
  border-bottom: 1px solid ${COLORS.border};
  display: flex;
  align-items: center;
  gap: 12px;
  background: ${COLORS.surface};
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

const VoteBtn = styled.div<{ color: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  
  &:hover span {
    color: ${props => props.color};
  }
`;

const AddCardBtn = styled.div`
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
    color: ${COLORS.primary};
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
`;

let socket: Socket;

const RetroTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    socket = io(window.location.origin);
    
    socket.on('retro:state', (newState) => {
      setSession(newState);
      if (newState.timer.isRunning) {
        setTimeLeft(newState.timer.remaining);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    let interval: any;
    if (timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timeLeft]);

  const handleJoin = () => {
    if (roomCode && username) {
      socket.emit('retro:join', { roomId: roomCode, username });
      setIsJoined(true);
    }
  };

  const handleStartNew = () => {
    if (username) {
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      setRoomCode(newCode);
      socket.emit('retro:join', { roomId: newCode, username });
      setIsJoined(true);
    } else {
      alert("Please enter a username first");
    }
  };

  const handleAddNote = (colKey: string) => {
    const text = prompt("Enter note text:");
    if (text) {
      socket.emit('retro:addCard', { roomId: roomCode, colKey, text, username });
    }
  };

  const handleVote = (colKey: string, cardId: string) => {
    socket.emit('retro:vote', { roomId: roomCode, colKey, cardId });
  };

  const startTimer = () => {
    const mins = prompt("Minutes for timer:", "5");
    if (mins) {
      socket.emit('retro:startTimer', { roomId: roomCode, duration: parseInt(mins) * 60 });
    }
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
            <Input placeholder="USERNAME" value={username} onChange={e => setUsername(e.target.value)} />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Btn primary onClick={handleStartNew} style={{ width: '100%', justifyContent: 'center', borderColor: COLORS.magenta, color: COLORS.magenta, background: 'rgba(255,0,170,0.08)', fontSize: 14, padding: '14px' }}>Start New Session +</Btn>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '8px 0' }}>
                <div style={{ flex: 1, height: 1, background: COLORS.border }} />
                <span className="wf-mono" style={{ fontSize: 10, color: COLORS.muted }}>OR JOIN EXISTING</span>
                <div style={{ flex: 1, height: 1, background: COLORS.border }} />
              </div>
              <Input placeholder="ROOM CODE" value={roomCode} onChange={e => setRoomCode(e.target.value)} style={{ width: '100%' }} />
              <Btn onClick={handleJoin} style={{ width: '100%', justifyContent: 'center', fontSize: 14, padding: '14px' }}>Join Session →</Btn>
            </div>
          </Box>
        </JoinOverlay>
      </ToolShell>
    );
  }

  if (!session) return <ToolShell toolName="Retro Board" toolColor={COLORS.magenta} activeNav="retro" onBack={onBack}>Loading...</ToolShell>;

  return (
    <ToolShell toolName="Retro Board" toolColor={COLORS.magenta} activeNav="retro" onBack={onBack}>
      <RetroContainer>
        <Toolbar>
          <span className="wf-mono" style={{ fontSize: 13, color: COLORS.magenta }}>Room: {roomCode}</span>
          <div style={{ flex: 1, height: 1, background: COLORS.border }} />
          {timeLeft > 0 && <Tag color={COLORS.yellow}>{formatTime(timeLeft)}</Tag>}
          <Btn onClick={startTimer} style={{ padding: '8px 24px' }}>timer</Btn>
          <Btn primary onClick={() => handleAddNote('wentWell')} style={{ borderColor: COLORS.magenta, color: COLORS.magenta, background: 'rgba(255,0,170,0.08)', padding: '8px 24px' }}>+ add note</Btn>
        </Toolbar>

        <ColumnsGrid>
          {(['wentWell', 'toImprove', 'actionItems'] as const).map((key, ci) => {
            const config = {
              wentWell: { title: 'Went Well', color: COLORS.lime },
              toImprove: { title: 'To Improve', color: COLORS.yellow },
              actionItems: { title: 'Action Items', color: COLORS.cyan }
            }[key];
            
            return (
              <Column key={key} last={ci === 2}>
                <ColumnHeader>
                  <ColumnDot color={config.color} />
                  <span className="wf-mono" style={{ fontSize: 14, color: config.color, flex: 1 }}>{config.title}</span>
                  <Label style={{ fontSize: 12 }}>{session.columns[key].length}</Label>
                </ColumnHeader>
                <CardList>
                  {session.columns[key].map((note: any) => (
                    <RetroCard key={note.id}>
                      <div className="wf-body" style={{ fontSize: 15, color: COLORS.primary, marginBottom: 8, lineHeight: 1.4 }}>{note.text}</div>
                      <VoteContainer>
                        <span className="wf-mono" style={{ fontSize: 11, color: COLORS.muted }}>by {note.owner}</span>
                        <VoteBtn color={config.color} onClick={() => handleVote(key, note.id)}>
                          <span style={{ fontSize: 14, color: config.color }}>▲</span>
                          <span className="wf-mono" style={{ fontSize: 13, color: note.votes > 0 ? config.color : COLORS.muted }}>{note.votes}</span>
                        </VoteBtn>
                      </VoteContainer>
                    </RetroCard>
                  ))}
                  <AddCardBtn onClick={() => handleAddNote(key)}>
                    <span className="wf-mono" style={{ fontSize: 13, color: COLORS.muted }}>+ add card</span>
                  </AddCardBtn>
                </CardList>
              </Column>
            );
          })}
        </ColumnsGrid>
      </RetroContainer>
    </ToolShell>
  );
};

export default RetroTool;
