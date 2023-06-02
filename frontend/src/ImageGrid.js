import React, { useEffect, useState } from 'react';

const ImageGrid = ({ refreshKey }) => {
    const [images, setImages] = useState([]);

    useEffect(() => {
        const fetchAssets = async () => {
          try {
            const response = await fetch('/api/assets');
            const imageMetadata = await response.json();
            setImages(imageMetadata);
          } catch (error) {
            console.error('Error fetching image metadata:', error);
          }
        };
        fetchAssets();
    }, [refreshKey]);

    return (
        <div
            className="image-grid"
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gridGap: '16px',
            }}
        >
            {images.map((metadata, index) => (
                <img
                    key={index}
                    src={metadata.asset.path}
                    alt={index}
                    style={{ width: '100%', height: 'auto' }} />
            ))}
        </div>
    );
};

export default ImageGrid;
