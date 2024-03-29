import React from 'react';
import utils from './utils';

const ImageCard = ({ metadata }) => {
    const cardStyle = {
        width: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        border: metadata.sold ? '1px solid #0ff' : metadata.token ? '1px solid #0f0' : '1px solid #ccc',
        borderRadius: '4px',
        padding: '8px',
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
            <p style={titleStyle}>{utils.truncateTitle(metadata.asset.title)}</p>
            {metadata.label &&
                <p style={titleStyle}>{metadata.label}</p>
            }
        </div>
    );
};

export default ImageCard;
