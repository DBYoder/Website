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
  width: 320px;
  border-right: 1px solid ${COLORS.border};
  display: flex;
  flex-direction: column;
  padding: 18px 16px;
  gap: 14px;
`;

const OutputPanel = styled.div`
  flex: 1;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const Input = styled.input`
  height: 28px;
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
  padding: 0 10px;
  color: ${COLORS.primary};
  font-family: 'Share Tech Mono', monospace;
  font-size: 10px;
  
  &:focus {
    outline: none;
    border-color: ${COLORS.purple};
  }
`;

const TextArea = styled.textarea<{ height?: number }>`
  height: ${props => props.height || 52}px;
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
  padding: 8px 10px;
  color: ${COLORS.primary};
  font-family: 'Share Tech Mono', monospace;
  font-size: 10px;
  resize: none;
  
  &:focus {
    outline: none;
    border-color: ${COLORS.purple};
  }
`;

const StoryCard = styled.div`
  background: ${COLORS.card};
  border: 1px solid ${COLORS.border};
  padding: 16px 18px;
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
`;

const StoryBody = styled.div`
  margin-bottom: 14px;
  padding: 10px 12px;
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
`;

const StoryLine = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
  align-items: flex-start;
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
          <Label color={COLORS.purple}>story inputs</Label>
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
            <div style={{ display: 'flex', gap: 5 }}>
              <Input style={{ flex: 1 }} value={newCriterion} onChange={e => setNewCriterion(e.target.value)} placeholder="New criterion..." />
              <Btn onClick={addCriterion}>+</Btn>
            </div>
          </FormGroup>
          <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
            <Btn primary onClick={handleGenerate} style={{ flex: 1, borderColor: COLORS.purple, color: COLORS.purple, background: 'rgba(184, 41, 255, 0.08)' }}>✦ generate</Btn>
            <Btn onClick={() => setGenerated(false)}>clear</Btn>
          </div>
        </InputPanel>

        <OutputPanel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Label color={COLORS.purple}>generated story</Label>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${COLORS.border}, transparent)` }} />
            <Btn style={{ fontSize: 8 }} onClick={handleCopy}>copy ⎘</Btn>
            <Btn style={{ fontSize: 8 }} onClick={handleExport}>export</Btn>
          </div>

          <StoryCard>
            <CornerBracket color={COLORS.purple} style={{ top: 0, left: 0 }} />
            <CornerBracket color={COLORS.purple} style={{ bottom: 0, right: 0, transform: 'rotate(180deg)' }} />

            {generated ? (
              <>
                <StoryBody>
                  <StoryLine><span className="wf-mono" style={{ color: COLORS.purple }}>AS A</span> <span>{formData.asA}</span></StoryLine>
                  <StoryLine><span className="wf-mono" style={{ color: COLORS.purple }}>I WANT</span> <span>{formData.iWant}</span></StoryLine>
                  <StoryLine><span className="wf-mono" style={{ color: COLORS.purple }}>SO THAT</span> <span>{formData.soThat}</span></StoryLine>
                </StoryBody>

                <Label style={{ display: 'block', marginBottom: 6 }}>acceptance criteria</Label>
                {criteria.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 10 }}>
                    <span style={{ color: COLORS.purple }}>•</span>
                    <span>{c}</span>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Label style={{ color: COLORS.muted }}>Fill inputs and click generate</Label>
              </div>
            )}
          </StoryCard>
        </OutputPanel>
      </StoryContainer>
    </ToolShell>
  );
};

export default StoryTool;
