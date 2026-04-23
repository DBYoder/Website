import React, { useState } from 'react';
import styled from 'styled-components';
import { GlobalStyles } from './GlobalStyles';
import LandingPage from './pages/LandingPage';
import PokerTool from './pages/PokerTool';
import RetroTool from './pages/RetroTool';
import StoryTool from './pages/StoryTool';

const AppContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  overflow: hidden;
`;

const App: React.FC = () => {
  const [currentTool, setCurrentTool] = useState<'home' | 'poker' | 'retro' | 'stories'>('home');

  const renderContent = () => {
    switch (currentTool) {
      case 'poker':
        return <PokerTool onBack={() => setCurrentTool('home')} />;
      case 'retro':
        return <RetroTool onBack={() => setCurrentTool('home')} />;
      case 'stories':
        return <StoryTool onBack={() => setCurrentTool('home')} />;
      default:
        return <LandingPage onLaunch={(tool) => setCurrentTool(tool as any)} />;
    }
  };

  return (
    <>
      <GlobalStyles />
      <AppContainer>
        {renderContent()}
      </AppContainer>
    </>
  );
};

export default App;
