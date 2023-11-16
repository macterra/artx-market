
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button } from '@mui/material';

const ProfileHeader = () => {
    const { xid } = useParams();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(`/api/v1/profile/${xid}`);
                const profileData = await response.json();
                setProfile(profileData);
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchProfile();
    }, [xid]);

    if (!profile) {
        return <p>...</p>;
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
        <Box display="flex" flexDirection="row" alignItems="center" justifyContent="space-between" style={{ minHeight: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
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
                    <span>{profile.name}</span>
                    {profile.deposit &&
                        <a href={`lightning:${profile.deposit}`} style={linkStyle} title={`zap ${profile.name} some sats!`}>⚡</a>
                    }
                    <span style={{ fontSize: '12px', display: 'block' }}>{profile.tagline}</span>
                </div>
                {profile.links &&
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                        {profile.links.map((link, index) => (
                            <a href={`${link.url}`} target="_blank" rel="noopener noreferrer" style={minilinkStyle}>
                                {link.name}🔗
                            </a>
                        ))}
                    </div>
                }
            </div>
            {profile.isUser &&
                <div style={{ marginLeft: 'auto', marginRight: '20px' }}>
                    {false &&
                        <Button variant="contained" color="primary" onClick={() => navigate('/profile/edit/coll')} style={{ marginRight: '10px' }}>
                            Edit Collections
                        </Button>
                    }
                    <Button variant="contained" color="primary" onClick={() => navigate('/profile/edit/credits')}>
                        Credits: {profile.credits}
                    </Button>
                </div>
            }
        </Box >
    );
};

export default ProfileHeader;
