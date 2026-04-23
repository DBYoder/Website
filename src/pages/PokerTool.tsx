import React, { useState } from 'react';
import styled from 'styled-components';
import { COLORS } from '../GlobalStyles';
import ToolShell from '../components/ToolShell';
import { Label, Tag, Box, Lines, Btn, CornerBracket } from '../components/Core';

const PokerContainer = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

const LeftPanel = styled.div`
  width: 200px;
  border-right: 1px solid ${COLORS.border};
  display: flex;
  flex-direction: column;
`;

const ContentPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 18px 20px;
`;

const CardDeck = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 24px;
`;

const Card = styled.div<{ active?: boolean; color: string }>`
  width: 52px;
  height: 72px;
  background: ${props => props.active ? `rgba(${parseInt(props.color.slice(1,3), 16)}, ${parseInt(props.color.slice(3,5), 16)}, ${parseInt(props.color.slice(5,7), 16)}, 0.12)` : COLORS.card};
  border: 1px solid ${props => props.active ? props.color : COLORS.border};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  box-shadow: ${props => props.active ? `0 0 10px rgba(${parseInt(props.color.slice(1,3), 16)}, ${parseInt(props.color.slice(3,5), 16)}, ${parseInt(props.color.slice(5,7), 16)}, 0.3)` : 'none'};
  position: relative;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: ${props => props.color};
  }
`;

const ParticipantItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
`;

const Avatar = styled.div`
  width: 20px;
  height: 20px;
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
  padding: 14px 16px;
  position: relative;
`;

const BreakdownRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
`;

const BarContainer = styled.div`
  flex: 1;
  height: 6px;
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
`;

const Bar = styled.div<{ width: number; color: string }>`
  width: ${props => props.width}%;
  height: 100%;
  background: ${props => props.color};
`;

const PokerTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [gameState, setGameState] = useState<'voting' | 'revealed'>('voting');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  
  const participants = [
    { name: 'alice', voted: true, vote: '5' },
    { name: 'bob', voted: true, vote: '8' },
    { name: 'carol', voted: true, vote: '5' },
    { name: 'dave', voted: false, vote: '3' },
    { name: 'eve', voted: true, vote: '5' },
  ];

  const cards = ['1', '2', '3', '5', '8', '13', '21', '?', '☕'];

  return (
    <ToolShell toolName="Planning Poker" toolColor={COLORS.cyan} activeNav="poker" onBack={onBack}>
      <PokerContainer>
        <LeftPanel>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${COLORS.border}` }}>
            <Label color={COLORS.cyan} style={{ display: 'block', marginBottom: 6 }}>session</Label>
            <div className="wf-mono" style={{ fontSize: 11, color: COLORS.primary, marginBottom: 4 }}>Sprint 24 Planning</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Tag color={gameState === 'voting' ? COLORS.lime : COLORS.magenta}>
                {gameState.toUpperCase()}
              </Tag>
              {gameState === 'voting' && <span className="wf-mono" style={{ fontSize: 8, color: COLORS.muted }}>4/5 voted</span>}
            </div>
          </div>

          <div style={{ padding: '10px 14px', flex: 1 }}>
            <Label style={{ display: 'block', marginBottom: 8 }}>{gameState === 'voting' ? 'participants' : 'votes'}</Label>
            {participants.map((p) => (
              <ParticipantItem key={p.name}>
                <Avatar>
                  <span className="wf-mono" style={{ fontSize: 8, color: COLORS.secondary }}>{p.name[0].toUpperCase()}</span>
                </Avatar>
                <span className="wf-mono" style={{ fontSize: 9, color: COLORS.secondary, flex: 1 }}>{p.name}</span>
                {gameState === 'voting' ? (
                  p.voted ? (
                    <div style={{ width: 14, height: 14, background: COLORS.elevated, border: `1px solid ${COLORS.cyan}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 8, color: COLORS.cyan }}>✓</span>
                    </div>
                  ) : (
                    <div style={{ width: 14, height: 14, background: COLORS.elevated, border: `1px dashed ${COLORS.muted}` }} />
                  )
                ) : (
                  <span className="wf-retro" style={{ fontSize: 14, color: p.vote === '5' ? COLORS.cyan : COLORS.secondary }}>{p.vote}</span>
                )}
              </ParticipantItem>
            ))}
          </div>

          <div style={{ padding: '10px 14px', borderTop: `1px solid ${COLORS.border}` }}>
            <Label style={{ display: 'block', marginBottom: 4 }}>current story</Label>
            <div className="wf-body" style={{ fontSize: 10, color: COLORS.primary, marginBottom: 4 }}>UST-041: Implement sidebar navigation</div>
            <Lines count={1} color={COLORS.borderBright} />
          </div>
        </LeftPanel>

        <ContentPanel>
          {gameState === 'voting' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <Label color={COLORS.cyan}>select your estimate</Label>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${COLORS.border}, transparent)` }} />
              </div>

              <CardDeck>
                {cards.map((val) => (
                  <Card 
                    key={val} 
                    active={selectedCard === val} 
                    color={COLORS.cyan}
                    onClick={() => setSelectedCard(val)}
                  >
                    <span className="wf-title" style={{ fontSize: selectedCard === val ? 20 : 16, color: selectedCard === val ? COLORS.cyan : COLORS.secondary }}>{val}</span>
                    {selectedCard === val && <CornerBracket color={COLORS.cyan} style={{ top: 0, left: 0 }} size={5} />}
                  </Card>
                ))}
              </CardDeck>

              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.yellow, boxShadow: `0 0 4px ${COLORS.yellow}` }} />
                  <span className="wf-mono" style={{ fontSize: 9, color: COLORS.yellow }}>waiting for dave...</span>
                </div>
                <Btn primary onClick={() => setGameState('revealed')}>reveal votes →</Btn>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <ConsensusBox>
                  <CornerBracket color={COLORS.cyan} style={{ top: 0, left: 0 }} />
                  <Label color={COLORS.cyan} style={{ display: 'block', marginBottom: 6 }}>consensus</Label>
                  <div className="wf-retro" style={{ fontSize: 42, color: COLORS.cyan, textShadow: `0 0 12px ${COLORS.cyan}` }}>5</div>
                  <Label style={{ fontSize: 8 }}>story points</Label>
                </ConsensusBox>
                
                <Box style={{ flex: 1, padding: '14px 16px' }}>
                  <Label style={{ display: 'block', marginBottom: 10 }}>breakdown</Label>
                  {[
                    { val: '3', count: 1, color: COLORS.secondary },
                    { val: '5', count: 3, color: COLORS.cyan },
                    { val: '8', count: 1, color: COLORS.secondary }
                  ].map((item) => (
                    <BreakdownRow key={item.val}>
                      <span className="wf-mono" style={{ fontSize: 10, color: item.color, width: 16 }}>{item.val}</span>
                      <BarContainer>
                        <Bar width={(item.count / 5) * 100} color={item.color} />
                      </BarContainer>
                      <span className="wf-mono" style={{ fontSize: 8, color: COLORS.muted }}>{item.count}</span>
                    </BreakdownRow>
                  ))}
                </Box>
              </div>

              <CardDeck>
                {participants.map((p) => (
                  <div key={p.name} style={{ textAlign: 'center' }}>
                    <Card color={p.vote === '5' ? COLORS.cyan : COLORS.border} style={{ cursor: 'default', marginBottom: 4 }}>
                      <span className="wf-title" style={{ fontSize: 18, color: p.vote === '5' ? COLORS.cyan : COLORS.secondary }}>{p.vote}</span>
                    </Card>
                    <span className="wf-mono" style={{ fontSize: 8, color: COLORS.muted }}>{p.name}</span>
                  </div>
                ))}
              </CardDeck>

              <div style={{ marginTop: 'auto', display: 'flex', gap: 10 }}>
                <Btn primary>accept 5 pts →</Btn>
                <Btn onClick={() => setGameState('voting')}>re-vote</Btn>
                <Btn>next story →</Btn>
              </div>
            </>
          )}
        </ContentPanel>
      </PokerContainer>
    </ToolShell>
  );
};

export default PokerTool;
