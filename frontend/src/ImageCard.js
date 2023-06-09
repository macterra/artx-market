
import React from 'react';

const ImageCard = ({ metadata }) => {
    const cardStyle = {
        width: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        border: metadata.token ? '1px solid #0f0' : '1px solid #ccc', // Conditionally set the border color
        borderRadius: '4px', // Add a border radius
        padding: '8px', // Add padding
    };

    const imgContainerStyle = {
        width: '100%',
        height: '200px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
    };

    const imgStyle = {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        position: 'absolute',
    };

    const titleStyle = {
        marginTop: '8px',
        fontSize: '14px',
        color: '#ffffff',
    };

    return (
        <div style={cardStyle}>
            <div style={imgContainerStyle}>
                <img src={metadata.file.path} style={imgStyle} alt={metadata.asset.title || 'untitled'} />
            </div>
            <p style={titleStyle}>{metadata.asset.title || 'untitled'}</p>
            {metadata.label &&
                <p style={titleStyle}>{metadata.label}</p>
            }
        </div>
    );
};

export default ImageCard;
