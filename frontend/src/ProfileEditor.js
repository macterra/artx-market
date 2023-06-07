
import React, { useState, useEffect } from 'react';
import { Button, TextField, List, ListItem, ListItemText } from '@mui/material';

const ProfileEditor = ({ navigate }) => {
    const [name, setName] = useState('');
    const [tagline, setTagline] = useState('');
    const [collections, setCollections] = useState([]);
    const [selectedCollectionIndex, setSelectedCollectionIndex] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(`/api/profile`);
                const data = await response.json();
                setName(data.name);
                setTagline(data.tagline);
                setCollections(data.collections);
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchProfile();
    }, []);

    const handleSaveClick = async () => {
        try {
            const response = await fetch('/api/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, tagline }),
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
        navigate('/profile');
    };

    const handleAddCollection = () => {
        setCollections([
            ...collections,
            {
                name: 'new',
                description: '',
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

    return (
        <div>
            <h2>Edit Profile</h2>
            <form>
                <TextField
                    label="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                    margin="normal"
                />
                <TextField
                    label="Tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    fullWidth
                    margin="normal"
                />
                <Button variant="contained" color="primary" onClick={handleSaveClick}>
                    Save
                </Button>
            </form>
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
                </form>
            )}
            <Button variant="contained" color="primary" onClick={handleAddCollection}>
                Add Collection
            </Button>
        </div >
    );
};

export default ProfileEditor;
