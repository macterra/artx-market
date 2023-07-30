
import React, { useState, useEffect } from 'react';
import { Button, TextField, Grid, Select, MenuItem } from '@mui/material';

const CollectionEditor = ({ navigate }) => {
    const [collections, setCollections] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [selectedCollection, setSelectedCollection] = useState(null);
    const [saved, setSaved] = useState(true);
    const [removeable, setRemoveable] = useState(false);
    const [licenses, setLicenses] = useState([]);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                let response = await fetch(`/api/v1/profile`);
                const profileData = await response.json();
                setCollections(profileData.collections);
                setRemoveable(false);
                setSelectedIndex(0);
                setSelectedCollection(profileData.collections[0]);

                response = await fetch('/api/v1/licenses');
                const licenses = await response.json();
                setLicenses(Object.keys(licenses));
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchProfile();
    }, []);

    const handleSaveClick = async () => {
        try {
            const response = await fetch(`/api/v1/collections/${selectedCollection.asset.xid}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify(selectedCollection),
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
        setRemoveable(items === 0);
        setSelectedIndex(index);
        setSelectedCollection(collections[index]);
    };

    const handleAddCollection = async () => {
        const response = await fetch(`/api/v1/collections/`);
        const data = await response.json();
        const newCollections = [...collections, data];
        const newIndex = newCollections.length - 1;

        setCollections(newCollections);
        setSelectedIndex(newIndex);
        setSelectedCollection(newCollections[newIndex]);
        setSaved(false);
        setRemoveable(true);
    };

    const handleRemoveCollection = async () => {
        const response = await fetch(`/api/v1/collections/${selectedCollection.asset.xid}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', },
        });

        if (response.ok) {
            const newCollections = collections.filter((_, index) => index !== selectedIndex);
            setCollections(newCollections);
            setSelectedIndex(0);
            setSelectedCollection(newCollections[0]);
            setSaved(false);
            setRemoveable(false);
        }
    };

    const handleNameChange = (val) => {
        const newCollections = [...collections];
        newCollections[selectedIndex].asset.title = val;
        setCollections(newCollections);
        setSelectedCollection(newCollections[selectedIndex]);
        setSaved(false);
    };

    const handleDefaultTitleChange = (val) => {
        const newCollections = [...collections];
        newCollections[selectedIndex].collection.default.title = val;
        setCollections(newCollections);
        setSelectedCollection(newCollections[selectedIndex]);
        setSaved(false);
    };

    const handleDefaultLicenseChange = (val) => {
        const newCollections = [...collections];
        newCollections[selectedIndex].collection.default.license = val;
        setCollections(newCollections);
        setSelectedCollection(newCollections[selectedIndex]);
        setSaved(false);
    };

    const handleDefaultRoyaltyChange = (val) => {
        const newCollections = [...collections];
        newCollections[selectedIndex].collection.default.royalty = val;
        setCollections(newCollections);
        setSelectedCollection(newCollections[selectedIndex]);
        setSaved(false);
    };

    const handleDefaultEditionsChange = (val) => {
        const newCollections = [...collections];
        newCollections[selectedIndex].collection.default.editions = val;
        setCollections(newCollections);
        setSelectedCollection(newCollections[selectedIndex]);
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
                {selectedCollection !== null && (
                    <span style={{ fontSize: '12px', display: 'block' }}>
                        {selectedCollection.collection?.assets?.length} items
                    </span>
                )}
            </Grid>
            <Grid item>
                {selectedCollection !== null && (
                    <form style={{ width: '300px' }}>
                        <TextField
                            label="Collection Name"
                            value={selectedCollection.asset.title}
                            onChange={(e) =>
                                handleNameChange(e.target.value)
                            }
                            fullWidth
                            margin="normal"
                        />
                        <TextField
                            label="Default Title"
                            value={selectedCollection.collection.default.title}
                            onChange={(e) =>
                                handleDefaultTitleChange(e.target.value)
                            }
                            fullWidth
                            margin="normal"
                        />
                        <Select
                            label="Default License"
                            value={selectedCollection.collection.default.license}
                            onChange={(e) => handleDefaultLicenseChange(e.target.value)}
                            fullWidth
                            margin="normal"
                        >
                            {licenses.map((licenseName, index) => (
                                <MenuItem key={index} value={licenseName}>
                                    {licenseName}
                                </MenuItem>
                            ))}
                        </Select>
                        <TextField
                            label="Default Royalty (0-25%)"
                            type="number"
                            value={selectedCollection.collection.default.royalty || 0}
                            onChange={(e) =>
                                handleDefaultRoyaltyChange(e.target.value)
                            }
                            fullWidth
                            margin="normal"
                            inputProps={{
                                min: 0,
                                max: 25,
                            }}
                        />
                        <TextField
                            label="Default Editions (1-100)"
                            type="number"
                            value={selectedCollection.collection.default.editions || 1}
                            onChange={(e) => handleDefaultEditionsChange(e.target.value)}
                            fullWidth
                            margin="normal"
                            inputProps={{
                                min: 1,
                                max: 100,
                            }}
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
