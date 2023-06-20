
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ImageGrid from './ImageGrid';

const CollectionView = ({ navigate }) => {
    const { userId, collId } = useParams();
    const [profile, setProfile] = useState(null);
    const [collection, setCollection] = useState(null);
    const [collectionName, setCollectionName] = useState(null);
    const [collectionId, setCollectionId] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                let response = await fetch(`/api/profile/${userId}`);
                const profileData = await response.json();
                setProfile(profileData);

                response = await fetch(`/api/collection/${userId}/${collId}`);
                const collectionData = await response.json();
                const collectionId = parseInt(collId, 10);
                const collectionName = profileData.collections[collectionId].name;

                setCollection(collectionData);
                setCollectionId(collectionId);
                setCollectionName(collectionName);
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchProfile();
    }, [navigate, userId, collId, refreshKey]);

    if (!profile) {
        return <p>Loading profile...</p>;
    }

    const handleUpload = async (event) => {
        try {
            const files = event.target.files;
            const formData = new FormData();

            for (const file of files) {
                formData.append('images', file);
            }
            
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
            <p>{collectionName}</p>
            <ImageGrid collection={collection} />
            {collectionId === 0 &&
                <input type="file" name="images" accept="image/*" multiple onChange={handleUpload} />
            }
        </>
    );
};

export default CollectionView;
