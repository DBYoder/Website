import React, { useState } from 'react';
import styled from 'styled-components';
import { COLORS } from '../GlobalStyles';
import { Box, Label, Tag, Btn, Lines, CornerBracket } from '../components/Core';
import Tutorial from '../components/Tutorial';

const Layout = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  background: ${COLORS.bg};
  border: 1px solid ${COLORS.border};
  @media (max-width: 768px) {
    flex-direction: column;
    height: auto;
    border: none;
  }
`;

const Sidebar = styled.div`
  width: 240px;
  height: 100%;
  background: ${COLORS.surface};
  border-right: 1px solid ${COLORS.border};
  display: flex;
  flex-direction: column;
  @media (max-width: 768px) { display: none; }
`;

const LogoArea = styled.div`
  padding: 32px 24px;
  border-bottom: 1px solid ${COLORS.border};
`;

const NavList = styled.div`
  padding: 24px 0;
  flex: 1;
`;

const NavItemStyled = styled.div<{ active?: boolean }>`
  padding: 12px 24px;
  background: ${props => props.active ? 'rgba(0, 245, 255, 0.06)' : 'transparent'};
  border-left: 3px solid ${props => props.active ? COLORS.cyan : 'transparent'};
  cursor: pointer;
  
  &:hover {
    background: rgba(0, 245, 255, 0.03);
  }
`;

const StatusFooter = styled.div`
  padding: 20px 24px;
  border-top: 1px solid ${COLORS.border};
`;

const Main = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  @media (max-width: 768px) { overflow: visible; }
`;

const TopBar = styled.div`
  height: 52px;
  border-bottom: 1px solid ${COLORS.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  background: ${COLORS.surface};
  @media (max-width: 768px) { padding: 0 16px; }
`;

const HeroSection = styled.div`
  padding: 56px 56px 40px;
  border-bottom: 1px solid ${COLORS.border};
  @media (max-width: 768px) { padding: 32px 20px 24px; }
`;

const ToolGrid = styled.div`
  padding: 40px 56px;
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  overflow-y: auto;
  @media (max-width: 768px) {
    padding: 20px;
    grid-template-columns: 1fr;
    overflow: visible;
  }
`;

const ToolCard = styled.div<{ accent: string }>`
  background: ${COLORS.card};
  border: 1px solid ${COLORS.border};
  padding: 28px;
  position: relative;
  transition: all 0.2s;
  
  &:hover {
    border-color: ${props => props.accent};
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }
`;

const Blink = styled.div`
  width: 8px;
  height: 16px;
  background: ${COLORS.cyan};
  animation: blink 1s steps(1) infinite;
`;

