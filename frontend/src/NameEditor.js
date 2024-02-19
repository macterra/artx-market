
import React, { useState, useEffect } from 'react';
import { Grid, Button, TextField } from '@mui/material';
import axios from 'axios';

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

        const newName = name.trim();

        if (!newName) {
            alert("Name can't be blank");
            return;
        }

        let newTagline = tagline.trim();

        if (!newTagline) {
            newTagline = " ";
        }

        try {
            await axios.patch('/api/v1/profile', { name: newName, tagline: newTagline });
            profile.name = newName;
            profile.tagline = newTagline;
            setSaved(true);
            setRefreshProfile((prevKey) => prevKey + 1);
        }
        catch (error) {
            console.error('Error updating profile:', error);
            alert("Could not save");
        }

        setName(newName);
        setTagline(newTagline);
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
