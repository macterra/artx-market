import React from 'react';

const ImageCard = ({ src, alt }) => {
  const cardStyle = {
    width: '200px',
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

  return (
    <div style={cardStyle}>
      <img src={src} alt={alt} style={imgStyle} />
    </div>
  );
};

export default ImageCard;
