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

                if (profileData.isUser) {
                    response = await fetch(`/api/collections/${profileData.assets.created}`);
                    const created = await response.json();
                    collections.push(created);

                    response = await fetch(`/api/collections/${profileData.assets.deleted}`);
                    const deleted = await response.json();
                    collections.push(deleted);

                    response = await fetch(`/api/collections/${profileData.assets.collected}`);
                    const collected = await response.json();
                    collections.push(collected);
                }

                for (const xid of profileData.collections) {
                    response = await fetch(`/api/collections/${xid}`);
                    let collectionData = await response.json();

                    // if (collectionData.collection.assets.length > 0) {
                    //     collections.push(collectionData);
                    // }
                    collections.push(collectionData);
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
            {collections.length === 0 &&
                <p>{profile.name} has not yet shared anything. Stay tuned!</p>
            }
            {collections.length > 0 &&
                <div>
                    <p>Collections</p>
                    <CollectionGrid userId={profile.id} list={collections} />
                </div>
            }
        </Box>
    );
};

export default ProfileView;
