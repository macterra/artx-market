import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [images, setImages] = useState([]);

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('image', file);

    try {
      setUploadStatus('Image uploading...');

      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
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
    fetch('http://localhost:5000/api/data')
      .then((response) => response.json())
      .then((data) => setMessage(data.message));
  }, []);

  const fetchImages = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/images');
      const data = await response.json();
      setImages(data);
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [uploadStatus]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>{message}</h1>
        <input type="file" onChange={handleUpload} />
        <p>{uploadStatus}</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gridGap: '16px',
          }}
        >
          {images.map((image, index) => (
            <img
              key={index}
              src={`http://localhost:5000/uploads/${image}`}
              alt={`Uploaded ${image}`}
              style={{ width: '100%', height: 'auto' }}
            />
          ))}
        </div>
      </header>
    </div>
  );
}

export default App;