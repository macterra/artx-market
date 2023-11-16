import React, { useState, useEffect } from 'react';
import { Grid, Button } from '@mui/material';
import axios from 'axios';

const PfpEditor = ({ metadata }) => {
    const [profile, setProfile] = useState({});
    const [disablePfp, setDisablePfp] = useState(false);
    const [showThumbnailButton, setShowThumbnailButton] = useState(true);
    const [disableThumbnail, setDisableThumbnail] = useState(false);
    const [showDefaultButton, setShowDefaultButton] = useState(true);
    const [disableDefaultPfp, setDisableDefaultPfp] = useState(false);
    const [disableDefaultThumbnail, setDisableDefaultThumbnail] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const check = await axios.get('/check-auth');
                const auth = check.data;
                const response = await axios.get(`/api/v1/profile`);
                const profile = response.data;

                setShowDefaultButton(auth.isAdmin);
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
            await axios.patch('/api/v1/admin/', { default_pfp: metadata.file.path });
            setDisableDefaultPfp(true);
        }
        catch (error) {
            console.error('Error updating default pfp:', error);
        }
    };

    const handleDefaultThumbnail = async () => {
        try {
            await axios.patch('/api/v1/admin/', { default_thumbnail: metadata.file.path });
            setDisableDefaultThumbnail(true);
        }
        catch (error) {
            console.error('Error updating default thumbnail:', error);
        }
    };

    return (
        <Grid container
            direction="column"
            justifyContent="flex-start"
            alignItems="center"
            spacing={2}
            sx={{ width: '80%', margin: 'auto' }} >
            <Grid item>
                <img
                    src={metadata.file.path}
                    alt={metadata.asset.title}
                    style={{
                        width: '200px',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: '50%',
                    }}
                />
            </Grid>
            <Grid item>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSavePfp}
                    disabled={disablePfp}>
                    Set Profile Pic
                </Button>
            </Grid>
            <Grid item>
                {showThumbnailButton &&
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSaveThumbnail}
                        disabled={disableThumbnail}>
                        Set Collection Thumbnail
                    </Button>
                }
            </Grid>
            <Grid item>
                {showDefaultButton &&
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleDefaultPfp}
                        disabled={disableDefaultPfp}>
                        Set Default Pfp
                    </Button>
                }
            </Grid>
            <Grid item>
                {showDefaultButton &&
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleDefaultThumbnail}
                        disabled={disableDefaultThumbnail}>
                        Set Default Thumbnail
                    </Button>
                }
            </Grid>
        </Grid>
    );
};

export default PfpEditor;
