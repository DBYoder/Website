import React, { useState } from 'react';
import styled from 'styled-components';
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
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    setGenerated(true);
  };

  const addCriterion = () => {
    if (newCriterion) {
      setCriteria([...criteria, newCriterion]);
      setNewCriterion('');
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

  const handleExport = () => {
    const data = JSON.stringify({ ...formData, criteria }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'user-story.json';
    link.click();
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
          <div style={{ marginTop: 'auto', display: 'flex', gap: 12 }}>
            <Btn primary onClick={handleGenerate} style={{ flex: 1, borderColor: COLORS.purple, color: COLORS.purple, background: 'rgba(184, 41, 255, 0.08)', padding: '16px', fontSize: 14 }}>✦ generate</Btn>
            <Btn onClick={() => setGenerated(false)} style={{ padding: '16px' }}>clear</Btn>
          </div>
        </InputPanel>

        <OutputPanel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <Label color={COLORS.purple} size={14}>generated story</Label>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${COLORS.border}, transparent)` }} />
            <Btn style={{ fontSize: 11, padding: '6px 16px' }} onClick={handleCopy}>copy ⎘</Btn>
            <Btn style={{ fontSize: 11, padding: '6px 16px' }} onClick={handleExport}>export</Btn>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {criteria.map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, fontSize: 16 }}>
                      <span style={{ color: COLORS.purple }}>•</span>
                      <span className="wf-body">{c}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Label style={{ color: COLORS.muted, fontSize: 16 }}>Fill inputs and click generate</Label>
              </div>
            )}
          </StoryCard>
        </OutputPanel>
      </StoryContainer>
    </ToolShell>
  );
};

export default StoryTool;
