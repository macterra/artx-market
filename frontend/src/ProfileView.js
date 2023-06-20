import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box } from '@mui/material';
import CollectionGrid from './CollectionGrid';

const ProfileView = ({ navigate }) => {
    const { userId } = useParams();
    const [profile, setProfile] = useState(null);
    const [collections, setCollections] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                let response = await fetch(`/api/profile/${userId}`);
                const profileData = await response.json();
                const collections = [];

                for (let i = 0; i < profileData.collections.length; i++) {
                    let collection = profileData.collections[i];
                    response = await fetch(`/api/collection/${userId}/${i}`);
                    const collectionData = await response.json();
                    collection.count = collectionData.length;

                    if (collection.count > 0) {
                        if (!collection.thumbnail) {
                            collection.thumbnail = collectionData[0].file.path;
                        }

                        collections.push(collection);
                    }
                }

                console.log(profileData);
                setProfile(profileData);
                setCollections(collections);
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchProfile();
    }, [navigate, userId]);

    if (!profile) {
        return <p>Loading profile...</p>;
    }

    return (
        <Box>
            <p>Collections</p>
            <CollectionGrid userId={profile.id} list={collections} />
        </Box>
    );
};

export default ProfileView;
