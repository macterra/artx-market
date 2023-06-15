
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box } from '@mui/material';

const ProfileHeader = ({ navigate }) => {
    const { userId, collId } = useParams();
    const [profile, setProfile] = useState(null);

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

    return (
        <>
            <Box display="flex" flexDirection="row" alignItems="center" mt={2} mb={2}>
                {profile.pfp && (
                    <img
                      src={profile.pfp}
                      alt="Profile pic"
                      style={{
                        width: '100px',
                        height: '100px',
                        objectFit: 'cover',
                        marginRight: '16px',
                        borderRadius: '50%', // Add this line to create a circular mask
                      }}
                    />
                )}
                <div>
                    <h2 style={{ margin: 0 }}>{profile.name}</h2>
                    <p style={{ margin: 0 }}>{profile.tagline}</p>
                </div>
            </Box>
        </>
    );
};

export default ProfileHeader;
