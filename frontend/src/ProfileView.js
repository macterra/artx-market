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
                const response = await fetch(`/api/profile/${userId}`);
                const profileData = await response.json();
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
            {profile.collections.length === 0 &&
                <p>{profile.name} has not yet shared anything. Stay tuned!</p>
            }
            {profile.collections.length > 0 &&
                <div>
                    <p>Collections</p>
                    <CollectionGrid userId={profile.id} list={profile.collections} />
                </div>
            }
        </Box>
    );
};

export default ProfileView;
