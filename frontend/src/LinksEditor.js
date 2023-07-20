import React, { useState, useEffect } from 'react';
import { Button, TextField, List, ListItem, ListItemText, Grid } from '@mui/material';

const LinksEditor = ({ navigate }) => {
    const [links, setLinks] = useState([]);
    const [selectedLinkIndex, setSelectedLinkIndex] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                let response = await fetch(`/api/v1/profile`);
                const profileData = await response.json();

                if (profileData.links) {
                    setLinks(profileData.links);
                }
                else {
                    setLinks([{ name: "name", url: "http://" }]);
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
                //console.log('Profile updated successfully');
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
            { name: "name", url: "http://" },
        ]);
        setSelectedLinkIndex(links.length);
    };

    const handleRemoveLink = async () => {
        setLinks(links.filter((_, index) => index !== selectedLinkIndex));
        setSelectedLinkIndex(0);
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
        <div>
            <Grid container direction="row" alignItems="left" spacing={3} >
                <Grid item xs={4}>
                    <List>
                        {links && links.map((link, index) => (
                            <ListItem
                                button
                                key={index}
                                onClick={() => setSelectedLinkIndex(index)}
                                selected={index === selectedLinkIndex}
                            >
                                <ListItemText primary={link.name} />
                            </ListItem>
                        ))}
                    </List>
                </Grid>
                <Grid item xs={8}>
                    <Grid container direction="column" justifyContent="flex-start" alignItems="center" spacing={3} >
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
                                <Button variant="contained" color="primary" onClick={handleSaveClick}>
                                    Save
                                </Button>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </div >
    );
};

export default LinksEditor;
