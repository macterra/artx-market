import React, { useEffect, useState } from 'react';
import { Button, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const AssetEditor = ({ metadata, setTab }) => {
    const [title, setTitle] = useState(null);
    const [collections, setCollections] = useState([]);
    const [selectedCollection, setSelectedCollection] = useState('');

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const profileResponse = await fetch('/api/profile');
                const profileData = await profileResponse.json();

                const collections = [];

                for (const xid of profileData.collections) {
                    let response = await fetch(`/api/collections/${xid}`);
                    let collectionData = await response.json();
                    collections.push(collectionData);
                }

                setTitle(metadata.asset.title);
                setSelectedCollection(metadata.asset.collection);
                setCollections(collections);

                if (profileData.xid !== metadata.asset.owner) {
                    console.log(`editor ${profileData.xid} owner ${metadata.asset.owner}`);
                    //navigate(`/image/${metadata.asset.xid}`);
                }
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
            const payload = {
                xid: metadata.asset.xid,
                title: title,
                collection: selectedCollection,
            };

            const response = await fetch('/api/asset', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
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
        </form>
    );
};

export default AssetEditor;
