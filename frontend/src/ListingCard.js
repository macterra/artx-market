import React, { useState, useEffect } from 'react';

const ListingCard = ({ listing }) => {

    const cardStyle = {
        width: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        border: listing.pro ? '1px solid #0ff' : listing.published ? '1px solid #0f0' : '1px solid #ccc',
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
        borderRadius: '50%',
    };

    const titleStyle = {
        marginTop: '8px',
        fontSize: '14px',
        color: '#ffffff',
    };

    const textStyle = {
        margin: '2px',
        fontSize: '10px',
        color: '#ffffff',
    };

    return (
        <div style={cardStyle}>
            <div style={imgContainerStyle}>
                <img src={listing.image} style={imgStyle} alt={listing.title} />
            </div>
            <p style={titleStyle}>{listing.title}</p>
            <span style={textStyle}>for {listing.price} sats</span>
        </div>
    );
};

export default ListingCard;
