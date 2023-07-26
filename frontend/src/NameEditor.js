
import React, { useState } from 'react';
import { Grid, Button, TextField } from '@mui/material';

const NameEditor = ({ profile }) => {
    const [name, setName] = useState(profile.name);
    const [tagline, setTagline] = useState(profile.tagline);
    const [saved, setSaved] = useState(true);

    const handleSaveClick = async () => {
        try {
            const response = await fetch('/api/v1/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ name: name, tagline: tagline }),
            });

            if (response.ok) {
                profile.name = name;
                profile.tagline = tagline;
                setSaved(true);
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
        <Grid container direction="column" justifyContent="flex-start" alignItems="center" spacing={3} >
            <Grid item>
                <form style={{ width: '300px' }}>
                    <TextField
                        label="Name"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setSaved(false);
                        }}
                        fullWidth
                        margin="normal"
                    />
                    <TextField
                        label="Tagline"
                        value={tagline}
                        onChange={(e) => {
                            setTagline(e.target.value);
                            setSaved(false);
                        }}
                        fullWidth
                        margin="normal"
                    />
                    <Button variant="contained" color="primary" onClick={handleSaveClick} disabled={saved}>
                        Save
                    </Button>
                </form>
            </Grid>
        </Grid>
    );
};

export default NameEditor;
