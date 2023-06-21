
import React, { useState, useEffect } from 'react';
import { Button, TextField, List, ListItem, ListItemText } from '@mui/material';

const CollectionEditor = ({ navigate }) => {
    const [profile, setProfile] = useState({});
    const [collections, setCollections] = useState([]);
    const [selectedCollectionIndex, setSelectedCollectionIndex] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(`/api/profile`);
                const data = await response.json();
                setProfile(data);
                setCollections(data.collections);
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchProfile();
    }, []);

    const handleSaveClick = async () => {
        try {
            profile.collections = collections;

            const response = await fetch('/api/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profile),
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

    const handleAddCollection = () => {
        setCollections([
            ...collections,
            {
                name: 'new',
                description: '',
                assets: [],
            },
        ]);
        setSelectedCollectionIndex(collections.length);
    };

    const handleCollectionNameChange = (e, index) => {
        const newCollections = [...collections];
        newCollections[index].name = e.target.value;
        setCollections(newCollections);
    };

    const handleCollectionDescriptionChange = (e, index) => {
        const newCollections = [...collections];
        newCollections[index].description = e.target.value;
        setCollections(newCollections);
    };

    const handleCollectionDefaultTitleChange = (e, index) => {
        const newCollections = [...collections];
        newCollections[index].defaultTitle = e.target.value;
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
                        <ListItemText primary={collection.name} />
                    </ListItem>
                ))}
            </List>
            {selectedCollectionIndex !== null && (
                <form>
                    <TextField
                        label="Collection Name"
                        value={collections[selectedCollectionIndex].name}
                        onChange={(e) =>
                            handleCollectionNameChange(e, selectedCollectionIndex)
                        }
                        fullWidth
                        margin="normal"
                    />
                    <TextField
                        label="Collection Description"
                        value={collections[selectedCollectionIndex].description}
                        onChange={(e) =>
                            handleCollectionDescriptionChange(e, selectedCollectionIndex)
                        }
                        fullWidth
                        margin="normal"
                    />
                    <TextField
                        label="Default Title"
                        value={collections[selectedCollectionIndex].defaultTitle}
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
