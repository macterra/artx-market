import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { Button, TextField, Grid, Select, MenuItem } from '@mui/material';

const LinksEditor = ({ navigate }) => {
    const [links, setLinks] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [saved, setSaved] = useState(true);
    const [disableButtons, setDisableButtons] = useState(false);
    const [refreshProfile, setRefreshProfile] = useState(0);
    const newLink = { name: "name", url: "https://" };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const getProfile = await axios.get(`/api/v1/profile`);
                const profileData = getProfile.data;
                const links = profileData.links || [newLink];

                setLinks(links);

                if (!selectedIndex || selectedIndex >= links.length) {
                    setSelectedIndex(0);
                }
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchProfile();
    }, [refreshProfile]);

    const handleSaveClick = async () => {
        setDisableButtons(true);

        try {
            await axios.patch('/api/v1/profile', { links: links });
            setSaved(true);
            setRefreshProfile((prevKey) => prevKey + 1);
        } catch (error) {
            console.error('Error updating profile:', error);
            alert(`Error saving: ${error.response.data?.message || error}`);
        }

        setDisableButtons(false);
    };

    const handleAddLink = async () => {
        const newLinks = [...links, newLink];
        setLinks(newLinks);
        setSelectedIndex(links.length);
        setSaved(false);
    };

    const handleRemoveLink = async () => {
        const newLinks = links.filter((_, index) => index !== selectedIndex);
        setSelectedIndex(0);
        setLinks(newLinks);
        setSaved(false);
    };

    const handleLinkNameChange = (e, index) => {
        const newLinks = [...links];
        newLinks[index].name = e.target.value;
        setLinks(newLinks);
        setSaved(false);
    };

    const handleLinkUrlChange = (e, index) => {
        const newLinks = [...links];
        newLinks[index].url = e.target.value;
        setLinks(newLinks);
        setSaved(false);
    };

    if (!links || selectedIndex >= links.length) {
        return (
            <Grid container direction="row" justifyContent="center" alignItems="center" spacing={3} >
                <Grid item>
                    <Button variant="contained" color="primary" onClick={handleAddLink} disabled={links.length > 5 || disableButtons}>
                        Add Link
                    </Button>
                </Grid>
                <Grid item>
                    <Button variant="contained" color="primary" onClick={handleSaveClick} disabled={saved || disableButtons}>
                        Save
                    </Button>
                </Grid>
            </Grid>
        );
    }

    return (
        <Grid container direction="column" justifyContent="flex-start" alignItems="center" spacing={3} >
            <Grid item>
                <Select
                    style={{ width: '300px' }}
                    value={selectedIndex}
                    fullWidth
                    onChange={(event) => setSelectedIndex(event.target.value)}
                >
                    {links && links.map((link, index) => (
                        <MenuItem value={index} key={index}>
                            {link.name}
                        </MenuItem>
                    ))}
                </Select>
            </Grid>
            <Grid item>
                {selectedIndex !== null &&
                    <form style={{ width: '300px' }}>
                        <TextField
                            label="Link Name"
                            value={links[selectedIndex].name}
                            onChange={(e) =>
                                handleLinkNameChange(e, selectedIndex)
                            }
                            fullWidth
                            margin="normal"
                        />
                        <TextField
                            label="URL"
                            value={links[selectedIndex].url}
                            onChange={(e) =>
                                handleLinkUrlChange(e, selectedIndex)
                            }
                            fullWidth
                            margin="normal"
                        />
                    </form>
                }
            </Grid>
            <Grid container direction="row" justifyContent="center" alignItems="center" spacing={3} >
                <Grid item>
                    <Button variant="contained" color="primary" onClick={handleAddLink} disabled={links.length > 5 || disableButtons}>
                        Add Link
                    </Button>
                </Grid>
                <Grid item>
                    <Button variant="contained" color="primary" onClick={handleRemoveLink} disabled={disableButtons}>
                        Remove
                    </Button>
                </Grid>
                <Grid item>
                    <Button variant="contained" color="primary" onClick={handleSaveClick} disabled={saved || disableButtons}>
                        Save
                    </Button>
                </Grid>
            </Grid>
        </Grid>
    );
};

export default LinksEditor;
