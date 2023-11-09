import React from 'react';
import { Link } from 'react-router-dom';
import CollectionCard from './CollectionCard';

const CollectionGrid = ({ collections }) => {

    if (collections.length === 0) {
        return <p style={{ textAlign: 'center' }}>0 items</p>;
    }

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
            {collections.map((collection, index) => (
                <Link key={index} to={`/collection/${collection.xid}`} style={{ margin: '8px', textDecoration: 'none' }}>
                    <CollectionCard key={index} collection={collection} />
                </Link>
            ))}
        </div>
    );
};

export default CollectionGrid;
