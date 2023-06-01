import React, { useState, useEffect } from 'react';
import './App.css';
import ImageGrid from './ImageGrid';
import BuildTime from './BuildTime';

function App() {
  const [message, setMessage] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [images, setImages] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

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

  useEffect(() => {
    fetch('/api/data')
      .then((response) => response.json())
      .then((data) => setMessage(data.message));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <BuildTime />
        <h1>{message}</h1>
        <input type="file" onChange={handleUpload} />
        <p>{uploadStatus}</p>
        <ImageGrid refreshKey={refreshKey} />
      </header>
    </div>
  );
}

export default App;
