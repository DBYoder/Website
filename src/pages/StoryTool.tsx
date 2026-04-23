import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { io, Socket } from 'socket.io-client';
import { COLORS } from '../GlobalStyles';
import ToolShell from '../components/ToolShell';
import { Btn, Label, CornerBracket } from '../components/Core';

const StoryContainer = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

const InputPanel = styled.div`
  width: 420px;
  border-right: 1px solid ${COLORS.border};
  display: flex;
  flex-direction: column;
  padding: 32px;
  gap: 24px;
  background: ${COLORS.surface};
`;

const OutputPanel = styled.div`
  flex: 1;
  padding: 32px 48px;
  display: flex;
  flex-direction: column;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Input = styled.input`
  height: 40px;
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
  padding: 0 16px;
  color: ${COLORS.primary};
  font-family: 'Share Tech Mono', monospace;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: ${COLORS.purple};
  }
`;

const TextArea = styled.textarea<{ height?: number }>`
  height: ${props => props.height || 80}px;
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
  padding: 12px 16px;
  color: ${COLORS.primary};
  font-family: 'Share Tech Mono', monospace;
  font-size: 14px;
  resize: none;
  line-height: 1.5;
  
  &:focus {
    outline: none;
    border-color: ${COLORS.purple};
  }
`;

const StoryCard = styled.div`
  background: ${COLORS.card};
  border: 1px solid ${COLORS.border};
  padding: 40px;
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
`;

const StoryBody = styled.div`
  margin-bottom: 32px;
  padding: 24px;
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
`;

const StoryLine = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  align-items: flex-start;
  font-size: 18px;
  line-height: 1.4;
`;

const BacklogList = styled.div`
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 200px;
  overflow-y: auto;
`;

const BacklogItem = styled.div`
  padding: 12px;
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

let socket: Socket;

const StoryTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [formData, setFormData] = useState({
    asA: 'Product Manager',
    iWant: 'a tool that generates user stories automatically',
    soThat: 'I can save time during sprint planning',
    priority: 'High',
    points: '5'
  });

  const [criteria, setCriteria] = useState<string[]>([]);
  const [newCriterion, setNewCriterion] = useState('');
  const [backlog, setBacklog] = useState<any[]>([]);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    socket = io(window.location.origin);
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleGenerate = () => {
    setGenerated(true);
  };

  const addCriterion = () => {
    if (newCriterion) {
      setCriteria([...criteria, newCriterion]);
      setNewCriterion('');
    }
  };

  const addToBacklog = () => {
    const newStory = {
      title: `${formData.asA}: ${formData.iWant.slice(0, 30)}...`,
      asA: formData.asA,
      iWant: formData.iWant,
      soThat: formData.soThat,
      criteria: [...criteria],
      id: Math.random().toString(36).substr(2, 9)
    };
    setBacklog([...backlog, newStory]);
    setGenerated(false);
    setCriteria([]);
  };

  const pushToPoker = () => {
    const roomCode = prompt("Enter Planning Poker Room Code:");
    if (roomCode && backlog.length > 0) {
      socket.emit('poker:updateBacklog', { roomId: roomCode.toUpperCase(), backlog });
      alert(`Backlog pushed to Poker Session: ${roomCode.toUpperCase()}`);
    } else if (backlog.length === 0) {
      alert("Backlog is empty!");
    }
  };

  const handleCopy = () => {
    const text = `
User Story:
AS A: ${formData.asA}
I WANT TO: ${formData.iWant}
SO THAT: ${formData.soThat}

