
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
            const response = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ pfp: metadata.file.path }),
            });

            if (response.ok) {
                profile.pfp = metadata.file.path;
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
            <img
                src={metadata.file.path}
                alt={metadata.asset.title}
                style={{
                    width: '200px',
                    height: '200px',
                    objectFit: 'cover',
                    marginTop: '50px',
                    borderRadius: '50%', // Add this line to create a circular mask
                }}
            />
            <form>
                <Button variant="contained" color="primary" onClick={handleSaveClick}>
                    Set Profile Pic
                </Button>
            </form>
        </div >
    );
};

export default PfpEditor;
