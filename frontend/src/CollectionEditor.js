
import React, { useState, useEffect } from 'react';
import { Button, TextField, List, ListItem, ListItemText } from '@mui/material';

const CollectionEditor = ({ navigate }) => {
    const [profile, setProfile] = useState({});
    const [collections, setCollections] = useState([]);
    const [selectedCollectionIndex, setSelectedCollectionIndex] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                let response = await fetch(`/api/profile`);
                const profileData = await response.json();
                setProfile(profileData);
                setCollections(profileData.collections);
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

                await fetch(`/api/collections/${collection.asset.xid}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', },
                    body: JSON.stringify(updates),
                });
            }

            const collectionXids = collections.map(collection => collection.asset.xid);

            const response = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ collections: collectionXids }),
            });

            if (response.ok) {
                console.log('Profile updated successfully');
            } else {
                const data = await response.json();
                console.error('Error updating profile:', data.message);
                alert(data.message);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    const handleAddCollection = async () => {
        const response = await fetch('/api/collections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify({ name: 'new' }),
        });
        const data = await response.json();

        console.log(data);

        setCollections([
            ...collections,
            data,
        ]);
        setSelectedCollectionIndex(collections.length);
    };

    const handleCollectionNameChange = (e, index) => {
        const newCollections = [...collections];
        newCollections[index].asset.title = e.target.value;
        setCollections(newCollections);
    };

    const handleCollectionDefaultTitleChange = (e, index) => {
        const newCollections = [...collections];
        newCollections[index].collection.default.title = e.target.value;
        setCollections(newCollections);
    };

    return (
        <div>
            <h2>Collections</h2>
            <List>
                {collections.map((collection, index) => (
                    <ListItem
                        button
                        key={index}
                        onClick={() => setSelectedCollectionIndex(index)}
                        selected={index === selectedCollectionIndex}
                    >
                        <ListItemText primary={collection.asset.title} />
                    </ListItem>
                ))}
            </List>
            {selectedCollectionIndex !== null && (
                <form>
                    <TextField
                        label="Collection Name"
                        value={collections[selectedCollectionIndex].asset.title}
                        onChange={(e) =>
                            handleCollectionNameChange(e, selectedCollectionIndex)
                        }
                        fullWidth
                        margin="normal"
                    />
                    <TextField
                        label="Default Title"
                        value={collections[selectedCollectionIndex].collection.default.title}
                        onChange={(e) =>
                            handleCollectionDefaultTitleChange(e, selectedCollectionIndex)
                        }
                        fullWidth
                        margin="normal"
                    />
                </form>
            )}
            <Button variant="contained" color="primary" onClick={handleAddCollection} mr={2}>
                Add Collection
            </Button>
            <Button variant="contained" color="primary" onClick={handleSaveClick}>
                Save
            </Button>
        </div >
    );
};

export default CollectionEditor;
