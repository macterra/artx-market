import React, { useEffect, useState } from 'react';
import { Button, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const AssetEditor = ({ metadata, setTab, setRefreshKey }) => {
    const [title, setTitle] = useState(null);
    const [collections, setCollections] = useState([]);
    const [selectedCollection, setSelectedCollection] = useState('');

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const profileResponse = await fetch('/api/profile');
                const profileData = await profileResponse.json();

                setTitle(metadata.asset.title);
                setSelectedCollection(metadata.asset.collection);
                setCollections(profileData.collections);
            } catch (error) {
                console.error('Error fetching image metadata:', error);
            }
        };

        fetchMetadata();
    }, [metadata]);

    if (!metadata) {
        return;
    }

    const handleSaveClick = async () => {
        try {
            const response = await fetch(`/api/asset/${metadata.asset.xid}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title, collection: selectedCollection }),
            });

            if (response.ok) {
                metadata.asset.title = title;
                metadata.asset.collection = selectedCollection;
                setTab("meta");
            } else {
                const data = await response.json();
                console.error('Error updating metadata:', data.message);
                alert(data.message);
            }
        } catch (error) {
            console.error('Error updating metadata:', error);
        }
    };

    const handleDeleteClick = async () => {
        try {
            const response = await fetch(`/api/asset/${metadata.asset.xid}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ collection: 'deleted' }),
            });

            if (response.ok) {
                metadata.asset.collection = 'deleted';
                setTab("meta");
                setRefreshKey((prevKey) => prevKey + 1);
            } else {
                const data = await response.json();
                console.error('Error updating metadata:', data.message);
                alert(data.message);
            }
        } catch (error) {
            console.error('Error updating metadata:', error);
        }
    };

    return (
        <form>
        <TextField
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        fullWidth
        margin="normal"
        />
        <FormControl fullWidth margin="normal">
        <InputLabel id="collection-select-label">Collection</InputLabel>
        <Select
        labelId="collection-select-label"
        value={selectedCollection}
        onChange={(e) => setSelectedCollection(e.target.value)}
        >
        {collections.map((collection, index) => (
            <MenuItem key={index} value={collection.asset.xid}>
            {collection.asset.title}
            </MenuItem>
            ))}
            </Select>
            </FormControl>
            <Button variant="contained" color="primary" onClick={handleSaveClick}>
            Save
            </Button>
            <Button variant="contained" color="primary" onClick={handleDeleteClick}>
            Delete
            </Button>
            </form>
            );
        };

        export default AssetEditor;
