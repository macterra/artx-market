import React, { useState, useEffect } from 'react';
import { useNavigate, BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import AppHeader from './AppHeader';
//import ProfileView from './ProfileView';
//import ImageGrid from './ImageGrid';
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
        <Route path="/profile/" element={<ViewProfile />} />
        <Route path="/profile/:userId" element={<ViewProfile />} />
        <Route path="/profile/:userId/:collId" element={<ViewProfile />} />
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
  const [message, setMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/data')
      .then((response) => response.json())
      .then((data) => setMessage(data.message));
  }, []);

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
          <h1>{message}</h1>
        </header>
      </div>
    </ThemeProvider>
  );
}

function ViewProfile() {
  const [uploadStatus, setUploadStatus] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const navigate = useNavigate();

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('image', file);

    try {
      setUploadStatus('Image uploading...');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setRefreshKey((prevKey) => prevKey + 1); // Increment refreshKey after a successful upload
        setUploadStatus('Image uploaded successfully');
      } else {
        setUploadStatus('Image upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadStatus('Image upload failed');
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <AppHeader
          isAuthenticated={isAuthenticated}
          setIsAuthenticated={setIsAuthenticated}
          navigate={navigate}
        />
        {/* Update the styles for the App-header */}
        <header className="App-header" style={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <>
            {/* Wrap the ProfileView and ImageGrid components in a Box container */}
            <Box display="flex" flexDirection="column" flexGrow={1}>
              <ProfileHeader />
              <CollectionView navigate={navigate} />
            </Box>
            <input type="file" onChange={handleUpload} />
            <p>{uploadStatus}</p>
          </>
        </header>
      </div>
    </ThemeProvider>
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
          <h1>404 - Not Found</h1>
          <p>The page you are looking for does not exist.</p>
        </header>
      </div>
    </ThemeProvider>
  );
}

export default App;
