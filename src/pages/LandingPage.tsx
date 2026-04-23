import React from 'react';
import styled from 'styled-components';
import { COLORS } from '../GlobalStyles';
import { Box, Label, Tag, Btn, Lines, CornerBracket } from '../components/Core';

const Layout = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  background: ${COLORS.bg};
  border: 1px solid ${COLORS.border};
`;

const Sidebar = styled.div`
  width: 180px;
  height: 100%;
  background: ${COLORS.surface};
  border-right: 1px solid ${COLORS.border};
  display: flex;
  flex-direction: column;
`;

const LogoArea = styled.div`
  padding: 18px 14px;
  border-bottom: 1px solid ${COLORS.border};
`;

const NavList = styled.div`
  padding: 12px 0;
  flex: 1;
`;

const NavItemStyled = styled.div<{ active?: boolean }>`
  padding: 7px 14px;
  background: ${props => props.active ? 'rgba(0, 245, 255, 0.06)' : 'transparent'};
  border-left: 2px solid ${props => props.active ? COLORS.cyan : 'transparent'};
  cursor: pointer;
  
  &:hover {
    background: rgba(0, 245, 255, 0.03);
  }
`;

const StatusFooter = styled.div`
  padding: 10px 14px;
  border-top: 1px solid ${COLORS.border};
`;

const Main = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const TopBar = styled.div`
  height: 36px;
  border-bottom: 1px solid ${COLORS.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: ${COLORS.surface};
`;

const HeroSection = styled.div`
  padding: 28px 28px 20px;
  border-bottom: 1px solid ${COLORS.border};
`;

const ToolGrid = styled.div`
  padding: 20px 28px;
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
  overflow-y: auto;
`;

const ToolCard = styled.div<{ accent: string }>`
  background: ${COLORS.card};
  border: 1px solid ${COLORS.border};
  padding: 14px;
  position: relative;
  transition: all 0.2s;
  
  &:hover {
    border-color: ${props => props.accent};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

const Blink = styled.div`
  width: 6px;
  height: 12px;
  background: ${COLORS.cyan};
  animation: blink 1s steps(1) infinite;
`;

interface LandingPageProps {
  onLaunch: (tool: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLaunch }) => {
  return (
    <Layout>
      <Sidebar>
        <LogoArea>
          <div className="wf-title" style={{ fontSize: 13, color: COLORS.cyan, textShadow: `0 0 6px ${COLORS.cyan}`, letterSpacing: '0.1em' }}>AGILE//FREE</div>
          <div className="wf-label" style={{ fontSize: 8, color: COLORS.muted, marginTop: 3 }}>pm tools for teams</div>
        </LogoArea>

        <NavList>
          {[
            { label: '// home', active: true, id: 'home' },
            { label: '// poker', active: false, id: 'poker' },
            { label: '// retro', active: false, id: 'retro' },
            { label: '// stories', active: false, id: 'stories' },
            { label: '// about', active: false, id: 'about' },
          ].map(({ label, active, id }) => (
            <NavItemStyled key={label} active={active} onClick={() => id !== 'home' && id !== 'about' && onLaunch(id)}>
              <span className="wf-mono" style={{ fontSize: 10, color: active ? COLORS.cyan : COLORS.secondary }}>{label}</span>
            </NavItemStyled>
          ))}
        </NavList>

        <StatusFooter>
          <Label style={{ fontSize: 7 }}>system status</Label>
          <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {['poker', 'retro', 'stories'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 5, height: 5, background: COLORS.lime, borderRadius: '50%', boxShadow: `0 0 4px ${COLORS.lime}` }} />
                <span className="wf-mono" style={{ fontSize: 8, color: COLORS.secondary }}>{t}</span>
                <span className="wf-mono" style={{ fontSize: 8, color: COLORS.lime, marginLeft: 'auto' }}>LIVE</span>
              </div>
            ))}
          </div>
        </StatusFooter>
      </Sidebar>

      <Main>
        <TopBar>
          <span className="wf-mono" style={{ fontSize: 9, color: COLORS.muted }}>~ free pm tools for agile teams</span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="wf-mono" style={{ fontSize: 9, color: COLORS.secondary }}>github</span>
            <Btn>contact</Btn>
          </div>
        </TopBar>

        <HeroSection>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <Label color={COLORS.cyan} style={{ marginBottom: 8, display: 'block' }}>// system initialized</Label>
              <div className="wf-title" style={{ fontSize: 28, color: COLORS.primary, lineHeight: 1.1, letterSpacing: '0.05em' }}>
                FREE TOOLS<br />
                <span style={{ color: COLORS.cyan }}>FOR AGILE</span><br />
                TEAMS
              </div>
              <div style={{ marginTop: 12 }}>
                <Lines count={2} color={COLORS.borderBright} />
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <Btn primary>▶ launch a tool</Btn>
                <Btn>view source</Btn>
              </div>
            </div>

            <Box w={240} bg={COLORS.elevated} border={COLORS.border} style={{ padding: '10px 14px' }}>
              <Label color={COLORS.lime} style={{ display: 'block', marginBottom: 8 }}>available tools</Label>
              {[
                { cmd: 'poker', desc: 'planning poker' },
                { cmd: 'retro', desc: 'retro board' },
                { cmd: 'stories', desc: 'story generator' },
              ].map(({ cmd, desc }) => (
                <div key={cmd} style={{ marginBottom: 6 }}>
                  <span className="wf-mono" style={{ fontSize: 10, color: COLORS.cyan }}>{'>'} </span>
                  <span className="wf-mono" style={{ fontSize: 10, color: COLORS.lime }}>{cmd}</span>
                  <span className="wf-mono" style={{ fontSize: 10, color: COLORS.muted }}>  # {desc}</span>
                </div>
              ))}
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="wf-mono" style={{ fontSize: 10, color: COLORS.cyan }}>{'>'} _</span>
                <Blink />
              </div>
            </Box>
          </div>
        </HeroSection>

        <ToolGrid>
          {[
            { id: 'poker', name: 'Planning Poker', tag: 'live', tagColor: COLORS.lime, desc: 'async + realtime card voting for sprint estimates', icon: '◈', color: COLORS.cyan },
            { id: 'retro', name: 'Retro Board', tag: 'live', tagColor: COLORS.lime, desc: 'structured sprint retrospective with columns + voting', icon: '◫', color: COLORS.magenta },
            { id: 'stories', name: 'Story Generator', tag: 'live', tagColor: COLORS.lime, desc: 'ai-assisted user story templates for backlogs', icon: '◧', color: COLORS.purple },
          ].map(({ id, name, tag, tagColor, desc, icon, color }) => (
            <ToolCard key={name} accent={color}>
              <CornerBracket color={color} style={{ top: 0, left: 0 }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 20, color }}>{icon}</span>
                <Tag color={tagColor}>{tag}</Tag>
              </div>
              <div className="wf-title" style={{ fontSize: 12, color: COLORS.primary, marginBottom: 6, letterSpacing: '0.05em' }}>{name.toUpperCase()}</div>
              <div className="wf-body" style={{ fontSize: 11, color: COLORS.secondary, marginBottom: 10, minHeight: 32 }}>{desc}</div>
              <Btn primary onClick={() => onLaunch(id)} style={{ borderColor: color, color, background: `${color}11`, fontSize: 8 }}>launch →</Btn>
            </ToolCard>
          ))}
        </ToolGrid>
      </Main>
    </Layout>
  );
};

export default LandingPage;
