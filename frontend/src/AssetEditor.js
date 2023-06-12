import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const AssetEditor = ({ metadata, setTab }) => {
    const { xid } = useParams();
    const [title, setTitle] = useState(null);
    const [description, setDescription] = useState(null);
    const [tags, setTags] = useState(null);
    const [collections, setCollections] = useState([]);
    const [selectedCollection, setSelectedCollection] = useState('');

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const profileResponse = await fetch('/api/profile');
                const profileData = await profileResponse.json();

                setTitle(metadata.asset.title);
                setDescription(metadata.asset.description);
                setTags(metadata.asset.tags);
                setSelectedCollection(metadata.asset.collection || 0);
                setCollections(profileData.collections || []);

                if (profileData.xid !== metadata.asset.creator) {
                    console.log(`editor ${profileData.xid} creator ${metadata.asset.creator}`);
                    //navigate(`/image/${metadata.asset.xid}`);
                }
            } catch (error) {
                console.error('Error fetching image metadata:', error);
            }
        };

        fetchMetadata();
    }, [xid]);

    if (!metadata) {
        return;
    }

    const handleSaveClick = async () => {
        try {
            metadata.asset.title = title;
            metadata.asset.collection = selectedCollection;

            const response = await fetch('/api/asset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(metadata),
            });

            if (response.ok) {
                console.log('Metadata updated successfully');
                setTab(0);
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
                        <MenuItem key={index} value={index}>
                            {collection.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <Button variant="contained" color="primary" onClick={handleSaveClick}>
                Save
            </Button>
        </form>
    );
};

export default AssetEditor;
