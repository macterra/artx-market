
import React, { useState, useEffect } from 'react';
import { Button } from '@mui/material';

const PfpEditor = ({ metadata, setTab }) => {
    const [profile, setProfile] = useState({});
    const [disablePfp, setDisablePfp] = useState(false);
    const [showThumbnailButton, setShowThumbnailButton] = useState(true);
    const [disableThumbnail, setDisableThumbnail] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(`/api/v1/profile`);
                const profile = await response.json();
                setProfile(profile);
                setShowThumbnailButton(metadata.asset.owner === profile.xid);
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchProfile();
    }, [metadata]);

    const handleSavePfp = async () => {
        try {
            const response = await fetch('/api/v1/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ pfp: metadata.file.path }),
            });

            if (response.ok) {
                profile.pfp = metadata.file.path;
                setDisablePfp(true);
            } else {
                const data = await response.json();
                console.error('Error updating profile:', data.message);
                alert(data.message);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    const handleSaveThumbnail = async () => {
        try {
            let response = await fetch(`/api/v1/asset/${metadata.asset.collection}`);
            const collection = await response.json();
            collection.collection.thumbnail = metadata.file.path;

            response = await fetch(`/api/v1/collections/${metadata.asset.collection}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify(collection),
            });

            if (response.ok) {
                setDisableThumbnail(true);
            } else {
                const data = await response.json();
                console.error('Error updating profile:', data.message);
                alert(data.message);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    return (
        <div>
            <img
                src={metadata.file.path}
                alt={metadata.asset.title}
                style={{
                    width: '200px',
                    height: '200px',
                    objectFit: 'cover',
                    marginTop: '50px',
                    borderRadius: '50%', // Add this line to create a circular mask
                }}
            />
            <form>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSavePfp}
                    disabled={disablePfp}>
                    Set Profile Pic
                </Button>
                <br></br>
                {showThumbnailButton &&
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSaveThumbnail}
                        disabled={disableThumbnail}>
                        Set Collection Thumbnail
                    </Button>
                }
            </form>
        </div >
    );
};

export default PfpEditor;
