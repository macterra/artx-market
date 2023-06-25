import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box } from '@mui/material';
import CollectionGrid from './CollectionGrid';

const ProfileView = ({ navigate }) => {
    const { userId } = useParams();
    const [profile, setProfile] = useState(null);
    const [collections, setCollections] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                let response = await fetch(`/api/profile/${userId}`);
                const profileData = await response.json();
                const collections = [];

                const createdId = profileData.assets.created;
                response = await fetch(`/api/collections/${createdId}`);
                let collectionData = await response.json();
                collections.push(collectionData);

                for (const xid of profileData.collections) {
                    response = await fetch(`/api/collections/${xid}`);
                    let collectionData = await response.json();
                    collections.push(collectionData);
                }

                console.log(profileData);
                setProfile(profileData);
                setCollections(collections);
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchProfile();
    }, [navigate, userId]);

    if (!profile) {
        return <p>Loading profile...</p>;
    }

    return (
        <Box>
            <p>Collections</p>
            <CollectionGrid userId={profile.id} list={collections} />
        </Box>
    );
};

export default ProfileView;
