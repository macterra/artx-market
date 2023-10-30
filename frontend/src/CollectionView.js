
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Box, Button, Grid } from '@mui/material';
import ImageGrid from './ImageGrid';
import AgentBadge from './AgentBadge';

const CollectionView = ({ navigate }) => {
    const { xid } = useParams();
    const [collection, setCollection] = useState(null);
    const [images, setImages] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [credits, setCredits] = useState(0);
    const [disableUpload, setDisableUpload] = useState(null);
    const [showMintAll, setShowMintAll] = useState(null);
    const [disableMintAll, setDisableMintAll] = useState(null);
    const [budget, setBudget] = useState(0);

    useEffect(() => {
        const fetchCollection = async () => {
            try {
                console.log(`fetchCollection ${refreshKey}`);

                const response = await axios.get(`/api/v1/collections/${xid}`);
                const collection = response.data;

                if (collection) {
                    setCollection(collection);
                    setImages(collection.collection.assets);
                }
                else {
                    return navigate('/');
                }

                const rates = await axios.get('/api/v1/rates');
                const uploadRate = rates.data.uploadRate;

                const profile = await axios.get('/api/v1/profile');
                const credits = profile.data.credits;

                setCredits(credits);
                setDisableUpload(credits < 1);

                setShowMintAll(collection.costToMintAll > 0);
                setDisableMintAll(collection.costToMintAll > credits);

                const budget = credits / uploadRate / 1000000;
                setBudget(budget.toFixed(2));
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchCollection();
    }, [navigate, xid, refreshKey]);

    if (!collection) {
        return;
    }

    const handleUpload = async (event) => {
        try {
            const files = event.target.files;
            const formData = new FormData();

            for (const file of files) {
                formData.append('images', file);
            }
            const response = await axios.post(`/api/v1/collections/${collection.xid}/upload`, formData);
            const data = response.data;

            if (data.filesUploaded) {
                const mb = data.bytesUploaded / 1000000;
                alert(`You were debited ${data.creditsDebited} credits to upload ${data.filesUploaded} files (${mb.toFixed(2)} MB)`);
                setRefreshKey((prevKey) => prevKey + 1);
            }

            if (data.filesSkipped) {
                if (data.filesSkipped === 1) {
                    alert(`1 file was skipped due to insufficient credits.`);
                }
                else {
                    alert(`${data.filesSkipped} files were skipped due to insufficient credits.`);
                }
            }

            if (data.filesErrored) {
                if (data.filesErrored === 1) {
                    alert(`1 file was skipped due to error reading image.`);
                }
                else {
                    alert(`${data.filesErrored} files were skipped due to error reading image.`);
                }
            }
        } catch (error) {
            console.error('Error uploading images:', error);
            alert('Error uploading images');
        }
    };

    const handleMintAllClick = async () => {
        setDisableMintAll(true);

        try {
            const response = await fetch(`/api/v1/collections/${collection.xid}/mint-all`);

            if (response.ok) {
                setRefreshKey((prevKey) => prevKey + 1);
            } else {
                const data = await response.json();
                console.error('Error:', data.message);
                alert(data.message);
            }
        }
        catch (error) {
            console.error('Error:', error);
        }
    };

    const CollectionBadge = ({ collection }) => {
        return (
            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '0.5em', marginRight: '0.5em' }}>
                {collection.collection.thumbnail &&
                    <img
                        src={collection.collection.thumbnail}
                        alt=""
                        style={{
                            width: '30px',
                            height: '30px',
                            objectFit: 'cover',
                            marginRight: '10px',
                            borderRadius: '50%',
                        }}
                    />
                } {collection.asset.title}
            </div>
        );
    };

    return (
        <Box>
            <Box display="flex" alignItems="center" justifyContent="center">
                <CollectionBadge collection={collection} />
                <div style={{ fontSize: '0.5em' }}>by</div>
                <AgentBadge xid={collection.asset.owner} />
            </Box>
            {collection.collection.assets.length === 1 ? (
                <span style={{ fontSize: '12px' }}> (1 item)</span>
            ) : (
                <span style={{ fontSize: '12px' }}> ({collection.collection.assets.length} items)</span>
            )}
            {collection.isOwnedByUser &&
                <Box style={{ marginLeft: '20px', marginRight: '20px' }}>
                    <Grid container alignItems="center" justifyContent="space-between">
                        <Grid item>
                            <span style={{ fontSize: '14px' }}>Upload:
                                <input type="file" name="images" accept="image/*" multiple onChange={handleUpload} disabled={disableUpload} />
                            </span>
                            <span style={{ fontSize: '14px' }}>You have {credits} credits, enough to upload {budget} MB.</span>
                            {disableUpload &&
                                <Button variant="contained" color="primary" onClick={() => navigate('/profile/edit/credits')}>
                                    Credits: {credits}
                                </Button>
                            }
                        </Grid>
                        <Grid item>
                            {showMintAll &&
                                <Button variant="contained" color="primary" disabled={disableMintAll} onClick={handleMintAllClick}>
                                    Mint All for {collection.costToMintAll} credits
                                </Button>
                            }
                        </Grid>
                    </Grid>
                </Box>
            }
            <ImageGrid collection={images} />
        </Box>
    );
};

export default CollectionView;
