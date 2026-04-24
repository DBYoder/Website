import React from 'react';
import styled from 'styled-components';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { GlobalStyles } from './GlobalStyles';
import LandingPage from './pages/LandingPage';
import PokerTool from './pages/PokerTool';
import RetroTool from './pages/RetroTool';
import StoryTool from './pages/StoryTool';
import WBSTool from './pages/WBSTool';

const AppContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  overflow: hidden;

  @media (max-width: 768px) {
    height: auto;
    min-height: 100svh;
    overflow: visible;
  }
`;

const NavigationWrapper: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route path="/" element={<LandingPage onLaunch={(tool) => navigate(`/${tool}`)} />} />
      <Route path="/poker" element={<PokerTool onBack={() => navigate('/')} />} />
      <Route path="/retro" element={<RetroTool onBack={() => navigate('/')} />} />
      <Route path="/stories" element={<StoryTool onBack={() => navigate('/')} />} />
      <Route path="/wbs" element={<WBSTool onBack={() => navigate('/')} />} />
      <Route path="*" element={<LandingPage onLaunch={(tool) => navigate(`/${tool}`)} />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <GlobalStyles />
      <AppContainer>
        <NavigationWrapper />
      </AppContainer>
    </Router>
  );
};

export default App;
