
import React, { useState, useEffect } from 'react';
import { Grid, Button, TextField } from '@mui/material';

const NameEditor = ({ profile, setRefreshProfile }) => {
    const [name, setName] = useState(null);
    const [tagline, setTagline] = useState(null);
    const [saved, setSaved] = useState(true);

    useEffect(() => {
        const initState = async () => {
            setName(profile.name);
            setTagline(profile.tagline);
        };

        initState();
    }, [profile]);

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
                setRefreshProfile((prevKey) => prevKey + 1);
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
                        inputProps={{ maxLength: 30 }}
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
                        inputProps={{ maxLength: 30 }}
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
