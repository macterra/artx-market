import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import AppHeader from './AppHeader';
import MainView from './MainView';
import ProfileEditor from './ProfileEditor';
import AssetView from './AssetView';
import ProfileHeader from './ProfileHeader';
import ProfileView from './ProfileView';
import CollectionView from './CollectionView';

import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile/" element={<ViewLogin />} />
        <Route path="/profile/:userId" element={<ViewProfile />} />
        <Route path="/profile/edit" element={<EditProfile />} />
        <Route path="/collection/:xid" element={<ViewCollection />} />
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

function ViewLogin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/profile`);
        const profileData = await response.json();

        if (profileData.xid) {
          navigate(`/profile/${profileData.xid}`);
        }
        else {
          navigate('/');
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      }
    };

    fetchProfile();
  });

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
          <p>Login to visit your profile</p>
        </header>
      </div>
    </ThemeProvider>
  );
}

function ViewProfile() {
  const { userId } = useParams();
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
            <ProfileHeader userId={userId} />
            <ProfileView navigate={navigate} />
          </Box>
        </header>
      </div>
    </ThemeProvider >
  );
}

function ViewCollection() {
  const { xid } = useParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/collections/${xid}`);
        const collectionData = await response.json();

        if (collectionData.error) {
          navigate('/');
        }
        else {
          setUserId(collectionData.asset.owner);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      }
    };

    fetchProfile();
  });

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
            <ProfileHeader userId={userId} />
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
          <Box display="flex" flexDirection="column" flexGrow={1}>
            <ProfileEditor navigate={navigate} />
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
