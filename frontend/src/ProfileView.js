
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Tabs, Tab } from '@mui/material';

const ProfileView = ({ navigate }) => {
    const { userId, collId } = useParams();
    const [profile, setProfile] = useState(null);
    const [selectedCollectionIndex, setSelectedCollectionIndex] = useState(null);

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
    }, [navigate, userId, collId]);

    if (!profile) {
        return <p>Loading profile...</p>;
    }

    const handleEditClick = () => {
        navigate('/profile/edit');
    };

    const handleCollectionChange = (event, newIndex) => {
        setSelectedCollectionIndex(newIndex);
        navigate(`/profile/${userId}/${newIndex}`);
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
            <p>Collections</p>
            <Tabs
                value={selectedCollectionIndex}
                onChange={handleCollectionChange}
                indicatorColor="primary"
                textColor="primary"
                variant="scrollable"
                scrollButtons="auto"
            >
                {profile.collections.map((collection, index) => (
                    <Tab key={index} label={collection.name} />
                ))}
            </Tabs>
        </>
    );
};

export default ProfileView;
