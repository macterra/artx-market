
import React, { useState, useEffect } from 'react';
import { Button } from '@mui/material';

const ProfileView = ({ userId, navigate }) => {
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(`/api/profile${userId ? `?userId=${userId}` : ''}`);
                const data = await response.json();
                setProfile(data);
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchProfile();
    }, [userId]);

    if (!profile) {
        return <p>Loading profile...</p>;
    }

    const handleEditClick = () => {
        navigate('/profile/edit');
    };

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                <Button variant="contained" color="primary" onClick={handleEditClick}>
                    Edit
                </Button>
            </div>
            <div>
                {profile.pfp && (
                    <img
                        src={profile.pfp}
                        alt="Profile pic"
                        style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                    />
                )}
                <h2>{profile.name}</h2>
                <p>{profile.tagline}</p>
            </div>
        </>
    );
};

export default ProfileView;