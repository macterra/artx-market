import React, { useEffect, useState } from 'react';
import { Button, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import axios from 'axios';

const AssetEditor = ({ metadata, setTab, setRefreshKey }) => {
    const [title, setTitle] = useState(null);
    const [collections, setCollections] = useState([]);
    const [selectedCollection, setSelectedCollection] = useState('');

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const getProfile = await axios.get('/api/v1/profile');
                const profileData = getProfile.data;

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
            await axios.patch(`/api/v1/asset/${metadata.xid}`, { title: title, collection: selectedCollection });
            metadata.asset.title = title;
            metadata.asset.collection = selectedCollection;
            setTab("meta");
        } catch (error) {
            console.error('Error updating metadata:', error);
            alert(error.response.data.message);
        }
    };

    const handleDeleteClick = async () => {
        try {
            await axios.patch(`/api/v1/asset/${metadata.xid}`, { collection: 'deleted' });
            metadata.asset.collection = 'deleted';
            setTab("meta");
            setRefreshKey((prevKey) => prevKey + 1);
        } catch (error) {
            console.error('Error updating metadata:', error);
            alert(error.response.data.message);
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
                inputProps={{ maxLength: 40 }}
            />
            <FormControl fullWidth margin="normal">
                <InputLabel id="collection-select-label">Collection</InputLabel>
                <Select
                    labelId="collection-select-label"
                    value={selectedCollection}
                    onChange={(e) => setSelectedCollection(e.target.value)}
                >
                    {collections.map((collection, index) => (
                        <MenuItem key={index} value={collection.xid}>
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
