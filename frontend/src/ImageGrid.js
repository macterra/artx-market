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

                const profileResp = await fetch(`/api/profile?userId=${userId}`);
                const profileData = await profileResp.json();
                const collection = profileData?.collections[collId];
                const assets = collection.assets;

                const imageMetadataPromises = assets.map(async (hash) => {
                    const metaResp = await fetch(`/data/assets/${hash}/meta.json`);
                    return metaResp.json();
                });

                const metadata = await Promise.all(imageMetadataPromises);
                setImages(metadata);
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
                <Link key={index} to={`/image/${metadata.asset.hash}`}>
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
