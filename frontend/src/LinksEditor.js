import React, { useState, useEffect } from 'react';
import { Button, TextField, Grid, Select, MenuItem } from '@mui/material';

const LinksEditor = ({ navigate }) => {
    const [links, setLinks] = useState([]);
    const [selectedLinkIndex, setSelectedLinkIndex] = useState(null);
    const [saved, setSaved] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                let response = await fetch(`/api/v1/profile`);
                const profileData = await response.json();

                if (profileData.links) {
                    setLinks(profileData.links);
                }
                else {
                    setLinks([{ name: "name", url: "https://" }]);
                }
                setSelectedLinkIndex(0);
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchProfile();
    }, []);

    const handleSaveClick = async () => {
        try {
            const response = await fetch('/api/v1/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ links: links }),
            });

            if (response.ok) {
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

    const handleAddLink = async () => {
        setLinks([
            ...links,
            { name: "name", url: "https://" },
        ]);
        setSelectedLinkIndex(links.length);
        setSaved(false);
    };

    const handleRemoveLink = async () => {
        setLinks(links.filter((_, index) => index !== selectedLinkIndex));
        setSelectedLinkIndex(0);
        setSaved(false);
    };

    const handleLinkNameChange = (e, index) => {
        const newLinks = [...links];
        newLinks[index].name = e.target.value;
        setLinks(newLinks);
    };

    const handleLinkUrlChange = (e, index) => {
        const newLinks = [...links];
        newLinks[index].url = e.target.value;
        setLinks(newLinks);
    };

    return (
        <Grid container direction="column" justifyContent="flex-start" alignItems="center" spacing={3} >
            <Grid item>
                <Select
                    style={{ width: '300px' }}
                    value={selectedLinkIndex}
                    fullWidth
                    onChange={(event) => setSelectedLinkIndex(event.target.value)}
                >
                    {links && links.map((link, index) => (
                        <MenuItem value={index} key={index}>
                            {link.name}
                        </MenuItem>
                    ))}
                </Select>
            </Grid>
            <Grid item>
                {selectedLinkIndex !== null &&
                    <form style={{ width: '300px' }}>
                        <TextField
                            label="Link Name"
                            value={links[selectedLinkIndex].name}
                            onChange={(e) =>
                                handleLinkNameChange(e, selectedLinkIndex)
                            }
                            fullWidth
                            margin="normal"
                        />
                        <TextField
                            label="URL"
                            value={links[selectedLinkIndex].url}
                            onChange={(e) =>
                                handleLinkUrlChange(e, selectedLinkIndex)
                            }
                            fullWidth
                            margin="normal"
                        />
                    </form>
                }
            </Grid>
            <Grid container direction="row" justifyContent="center" alignItems="center" spacing={3} >
                <Grid item>
                    <Button variant="contained" color="primary" onClick={handleAddLink} disabled={links.length > 5}>
                        Add Link
                    </Button>
                </Grid>
                <Grid item>
                    <Button variant="contained" color="primary" onClick={handleRemoveLink} disabled={links.length < 2}>
                        Remove
                    </Button>
                </Grid>
                <Grid item>
                    <Button variant="contained" color="primary" onClick={handleSaveClick} disabled={saved}>
                        Save
                    </Button>
                </Grid>
            </Grid>
        </Grid>
    );
};

export default LinksEditor;
