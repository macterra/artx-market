
import React, { useState, useEffect } from 'react';
import { Button, TextField, Grid, Select, MenuItem } from '@mui/material';
import axios from 'axios';

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
                const profileResponse = await axios.get('/api/v1/profile');
                const profileData = profileResponse.data;
                setCollections(profileData.collections);
                setRemoveable(false);
                setSelectedIndex(0);
                setSelectedCollection(profileData.collections[0]);

                const licensesResponse = await axios.get('/api/v1/licenses');
                const licenses = licensesResponse.data;
                setLicenses(Object.keys(licenses));
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchProfile();
    }, []);

    const handleSaveClick = async () => {

        const title = selectedCollection.asset.title.trim();

        if (!title) {
            alert("Title can't be blank");
            return;
        }
        else {
            selectedCollection.asset.title = title;
        }

        const defaultTitle = selectedCollection.collection.default.title.trim();

        if (!defaultTitle) {
            alert("Default title can't be blank");
            return;
        }
        else {
            selectedCollection.collection.default.title = defaultTitle;
        }

        try {
            await axios.patch(`/api/v1/collections/${selectedCollection.xid}`, selectedCollection);
            setSaved(true);
        }
        catch (error) {
            console.error('Error updating profile:', error);
            alert("Save failed");
        }
    };

    const handleCollectionSelected = async (index) => {
        const items = collections[index].collection?.assets?.length;
        setRemoveable(items === 0);
        setSelectedIndex(index);
        setSelectedCollection(collections[index]);
    };

    const handleAddCollection = async () => {
        try {
            const response = await axios.get(`/api/v1/collections/`);
            const newCollections = [...collections, response.data];
            const newIndex = newCollections.length - 1;

            setCollections(newCollections);
            setSelectedIndex(newIndex);
            setSelectedCollection(newCollections[newIndex]);
            setSaved(false);
            setRemoveable(true);
        }
        catch (error) {
            console.error('Error adding collection:', error);
            alert("Add failed");
        }
    };

    const handleRemoveCollection = async () => {
        try {
            await axios.delete(`/api/v1/collections/${selectedCollection.xid}`);

            const newCollections = collections.filter((_, index) => index !== selectedIndex);
            setCollections(newCollections);
            setSelectedIndex(0);
            setSelectedCollection(newCollections[0]);
            setSaved(false);
            setRemoveable(false);
        }
        catch (error) {
            console.error('Error adding collection:', error);
            alert("Delete failed");
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

    if (!selectedCollection) {
        return;
    }

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
                <span style={{ fontSize: '12px', display: 'block' }}>
                    {selectedCollection.collection?.assets?.length} items
                </span>
            </Grid>
            <Grid item>
                <form style={{ width: '300px' }}>
                    <TextField
                        label="Collection Name"
                        value={selectedCollection.asset.title}
                        onChange={(e) =>
                            handleNameChange(e.target.value)
                        }
                        fullWidth
                        margin="normal"
                        inputProps={{ maxLength: 40 }}
                    />
                    <TextField
                        label="Default Title"
                        value={selectedCollection.collection.default.title}
                        onChange={(e) =>
                            handleDefaultTitleChange(e.target.value)
                        }
                        fullWidth
                        margin="normal"
                        inputProps={{ maxLength: 40 }}
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
