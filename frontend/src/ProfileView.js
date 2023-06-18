import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box } from '@mui/material';

const ProfileView = ({ navigate }) => {
    const { userId } = useParams();
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                let response = await fetch(`/api/profile/${userId}`);
                const profileData = await response.json();

                setProfile(profileData);

                // const response2 = await fetch(`/api/collection/${userId}/${collId}`);
                // const collectionData = await response2.json();

                // setCollection(collectionData);
                // setTab(parseInt(collId, 10));
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
            <p style={{ textAlign: 'left' }}>Collections</p>
            <p>{ profile.id }</p>
            <p>{ profile.name }</p>
        </Box>
    );
};

export default ProfileView;
