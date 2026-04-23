import React from 'react';
import styled from 'styled-components';
import { COLORS } from '../GlobalStyles';
import { Tag, Btn } from './Core';

const ShellLayout = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  background: ${COLORS.bg};
  border: 1px solid ${COLORS.border};
`;

const Sidebar = styled.div`
  width: 160px;
  height: 100%;
  background: ${COLORS.surface};
  border-right: 1px solid ${COLORS.border};
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.div`
  padding: 14px 12px;
  border-bottom: 1px solid ${COLORS.border};
`;

const NavList = styled.div`
  padding: 10px 0;
  flex: 1;
`;

const NavItemStyled = styled.div<{ active?: boolean; toolColor: string }>`
  padding: 6px 12px;
  background: ${props => props.active ? 'rgba(0, 245, 255, 0.06)' : 'transparent'};
  border-left: 2px solid ${props => props.active ? props.toolColor : 'transparent'};
  cursor: pointer;
  
  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`;

const SidebarFooter = styled.div`
  padding: 10px 12px;
  border-top: 1px solid ${COLORS.border};
`;

const Main = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const TopBar = styled.div`
  height: 34px;
  border-bottom: 1px solid ${COLORS.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  background: ${COLORS.surface};
`;

interface ToolShellProps {
  toolName: string;
  toolColor: string;
  activeNav: string;
  onBack: () => void;
  children: React.ReactNode;
}

const ToolShell: React.FC<ToolShellProps> = ({ toolColor, activeNav, onBack, children }) => {
  return (
    <ShellLayout>
      <Sidebar>
        <SidebarHeader>
          <div className="wf-title" style={{ fontSize: 12, color: COLORS.cyan, letterSpacing: '0.1em' }}>AGILE//FREE</div>
          <div className="wf-label" style={{ fontSize: 7, color: COLORS.muted, marginTop: 2 }}>pm tools for teams</div>
        </SidebarHeader>

        <NavList>
          {[
            { label: '// home', id: 'home' },
            { label: '// poker', id: 'poker' },
            { label: '// retro', id: 'retro' },
            { label: '// stories', id: 'stories' },
            { label: '// about', id: 'about' },
          ].map(({ label, id }) => {
            const active = activeNav === id;
            return (
              <NavItemStyled 
                key={label} 
                active={active} 
                toolColor={toolColor}
                onClick={() => id === 'home' && onBack()}
              >
                <span className="wf-mono" style={{ fontSize: 9, color: active ? toolColor : COLORS.secondary }}>{label}</span>
              </NavItemStyled>
            );
          })}
        </NavList>

        <SidebarFooter>
          {['poker', 'retro', 'stories'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <div style={{ width: 4, height: 4, background: COLORS.lime, borderRadius: '50%' }} />
              <span className="wf-mono" style={{ fontSize: 7, color: t === activeNav ? toolColor : COLORS.secondary }}>{t}</span>
            </div>
          ))}
        </SidebarFooter>
      </Sidebar>

      <Main>
        <TopBar>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="wf-mono" style={{ fontSize: 9, color: toolColor }}>~/{activeNav}</span>
            <Tag color={toolColor}>LIVE</Tag>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn>share link</Btn>
            <Btn onClick={onBack}>← back</Btn>
          </div>
        </TopBar>
        {children}
      </Main>
    </ShellLayout>
  );
};

export default ToolShell;
