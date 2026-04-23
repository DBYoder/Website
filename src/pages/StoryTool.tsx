import React, { useState } from 'react';
import styled from 'styled-components';
import { COLORS } from '../GlobalStyles';
import ToolShell from '../components/ToolShell';
import { Tag, Btn, Label, CornerBracket } from '../components/Core';

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

const Select = styled.div`
  height: 28px;
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-size: 9px;
  color: ${COLORS.secondary};
`;

const StoryCard = styled.div`
  background: ${COLORS.card};
  border: 1px solid ${COLORS.border};
  padding: 16px 18px;
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
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

  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    setGenerated(true);
  };

  return (
    <ToolShell toolName="Story Generator" toolColor={COLORS.purple} activeNav="stories" onBack={onBack}>
      <StoryContainer>
        <InputPanel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Label color={COLORS.purple}>story inputs</Label>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${COLORS.border}, transparent)` }} />
          </div>

          <FormGroup>
            <Label>template type</Label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['user story', 'bug report', 'spike'].map((t, i) => (
                <div key={t} style={{ 
                  padding: '4px 8px', 
                  background: i === 0 ? 'rgba(184, 41, 255, 0.1)' : COLORS.elevated, 
                  border: `1px solid ${i === 0 ? COLORS.purple : COLORS.border}`,
                  cursor: 'pointer'
                }}>
                  <span className="wf-mono" style={{ fontSize: 8, color: i === 0 ? COLORS.purple : COLORS.secondary }}>{t}</span>
                </div>
              ))}
            </div>
          </FormGroup>

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

          <div style={{ display: 'flex', gap: 10 }}>
            <FormGroup style={{ flex: 1 }}>
              <Label>priority</Label>
              <Select>
                <span>{formData.priority}</span>
                <span style={{ fontSize: 8, color: COLORS.muted }}>▾</span>
              </Select>
            </FormGroup>
            <FormGroup style={{ flex: 1 }}>
              <Label>story points</Label>
              <Select>
                <span>{formData.points}</span>
                <span style={{ fontSize: 8, color: COLORS.muted }}>▾</span>
              </Select>
            </FormGroup>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
            <Btn primary onClick={handleGenerate} style={{ flex: 1, justifyContent: 'center', borderColor: COLORS.purple, color: COLORS.purple, background: 'rgba(184, 41, 255, 0.08)' }}>✦ generate</Btn>
            <Btn onClick={() => setGenerated(false)}>clear</Btn>
          </div>
        </InputPanel>

        <OutputPanel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Label color={COLORS.purple}>generated story</Label>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${COLORS.border}, transparent)` }} />
            <Btn style={{ fontSize: 8 }}>copy ⎘</Btn>
            <Btn style={{ fontSize: 8 }}>export</Btn>
          </div>

          <StoryCard>
            <CornerBracket color={COLORS.purple} style={{ top: 0, left: 0 }} />
            <CornerBracket color={COLORS.purple} style={{ bottom: 0, right: 0, transform: 'rotate(180deg)' }} />

            {generated ? (
              <>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  <Tag color={COLORS.purple}>UST-042</Tag>
                  <Tag color={COLORS.secondary}>frontend</Tag>
                  <Tag color={COLORS.lime}>{formData.priority} priority</Tag>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <Label style={{ display: 'block', marginBottom: 4 }}>title</Label>
                  <div className="wf-body" style={{ fontSize: 12, color: COLORS.primary }}>
                    {formData.asA}: {formData.iWant.slice(0, 30)}...
                  </div>
                </div>

                <StoryBody>
                  <StoryLine>
                    <span className="wf-mono" style={{ fontSize: 9, color: COLORS.purple, flexShrink: 0 }}>AS A</span>
                    <span className="wf-body" style={{ fontSize: 10, color: COLORS.primary }}>{formData.asA}</span>
                  </StoryLine>
                  <StoryLine>
                    <span className="wf-mono" style={{ fontSize: 9, color: COLORS.purple, flexShrink: 0 }}>I WANT</span>
                    <span className="wf-body" style={{ fontSize: 10, color: COLORS.primary }}>{formData.iWant}</span>
                  </StoryLine>
                  <StoryLine>
                    <span className="wf-mono" style={{ fontSize: 9, color: COLORS.purple, flexShrink: 0 }}>SO THAT</span>
                    <span className="wf-body" style={{ fontSize: 10, color: COLORS.primary }}>{formData.soThat}</span>
                  </StoryLine>
                </StoryBody>

                <div style={{ marginBottom: 14 }}>
                  <Label style={{ display: 'block', marginBottom: 6 }}>acceptance criteria</Label>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ width: 14, height: 14, background: COLORS.elevated, border: `1px solid ${COLORS.border}`, flexShrink: 0, marginTop: 2 }} />
                      <div style={{ flex: 1, height: 2, background: COLORS.border, marginTop: 8 }} />
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', gap: 16, paddingTop: 12, borderTop: `1px solid ${COLORS.border}` }}>
                  <div>
                    <Label style={{ display: 'block', marginBottom: 2 }}>points</Label>
                    <span className="wf-retro" style={{ fontSize: 18, color: COLORS.purple }}>{formData.points}</span>
                  </div>
                  <div>
                    <Label style={{ display: 'block', marginBottom: 2 }}>priority</Label>
                    <span className="wf-retro" style={{ fontSize: 18, color: COLORS.yellow }}>{formData.priority.toUpperCase()}</span>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <Btn primary style={{ borderColor: COLORS.purple, color: COLORS.purple, background: 'rgba(184, 41, 255, 0.08)', fontSize: 9 }}>add to backlog →</Btn>
                  </div>
                </div>
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
