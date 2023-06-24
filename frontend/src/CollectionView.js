
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ImageGrid from './ImageGrid';

const CollectionView = ({ navigate }) => {
    const { xid } = useParams();
    const [collection, setCollection] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(`/api/collections/${xid}`);
                const collectionData = await response.json();
                setCollection(collectionData);
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchProfile();
    }, [navigate, xid, refreshKey]);

    if (!collection) {
        return <p>Loading...</p>;
    }

    const handleUpload = async (event) => {
        try {
            const files = event.target.files;
            const formData = new FormData();

            for (const file of files) {
                formData.append('images', file);
            }

            formData.append('collectionId', collection.asset.xid);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setRefreshKey((prevKey) => prevKey + 1); // Increment refreshKey after a successful upload
            }
        } catch (error) {
            console.error('Error uploading image:', error);
        }
    };

    return (
        <>
            <p>{collection.asset.title}</p>
            {collection.isOwnedByUser &&
                <input type="file" name="images" accept="image/*" multiple onChange={handleUpload} />
            }
            <ImageGrid collection={collection.collection.assets} />
        </>
    );
};

export default CollectionView;
