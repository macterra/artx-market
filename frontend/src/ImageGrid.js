import React from 'react';
import { Link } from 'react-router-dom';
import ImageCard from './ImageCard';

const ImageGrid = ({ images }) => {

    if (images.length === 0) {
        return <p style={{ textAlign: 'center' }}>0 items</p>;
    }

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
            {images.map((metadata, index) => (
                <Link key={index} to={`/asset/${metadata.xid}`} style={{ margin: '8px', textDecoration: 'none' }}>
                    <ImageCard key={index} metadata={metadata} />
                </Link>
            ))}
        </div>
    );
};

export default ImageGrid;
