import React from 'react';
import { Link } from 'react-router-dom';
import ListingCard from './ListingCard';

const ListingsGrid = ({ listings }) => {

    if (!listings) {
        return;
    }

    const imageCardStyle = {
        margin: '8px',
        textDecoration: 'none',
    };

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'left' }}>
            {listings.map((listing, index) => (
                <Link key={index} to={`/nft/${listing.asset}`} style={imageCardStyle}>
                    <ListingCard key={index} listing={listing} />
                </Link>
            ))}
        </div>
    );
};

export default ListingsGrid;
