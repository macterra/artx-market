import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CollectionCard from './CollectionCard';

const CollectionGrid = ({ userId, list }) => {
    const [collections, setCollections] = useState([]);

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                setCollections(list);
            } catch (error) {
                console.error('Error fetching image metadata:', error);
            }
        };
        fetchAssets();
    }, [list]);

    if (!collections) {
        return <p></p>;
    }

    const imageCardStyle = {
        margin: '8px', // Add a margin around the ImageCard components
        textDecoration: 'none', // Remove the text decoration from the Link component
    };

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
            {collections.map((collection, index) => (
                <Link key={index} to={`/collection/${collection.xid}`} style={imageCardStyle}>
                    <CollectionCard key={index} collection={collection} />
                </Link>
            ))}
        </div>
    );
};

export default CollectionGrid;
