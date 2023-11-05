import React, { useState, useEffect } from 'react';
import { Button } from '@mui/material';
import axios from 'axios';

const PfpEditor = ({ metadata }) => {
    const [profile, setProfile] = useState({});
    const [disablePfp, setDisablePfp] = useState(false);
    const [showThumbnailButton, setShowThumbnailButton] = useState(true);
    const [disableThumbnail, setDisableThumbnail] = useState(false);
    const [showDefaultPfpButton, setShowDefaultPfpButton] = useState(true);
    const [disableDefaultPfp, setDisableDefaultPfp] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const check = await axios.get('/check-auth');
                const auth = check.data;
                const response = await axios.get(`/api/v1/profile`);
                const profile = response.data;

                setShowDefaultPfpButton(auth.isAdmin);
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
            await axios.patch('/api/v1/profile', { pfp: metadata.file.path });
            profile.pfp = metadata.file.path;
            setDisablePfp(true);
        }
        catch (error) {
            console.error('Error updating pfp:', error);
        }
    };

    const handleSaveThumbnail = async () => {
        try {
            const response = await axios.get(`/api/v1/asset/${metadata.asset.collection}`);
            const collection = response.data;
            collection.collection.thumbnail = metadata.file.path;
            await axios.patch(`/api/v1/collections/${metadata.asset.collection}`, collection);
            setDisableThumbnail(true);
        }
        catch (error) {
            console.error('Error updating collection:', error);
        }
    };

    const handleDefaultPfp = async () => {
        try {
            await axios.patch('/api/v1/admin/save', { default_pfp: metadata.file.path });
            setDisableDefaultPfp(true);
        }
        catch (error) {
            console.error('Error updating default pfp:', error);
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
                <br></br>
                {showDefaultPfpButton &&
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleDefaultPfp}
                        disabled={disableDefaultPfp}>
                        Set Default Pfp
                    </Button>
                }
            </form>
        </div >
    );
};

export default PfpEditor;
