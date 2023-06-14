
import React, { useState, useEffect } from 'react';
import { Button } from '@mui/material';

const PfpEditor = ({ metadata, setTab }) => {
    const [profile, setProfile] = useState({});

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(`/api/profile`);
                const data = await response.json();
                setProfile(data);
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchProfile();
    }, [metadata]);

    const handleSaveClick = async () => {
        try {
            profile.pfp = metadata.file.path;

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
            <form>
                <Button variant="contained" color="primary" onClick={handleSaveClick}>
                    Set Profile Pic
                </Button>
            </form>
        </div >
    );
};

export default PfpEditor;
