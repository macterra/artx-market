
import React, { useState } from 'react';
import { Button, TextField } from '@mui/material';

const ProfileEditor = () => {
    const [name, setName] = useState('');
    const [tagline, setTagline] = useState('');

    const handleSaveClick = () => {
        // Add your logic to save the updated name and tagline here
        console.log('Save button clicked');
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
        </div>
    );
};

export default ProfileEditor;
