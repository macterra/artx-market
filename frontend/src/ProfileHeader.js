
import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';

const ProfileHeader = ({ userId }) => {
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                if (!userId) {
                    const response = await fetch(`/api/v1/profile`);
                    const profileData = await response.json();
                    setProfile(profileData);
                } else {
                    const response = await fetch(`/api/v1/profile/${userId}`);
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

    const minilinkStyle = {
        margin: '8px',
        textDecoration: 'none',
        fontSize: '12px',
    };

    return (
        <Box display="flex" flexDirection="row" alignItems="center" style={{ minHeight: 'auto' }}>
            <a href={`/profile/${profile.xid}`} style={linkStyle}>
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
                <a href={`/profile/${profile.xid}`} style={linkStyle}>
                    <span>{profile.name}</span>
                </a>
                {profile.deposit &&
                    <a href={`lightning:${profile.deposit}`} style={linkStyle}>⚡</a>
                }
                <span style={{ fontSize: '12px', display: 'block' }}>{profile.tagline}</span>
            </div>
            {profile.links &&
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {profile.links.map((link, index) => (
                        <a href={`${link.url}`} target="_blank" rel="noopener noreferrer" style={minilinkStyle}>
                            {link.name}🔗
                        </a>
                    ))}
                </div>
            }
        </Box >
    );
};

export default ProfileHeader;
