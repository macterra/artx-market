import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

const ImageGrid = ({ refreshKey }) => {
    const { userId, collId } = useParams();
    const [images, setImages] = useState([]);

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                console.log(`userId=${userId}`);
                console.log(`collId= ${collId}`);

                if (typeof userId === 'undefined' || typeof collId === 'undefined') {
                    return;
                }

                const response = await fetch(`/api/collection/${userId}/${collId}`);
                const collection = await response.json();

                setImages(collection);
            } catch (error) {
                console.error('Error fetching image metadata:', error);
            }
        };
        fetchAssets();
    }, [refreshKey, userId, collId]);

    if (!images) {
        return <p>Loading images...</p>;
    }

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
                <Link key={index} to={`/image/${metadata.asset.xid}`}>
                    <img
                        key={index}
                        src={metadata.asset.path}
                        alt={index}
                        style={{ width: '100%', height: 'auto' }} />
                </Link>
            ))}
        </div>
    );
};

export default ImageGrid;
