
import React, { useState, useEffect } from 'react';
import { Button, TextField, List, ListItem, ListItemText } from '@mui/material';

const ProfileEditor = ({ navigate }) => {
    const [profile, setProfile] = useState({});
    const [name, setName] = useState('');
    const [tagline, setTagline] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(`/api/profile`);
                const data = await response.json();
                setProfile(data);
                setName(data.name);
                setTagline(data.tagline);
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchProfile();
    }, []);

    const handleSaveClick = async () => {
        try {
            profile.name = name;
            profile.tagline = tagline;

            const response = await fetch('/api/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profile),
            });

            if (response.ok) {
                console.log('Profile updated successfully');
            } else {
                const data = await response.json();
                console.error('Error updating profile:', data.message);
                alert(data.message);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    return (
        <div>
            <h2>Edit Profile</h2>
            <form>
                <TextField
                    label="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                    margin="normal"
                />
                <TextField
                    label="Tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    fullWidth
                    margin="normal"
                />
                <Button variant="contained" color="primary" onClick={handleSaveClick}>
                    Save
                </Button>
            </form>
        </div >
    );
};

export default ProfileEditor;
