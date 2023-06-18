import React, { useState, useEffect } from 'react';
import { useNavigate, BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import AppHeader from './AppHeader';
import MainView from './MainView';
import ProfileEditor from './ProfileEditor';
import CollectionEditor from './CollectionEditor';
import AssetView from './AssetView';
import ProfileHeader from './ProfileHeader';
import CollectionView from './CollectionView';

import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile/:userId?/:collId?" element={<ViewProfile />} />
        <Route path="/profile/edit" element={<EditProfile />} />
        <Route path="/asset/:xid" element={<ViewAsset />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <AppHeader
          isAuthenticated={isAuthenticated}
          setIsAuthenticated={setIsAuthenticated}
          navigate={navigate}
        />
        <header className="App-header">
          <MainView navigate={navigate} />
        </header>
      </div>
    </ThemeProvider>
  );
}

function ViewProfile() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const navigate = useNavigate();

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <AppHeader
          isAuthenticated={isAuthenticated}
          setIsAuthenticated={setIsAuthenticated}
          navigate={navigate}
        />
        <header className="App-header">
          <Box display="flex" flexDirection="column" flexGrow={1}>
            <ProfileHeader />
            <CollectionView navigate={navigate} />
          </Box>
        </header>
      </div>
    </ThemeProvider >
  );
}

function EditProfile() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const navigate = useNavigate();

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <AppHeader
          isAuthenticated={isAuthenticated}
          setIsAuthenticated={setIsAuthenticated}
          navigate={navigate}
        />
        <header className="App-header">
          <Box display="flex">
            <ProfileEditor navigate={navigate} />
            <CollectionEditor navigate={navigate} />
          </Box>
        </header>
      </div>
    </ThemeProvider>
  );
}

function ViewAsset() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const navigate = useNavigate();

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <AppHeader
          isAuthenticated={isAuthenticated}
          setIsAuthenticated={setIsAuthenticated}
          navigate={navigate}
        />
        <header className="App-header">
          <AssetView
            navigate={navigate}
            isAuthenticated={isAuthenticated} />
        </header>
      </div>
    </ThemeProvider>
  );
}

function NotFound() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/');
  });
}

export default App;
