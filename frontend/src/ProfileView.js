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
                const collections = Object.values(profileData.collections);

                console.log(profileData);
                console.log(collections);

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
            {collections.length === 0 &&
                <p>{profile.name} has not yet shared anything. Stay tuned!</p>
            }
            {collections.length > 0 &&
                <div>
                    <p>Collections</p>
                    <CollectionGrid userId={profile.id} list={collections} />
                </div>
            }
        </Box>
    );
};

export default ProfileView;
