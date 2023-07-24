
import React, { useState, useEffect } from 'react';
import { Button, TextField, Grid, Select, MenuItem } from '@mui/material';

const CollectionEditor = ({ navigate }) => {
    const [collections, setCollections] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [saved, setSaved] = useState(true);
    const [removeable, setRemoveable] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                let response = await fetch(`/api/v1/profile`);
                const profileData = await response.json();
                setCollections(profileData.collections);
                setRemoveable(false);
                setSelectedIndex(0);
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchProfile();
    }, []);

    const handleSaveClick = async () => {
        try {
            for (const collection of collections) {
                const updates = {
                    title: collection.asset.title,
                    defaultTitle: collection.collection.default.title,
                };

                await fetch(`/api/v1/collections/${collection.asset.xid}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', },
                    body: JSON.stringify(updates),
                });
            }

            const collectionXids = collections.map(collection => collection.asset.xid);

            const response = await fetch('/api/v1/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ collections: collectionXids }),
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

    const handleCollectionSelected = async (index) => {
        const items = collections[index].collection?.assets?.length;
        setRemoveable(items == 0);
        setSelectedIndex(index);
    };

    const handleAddCollection = async () => {
        const response = await fetch('/api/v1/collections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify({ name: 'new' }),
        });

        const data = await response.json();

        setCollections([
            ...collections,
            data,
        ]);
        setSelectedIndex(collections.length);
        setSaved(false);
        setRemoveable(true);
    };

    const handleRemoveCollection = async () => {
        setCollections(collections.filter((_, index) => index !== selectedIndex));
        setSelectedIndex(0);
        setSaved(false);
        setRemoveable(false);
    };

    const handleCollectionNameChange = (e, index) => {
        const newCollections = [...collections];
        newCollections[index].asset.title = e.target.value;
        setCollections(newCollections);
        setSaved(false);
    };

    const handleCollectionDefaultTitleChange = (e, index) => {
        const newCollections = [...collections];
        newCollections[index].collection.default.title = e.target.value;
        setCollections(newCollections);
        setSaved(false);
    };

    return (
        <Grid container direction="column" justifyContent="flex-start" alignItems="center" spacing={3} >
            <Grid item>
                <Select
                    style={{ width: '300px' }}
                    value={selectedIndex}
                    fullWidth
                    onChange={(event) => handleCollectionSelected(event.target.value)}
                >
                    {collections.map((collection, index) => (
                        <MenuItem value={index} key={index}>
                            {collection.asset.title}
                        </MenuItem>
                    ))}
                </Select>
            </Grid>
            <Grid item>
                {selectedIndex !== null && (
                    <span style={{ fontSize: '12px', display: 'block' }}>
                        {collections[selectedIndex].collection?.assets?.length} items
                    </span>
                )}
            </Grid>
            <Grid item>
                {selectedIndex !== null && (
                    <form style={{ width: '300px' }}>
                        <TextField
                            label="Collection Name"
                            value={collections[selectedIndex].asset.title}
                            onChange={(e) =>
                                handleCollectionNameChange(e, selectedIndex)
                            }
                            fullWidth
                            margin="normal"
                        />
                        <TextField
                            label="Default Title"
                            value={collections[selectedIndex].collection.default.title}
                            onChange={(e) =>
                                handleCollectionDefaultTitleChange(e, selectedIndex)
                            }
                            fullWidth
                            margin="normal"
                        />
                    </form>
                )}
            </Grid>
            <Grid container direction="row" justifyContent="center" alignItems="center" spacing={3}>
                <Grid item>
                    <Button variant="contained" color="primary" onClick={handleAddCollection}>
                        Add Collection
                    </Button>
                </Grid>
                <Grid item>
                    <Button variant="contained" color="primary" onClick={handleRemoveCollection} disabled={!removeable}>
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

export default CollectionEditor;
