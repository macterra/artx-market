import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box } from '@mui/material';
import CollectionGrid from './CollectionGrid';

const ProfileView = ({ navigate }) => {
    const { userId } = useParams();
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                let response = await fetch(`/api/profile/${userId}`);
                const profileData = await response.json();

                for (let i = 0; i < profileData.collections.length; i++) {
                    let collection = profileData.collections[i];
                    response = await fetch(`/api/collection/${userId}/${i}`);
                    const collectionData = await response.json();
                    collection.count = collectionData.length;

                    if (!collection.thumbnail && collection.count > 0) {
                        collection.thumbnail = collectionData[0].file.path;
                    }
                }

                console.log(profileData);
                setProfile(profileData);
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
            <CollectionGrid userId={profile.id} list={profile.collections} />
        </Box>
    );
};

export default ProfileView;
