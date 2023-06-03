
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const ImageDetails = () => {
  const { hash } = useParams();
  const [image, setImage] = useState(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch(`/data/assets/${hash}/meta.json`);
        const metadata = await response.json();
        setImage(metadata);
      } catch (error) {
        console.error('Error fetching image metadata:', error);
      }
    };

    fetchMetadata();
  }, [hash]);

  if (!image) {
    return <p>Loading...</p>;
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div style={{ width: '50%', padding: '16px' }}>
        <img src={image.asset.path} alt={image.asset.filename} style={{ width: '100%', height: 'auto' }} />
      </div>
      <div style={{ width: '50%', padding: '16px' }}>
        <h2>Metadata:</h2>
        <p>Filename: {image.asset.fileName}</p>
        <p>File size: {image.asset.fileSize} bytes</p>
        {/* Add any other metadata you want to display */}
      </div>
    </div>
  );
};

export default ImageDetails;