import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ImageCard from './ImageCard';

const ImageGrid = ({ collection }) => {
    const [images, setImages] = useState([]);

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                setImages(collection);
            } catch (error) {
                console.error('Error fetching image metadata:', error);
            }
        };
        fetchAssets();
    }, [collection]);

    if (!images) {
        return <p>Loading images...</p>;
    }

    const imageCardStyle = {
        margin: '8px', // Add a margin around the ImageCard components
        textDecoration: 'none', // Remove the text decoration from the Link component
    };

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'left' }}>
            {images.map((metadata, index) => (
                <Link key={index} to={`/asset/${metadata.asset.xid}`} style={imageCardStyle}>
                    <ImageCard key={index} metadata={metadata} />
                </Link>
            ))}
        </div>
    );
};

export default ImageGrid;
