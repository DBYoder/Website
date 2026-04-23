import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { io, Socket } from 'socket.io-client';
import { COLORS } from '../GlobalStyles';
import ToolShell from '../components/ToolShell';
import { Label, Tag, Box, Btn, CornerBracket } from '../components/Core';

const PokerContainer = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

const LeftPanel = styled.div`
  width: 280px;
  border-right: 1px solid ${COLORS.border};
  display: flex;
  flex-direction: column;
  background: ${COLORS.surface};
`;

const ContentPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 40px 48px;
`;

const CardDeck = styled.div`
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 40px;
`;

const Card = styled.div<{ active?: boolean; color: string }>`
  width: 80px;
  height: 110px;
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
  
  &:hover {
    border-color: ${COLORS.border};
  }
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

const ConsensusBox = styled.div`
  flex: 1;
  background: ${COLORS.card};
  border: 1px solid ${COLORS.cyan};
  padding: 32px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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
    border-color: ${COLORS.cyan};
  }
`;

let socket: Socket;

const PokerTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  useEffect(() => {
    socket = io(window.location.origin);
    
    socket.on('poker:state', (newState) => {
      setSession(newState);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleJoin = () => {
    if (roomCode && username) {
      socket.emit('poker:join', { roomId: roomCode, username });
      setIsJoined(true);
    }
  };

  const handleStartNew = () => {
    if (username) {
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      setRoomCode(newCode);
      socket.emit('poker:join', { roomId: newCode, username });
      setIsJoined(true);
    } else {
      alert("Please enter a username first");
    }
  };

  const handleVote = (val: string) => {
    setSelectedCard(val);
    socket.emit('poker:vote', { roomId: roomCode, vote: val });
  };

  const handleReveal = () => {
    socket.emit('poker:reveal', roomCode);
  };

  const handleReset = () => {
    setSelectedCard(null);
    socket.emit('poker:reset', roomCode);
  };

  if (!isJoined) {
    return (
      <ToolShell toolName="Planning Poker" toolColor={COLORS.cyan} activeNav="poker" onBack={onBack}>
        <JoinOverlay>
          <Box w={400} style={{ padding: 48, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Label color={COLORS.cyan} size={16}>poker session</Label>
            <Input placeholder="USERNAME" value={username} onChange={e => setUsername(e.target.value)} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Btn primary onClick={handleStartNew} style={{ width: '100%', justifyContent: 'center', fontSize: 14, padding: '14px' }}>Start New Session +</Btn>
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

  if (!session) return <ToolShell toolName="Planning Poker" toolColor={COLORS.cyan} activeNav="poker" onBack={onBack}>Loading...</ToolShell>;

  const participants = Object.values(session.participants);
  const cards = ['1', '2', '3', '5', '8', '13', '21', '?', '☕'];
  const votedCount = participants.filter((p: any) => p.voted).length;

  return (
    <ToolShell toolName="Planning Poker" toolColor={COLORS.cyan} activeNav="poker" onBack={onBack}>
      <PokerContainer>
        <LeftPanel>
          <div style={{ padding: '24px', borderBottom: `1px solid ${COLORS.border}` }}>
            <Label color={COLORS.cyan} style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>session: {roomCode}</Label>
            <div className="wf-mono" style={{ fontSize: 15, color: COLORS.primary, marginBottom: 8 }}>{session.currentStory}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Tag color={session.gameState === 'voting' ? COLORS.lime : COLORS.magenta}>
                {session.gameState.toUpperCase()}
              </Tag>
              {session.gameState === 'voting' && <span className="wf-mono" style={{ fontSize: 11, color: COLORS.muted }}>{votedCount}/{participants.length} voted</span>}
            </div>
          </div>

          <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
            <Label style={{ display: 'block', marginBottom: 16 }}>{session.gameState === 'voting' ? 'participants' : 'votes'}</Label>
            {participants.map((p: any, i: number) => (
              <ParticipantItem key={i}>
                <Avatar>
                  <span className="wf-mono" style={{ fontSize: 14, color: COLORS.secondary }}>{p.username[0].toUpperCase()}</span>
                </Avatar>
                <span className="wf-mono" style={{ fontSize: 13, color: COLORS.secondary, flex: 1 }}>{p.username}</span>
                {session.gameState === 'voting' ? (
                  p.voted ? (
                    <div style={{ width: 20, height: 20, background: COLORS.elevated, border: `1px solid ${COLORS.cyan}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 12, color: COLORS.cyan }}>✓</span>
                    </div>
                  ) : (
                    <div style={{ width: 20, height: 20, background: COLORS.elevated, border: `1px dashed ${COLORS.muted}` }} />
                  )
                ) : (
                  <span className="wf-retro" style={{ fontSize: 24, color: COLORS.cyan }}>{p.vote}</span>
                )}
              </ParticipantItem>
            ))}
          </div>
        </LeftPanel>

        <ContentPanel>
          {session.gameState === 'voting' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                <Label color={COLORS.cyan} size={14}>select your estimate</Label>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${COLORS.border}, transparent)` }} />
              </div>

              <CardDeck>
                {cards.map((val) => (
                  <Card 
                    key={val} 
                    active={selectedCard === val} 
                    color={COLORS.cyan}
                    onClick={() => handleVote(val)}
                  >
                    <span className="wf-title" style={{ fontSize: selectedCard === val ? 36 : 28, color: selectedCard === val ? COLORS.cyan : COLORS.secondary }}>{val}</span>
                    {selectedCard === val && <CornerBracket color={COLORS.cyan} style={{ top: 0, left: 0 }} size={12} />}
                  </Card>
                ))}
              </CardDeck>

              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <Btn primary onClick={handleReveal} style={{ padding: '16px 40px', fontSize: 14 }}>reveal votes →</Btn>
              </div>
            </>
          ) : (
            <>
              <ConsensusBox style={{ marginBottom: 40 }}>
                <CornerBracket color={COLORS.cyan} style={{ top: 0, left: 0 }} size={16} />
                <Label color={COLORS.cyan} style={{ display: 'block', marginBottom: 16, fontSize: 16 }}>reveal complete</Label>
                <div className="wf-retro" style={{ fontSize: 48, color: COLORS.cyan, textShadow: `0 0 15px ${COLORS.cyan}` }}>Ready for next round</div>
              </ConsensusBox>
              
              <div style={{ marginTop: 'auto', display: 'flex', gap: 16 }}>
                <Btn primary onClick={handleReset} style={{ padding: '16px 40px', fontSize: 14 }}>new round →</Btn>
              </div>
            </>
          )}
        </ContentPanel>
      </PokerContainer>
    </ToolShell>
  );
};

export default PokerTool;
