
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, Tab } from '@mui/material';
import ImageGrid from './ImageGrid';

const CollectionView = ({ navigate }) => {
    const { userId, collId } = useParams();
    const [profile, setProfile] = useState(null);
    const [selectedCollectionIndex, setSelectedCollectionIndex] = useState(null);
    const [collection, setCollection] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                if (!userId) {
                    const response = await fetch(`/api/profile`);
                    const profileData = await response.json();

                    if (!profileData.id) {
                        navigate('/');
                    } else {
                        navigate(`/profile/${profileData.id}/${profileData.defaultCollection}`);
                    }
                } else if (!collId) {
                    const response = await fetch(`/api/profile/${userId}`);
                    const profileData = await response.json();
                    navigate(`/profile/${userId}/${profileData.defaultCollection}`);
                } else {
                    const response = await fetch(`/api/profile/${userId}`);
                    const profileData = await response.json();
                    setProfile(profileData);

                    const response2 = await fetch(`/api/collection/${userId}/${collId}`);
                    const collectionData = await response2.json();

                    setCollection(collectionData);
                }
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchProfile();
    }, [navigate, userId, collId]);

    if (!profile) {
        return <p>Loading profile...</p>;
    }

    const handleCollectionChange = (event, newIndex) => {
        setSelectedCollectionIndex(newIndex);
        navigate(`/profile/${userId}/${newIndex}`);
    };

    return (
        <>
            <p style={{ textAlign: 'left' }}>Collections</p>
            <Tabs
                value={selectedCollectionIndex}
                onChange={handleCollectionChange}
                indicatorColor="primary"
                textColor="primary"
                variant="scrollable"
                scrollButtons="auto"
            >
                {profile.collections.map((collection, index) => (
                    <Tab key={index} label={collection.name} />
                ))}
            </Tabs>
            <ImageGrid collection={collection} />
        </>
    );
};

export default CollectionView;