Acceptance Criteria:
${criteria.map(c => `- ${c}`).join('\n')}
    `;
    navigator.clipboard.writeText(text);
    alert('Story copied to clipboard!');
  };

  return (
    <ToolShell toolName="Story Generator" toolColor={COLORS.purple} activeNav="stories" onBack={onBack}>
      <StoryContainer>
        <InputPanel>
          <Label color={COLORS.purple} size={14}>story inputs</Label>
          <FormGroup>
            <Label>as a...</Label>
            <Input value={formData.asA} onChange={e => setFormData({...formData, asA: e.target.value})} />
          </FormGroup>
          <FormGroup>
            <Label>i want to...</Label>
            <TextArea value={formData.iWant} onChange={e => setFormData({...formData, iWant: e.target.value})} />
          </FormGroup>
          <FormGroup>
            <Label>so that...</Label>
            <TextArea value={formData.soThat} onChange={e => setFormData({...formData, soThat: e.target.value})} />
          </FormGroup>
          <FormGroup>
            <Label>acceptance criteria</Label>
            <div style={{ display: 'flex', gap: 10 }}>
              <Input style={{ flex: 1 }} value={newCriterion} onChange={e => setNewCriterion(e.target.value)} placeholder="New criterion..." />
              <Btn onClick={addCriterion} style={{ padding: '0 24px' }}>+</Btn>
            </div>
          </FormGroup>
          <div style={{ marginTop: 'auto', display: 'flex', gap: 12, flexDirection: 'column' }}>
            <Btn primary onClick={handleGenerate} style={{ width: '100%', borderColor: COLORS.purple, color: COLORS.purple, background: 'rgba(184, 41, 255, 0.08)', padding: '16px', fontSize: 14, justifyContent: 'center' }}>✦ generate</Btn>
            <Btn onClick={pushToPoker} style={{ width: '100%', borderColor: COLORS.cyan, color: COLORS.cyan, background: 'rgba(0, 245, 255, 0.08)', padding: '16px', fontSize: 14, justifyContent: 'center' }}>↑ push backlog to poker</Btn>
          </div>
        </InputPanel>

        <OutputPanel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <Label color={COLORS.purple} size={14}>current backlog ({backlog.length})</Label>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${COLORS.border}, transparent)` }} />
            <Btn style={{ fontSize: 11, padding: '6px 16px' }} onClick={handleCopy}>copy draft ⎘</Btn>
          </div>

          <StoryCard>
            <CornerBracket color={COLORS.purple} style={{ top: 0, left: 0 }} size={16} />
            <CornerBracket color={COLORS.purple} style={{ bottom: 0, right: 0, transform: 'rotate(180deg)' }} size={16} />

            {generated ? (
              <>
                <StoryBody>
                  <StoryLine><span className="wf-mono" style={{ color: COLORS.purple, fontSize: 14, minWidth: 80 }}>AS A</span> <span className="wf-body">{formData.asA}</span></StoryLine>
                  <StoryLine><span className="wf-mono" style={{ color: COLORS.purple, fontSize: 14, minWidth: 80 }}>I WANT</span> <span className="wf-body">{formData.iWant}</span></StoryLine>
                  <StoryLine><span className="wf-mono" style={{ color: COLORS.purple, fontSize: 14, minWidth: 80 }}>SO THAT</span> <span className="wf-body">{formData.soThat}</span></StoryLine>
                </StoryBody>

                <Label style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>acceptance criteria</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                  {criteria.map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, fontSize: 16 }}>
                      <span style={{ color: COLORS.purple }}>•</span>
                      <span className="wf-body">{c}</span>
                    </div>
                  ))}
                </div>
                <Btn primary onClick={addToBacklog} style={{ marginTop: 'auto', padding: '16px', justifyContent: 'center' }}>Add to Backlog +</Btn>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Label style={{ marginBottom: 16 }}>Backlog Items</Label>
                {backlog.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Label style={{ color: COLORS.muted, fontSize: 16 }}>No stories in backlog yet</Label>
                  </div>
                ) : (
                  <BacklogList>
                    {backlog.map((item, i) => (
                      <BacklogItem key={item.id}>
                        <span className="wf-body" style={{ fontSize: 14 }}>{i+1}. {item.title}</span>
                        <Btn onClick={() => setBacklog(backlog.filter(b => b.id !== item.id))} style={{ fontSize: 10 }}>remove</Btn>
                      </BacklogItem>
                    ))}
                  </BacklogList>
                )}
              </div>
            )}
          </StoryCard>
        </OutputPanel>
      </StoryContainer>
    </ToolShell>
  );
};

export default StoryTool;
