import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const ImageEditor = ({ navigate }) => {
    const { xid } = useParams();
    const [metadata, setMetadata] = useState(null);
    const [title, setTitle] = useState(null);
    const [description, setDescription] = useState(null);
    const [tags, setTags] = useState(null);
    const [collections, setCollections] = useState([]);
    const [selectedCollection, setSelectedCollection] = useState('');

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const response = await fetch(`/data/assets/${xid}/meta.json`);
                const metadata = await response.json();
                setMetadata(metadata);
                setTitle(metadata.asset.title);
                setDescription(metadata.asset.description);
                setTags(metadata.asset.tags);
                setSelectedCollection(metadata.asset.collection || 0);

                const profileResponse = await fetch('/api/profile');
                const profileData = await profileResponse.json();
                setCollections(profileData.collections || []);

                if (profileData.xid !== metadata.asset.creator) {
                    navigate(`/image/${metadata.asset.xid}`);
                }
            } catch (error) {
                console.error('Error fetching image metadata:', error);
            }
        };

        fetchMetadata();
    }, [xid]);

    if (!metadata) {
        return <p>Loading...</p>;
    }

    const handleSaveClick = async () => {
        try {
            metadata.asset.title = title;
            metadata.asset.description = description;
            metadata.asset.tags = tags;
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
            } else {
                const data = await response.json();
                console.error('Error updating metadata:', data.message);
                alert(data.message);
            }
        } catch (error) {
            console.error('Error updating metadata:', error);
        }
        navigate(`/image/${metadata.asset.xid}`);
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ width: '50%', padding: '16px' }}>
                <img src={metadata.asset.path} alt={metadata.asset.originalName} style={{ width: '100%', height: 'auto' }} />
            </div>
            <div style={{ width: '50%', padding: '16px' }}>
                <h2>Edit Metadata</h2>
                <form>
                    <TextField
                        label="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        fullWidth
                        margin="normal"
                    />
                    <TextField
                        label="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        fullWidth
                        margin="normal"
                    />
                    <TextField
                        label="Tags"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
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
            </div>
        </div>
    );
};

export default ImageEditor;
