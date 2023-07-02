
import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';

const ProfileHeader = ({ userId }) => {
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                if (!userId) {
                    const response = await fetch(`/api/profile`);
                    const profileData = await response.json();
                    setProfile(profileData);
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
    }, [userId]);

    if (!profile) {
        return <p>Loading profile...</p>;
    }

    const linkStyle = {
        margin: '8px', // Add a margin around the ImageCard components
        textDecoration: 'none', // Remove the text decoration from the Link component
    };

    return (
        <Box display="flex" flexDirection="row" alignItems="center" style={{ minHeight: 'auto' }}>
            <a href={`/profile/${profile.id}`} style={linkStyle}>
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
            </a>
            <div>
                <a href={`/profile/${profile.id}`} style={linkStyle}>
                    <span>{profile.name}</span>
                </a>
                <span style={{ fontSize: '12px', display: 'block' }}>{profile.tagline}</span>
            </div>
        </Box>
    );
};

export default ProfileHeader;
