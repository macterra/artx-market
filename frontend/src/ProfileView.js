
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@mui/material';

const ProfileView = ({ navigate }) => {
    const { userId, collId } = useParams();
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                if (!userId) {
                    const response = await fetch(`/api/profile`);
                    const profileData = await response.json();
                    navigate(`/profile/${profileData.id}/${profileData.defaultCollection}`);
                } else if (!collId) {
                    const response = await fetch(`/api/profile?userId=${userId}`);
                    const profileData = await response.json();
                    navigate(`/profile/${userId}/${profileData.defaultCollection}`);
                } else {
                    const response = await fetch(`/api/profile?userId=${userId}`);
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

    const handleEditClick = () => {
        navigate('/profile/edit');
    };

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '90%' }}>
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
