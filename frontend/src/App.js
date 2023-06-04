import React, { useState, useEffect } from 'react';
import { useNavigate, BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AppHeader from './AppHeader';
import ProfileView from './ProfileView';
import ProfileEditor from './ProfileEditor';
import ImageGrid from './ImageGrid';
import ImageDetails from './ImageDetails';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/edit" element={<EditProfile />} />
        <Route path="/image/:hash" element={<ImageView />} />
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

function Profile() {
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
      <div className="App">
        <AppHeader
          isAuthenticated={isAuthenticated}
          setIsAuthenticated={setIsAuthenticated}
          navigate={navigate}
        />
        <header className="App-header">
          {isAuthenticated ? (
            <>
              <ProfileView navigate={navigate} />
              <input type="file" onChange={handleUpload} />
              <p>{uploadStatus}</p>
              <ImageGrid refreshKey={refreshKey} />
            </>
          ) : (
            <p>Please log in to view and upload images.</p>
          )}
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
      <div className="App">
        <AppHeader
          isAuthenticated={isAuthenticated}
          setIsAuthenticated={setIsAuthenticated}
          navigate={navigate}
        />
        <header className="App-header">
          <ProfileEditor />
        </header>
      </div>
    </ThemeProvider>
  );
}

function ImageView() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const navigate = useNavigate();

  return (
    <ThemeProvider theme={darkTheme}>
      <div className="App">
        <AppHeader
          isAuthenticated={isAuthenticated}
          setIsAuthenticated={setIsAuthenticated}
          navigate={navigate}
        />
        <header className="App-header">
          <ImageDetails />
        </header>
      </div>
    </ThemeProvider>
  );
}

export default App;