interface LandingPageProps {
  onLaunch: (tool: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLaunch }) => {
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <Layout>
      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
      <Sidebar>
        <LogoArea>
          <div className="wf-title" style={{ fontSize: 22, color: COLORS.cyan, textShadow: `0 0 10px ${COLORS.cyan}`, letterSpacing: '0.15em' }}>AGILE//FREE</div>
          <div className="wf-label" style={{ fontSize: 11, color: COLORS.muted, marginTop: 6 }}>pm tools for teams</div>
        </LogoArea>

        <NavList>
          {[
            { label: '// home', active: true, id: 'home' },
            { label: '// poker', active: false, id: 'poker' },
            { label: '// retro', active: false, id: 'retro' },
            { label: '// stories', active: false, id: 'stories' },
            { label: '// wbs', active: false, id: 'wbs' },
          ].map(({ label, active, id }) => (
            <NavItemStyled key={label} active={active} onClick={() => id !== 'home' && onLaunch(id)}>
              <span className="wf-mono" style={{ fontSize: 13, color: active ? COLORS.cyan : COLORS.secondary }}>{label}</span>
            </NavItemStyled>
          ))}
        </NavList>

        <StatusFooter>
          <Label style={{ fontSize: 10, display: 'block', marginBottom: 12 }}>system status</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['poker', 'retro', 'stories', 'wbs'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, background: COLORS.lime, borderRadius: '50%', boxShadow: `0 0 6px ${COLORS.lime}` }} />
                <span className="wf-mono" style={{ fontSize: 11, color: COLORS.secondary }}>{t}</span>
                <span className="wf-mono" style={{ fontSize: 10, color: COLORS.lime, marginLeft: 'auto' }}>LIVE</span>
              </div>
            ))}
          </div>
        </StatusFooter>
      </Sidebar>

      <Main>
        <TopBar>
          <span className="wf-mono" style={{ fontSize: 12, color: COLORS.muted }}>~ free pm tools for agile teams</span>
          <Btn
            onClick={() => setShowTutorial(true)}
            style={{ fontSize: 11, borderColor: COLORS.cyan, color: COLORS.cyan }}
            aria-label="Open the tutorial"
          >
            ? how it works
          </Btn>
        </TopBar>

        <HeroSection>
          <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Label color={COLORS.cyan} style={{ marginBottom: 16, display: 'block', fontSize: 14 }}>// system initialized</Label>
              <div className="wf-title" style={{ fontSize: 48, color: COLORS.primary, lineHeight: 1.1, letterSpacing: '0.05em' }}>
                FREE TOOLS<br />
                <span style={{ color: COLORS.cyan }}>FOR AGILE</span><br />
                TEAMS
              </div>
              <div style={{ marginTop: 24 }}>
                <Lines count={2} color={COLORS.borderBright} />
              </div>
            </div>

            <Box w={360} bg={COLORS.elevated} border={COLORS.border} style={{ padding: '24px 32px' }}>
              <Label color={COLORS.lime} style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>available tools</Label>
              {[
                { cmd: 'poker', desc: 'planning poker' },
                { cmd: 'retro', desc: 'retro board' },
                { cmd: 'stories', desc: 'story generator' },
                { cmd: 'wbs', desc: 'work breakdown' },
              ].map(({ cmd, desc }) => (
                <div key={cmd} style={{ marginBottom: 10 }}>
                  <span className="wf-mono" style={{ fontSize: 13, color: COLORS.cyan }}>{'>'} </span>
                  <span className="wf-mono" style={{ fontSize: 13, color: COLORS.lime }}>{cmd}</span>
                  <span className="wf-mono" style={{ fontSize: 13, color: COLORS.muted }}>  # {desc}</span>
                </div>
              ))}
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="wf-mono" style={{ fontSize: 13, color: COLORS.cyan }}>{'>'} _</span>
                <Blink />
              </div>
            </Box>
          </div>
        </HeroSection>

        <ToolGrid>
          {[
            { id: 'poker', name: 'Planning Poker', tag: 'live', tagColor: COLORS.lime, desc: 'async + realtime card voting for sprint estimates', icon: '◈', color: COLORS.cyan },
            { id: 'retro', name: 'Retro Board', tag: 'live', tagColor: COLORS.lime, desc: 'structured sprint retrospective with columns + voting', icon: '◫', color: COLORS.magenta },
            { id: 'stories', name: 'Story Generator', tag: 'live', tagColor: COLORS.lime, desc: 'user story templates and backlog builder', icon: '◧', color: COLORS.purple },
            { id: 'wbs', name: 'Work Breakdown', tag: 'live', tagColor: COLORS.lime, desc: 'collaborative epic → feature → story decomposition', icon: '◩', color: COLORS.lime },
          ].map(({ id, name, tag, tagColor, desc, icon, color }) => (
            <ToolCard key={name} accent={color}>
              <CornerBracket color={color} style={{ top: 0, left: 0 }} size={12} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 32, color }}>{icon}</span>
                <Tag color={tagColor}>{tag}</Tag>
              </div>
              <div className="wf-title" style={{ fontSize: 20, color: COLORS.primary, marginBottom: 12, letterSpacing: '0.05em' }}>{name.toUpperCase()}</div>
              <div className="wf-body" style={{ fontSize: 15, color: COLORS.secondary, marginBottom: 20, minHeight: 48, lineHeight: 1.4 }}>{desc}</div>
              <Btn primary onClick={() => onLaunch(id)} style={{ borderColor: color, color, background: `${color}11`, fontSize: 12, width: '100%', justifyContent: 'center' }}>launch tool →</Btn>
            </ToolCard>
          ))}
        </ToolGrid>
      </Main>
    </Layout>
  );
};

export default LandingPage;
