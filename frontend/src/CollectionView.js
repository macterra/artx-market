
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Box, Button } from '@mui/material';
import ImageGrid from './ImageGrid';

const CollectionView = ({ navigate, setRefreshProfile }) => {
    const { xid } = useParams();
    const [collection, setCollection] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [credits, setCredits] = useState(0);
    const [disableUpload, setDisableUpload] = useState(null);
    const [budget, setBudget] = useState(0);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const collection = await axios.get(`/api/v1/collections/${xid}`);
                const collectionData = collection.data;

                if (!collectionData.error) {
                    setCollection(collectionData);
                }

                const rates = await axios.get('/api/v1/rates');
                const uploadRate = rates.data.uploadRate;

                const profile = await axios.get('/api/v1/profile');
                const credits = profile.data.credits;

                setCredits(credits);
                setDisableUpload(credits < 1);

                const budget = credits / uploadRate / 1000000;
                setBudget(budget.toFixed(2));
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchProfile();
    }, [navigate, xid, refreshKey]);

    if (!collection) {
        return <p></p>;
    }

    const handleUpload = async (event) => {
        try {
            const files = event.target.files;
            const formData = new FormData();

            for (const file of files) {
                formData.append('images', file);
            }

            const response = await fetch(`/api/v1/collections/${collection.xid}/upload`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.ok) {
                if (data.filesUploaded > 0) {
                    const mb = data.bytesUploaded / 1000000;
                    alert(`You were debited ${data.creditsDebited} credits to upload ${data.filesUploaded} files (${mb.toFixed(2)} MB)`);              
                    setRefreshKey((prevKey) => prevKey + 1);
                    setRefreshProfile((prevKey) => prevKey + 1);
                } 
                if (data.filesSkipped) {
                    if (data.filesSkipped === 1) {
                        alert(`1 file was skipped due to insufficient credits.`);
                    }
                    else {
                        alert(`${data.filesSkipped} files were skipped due to insufficient credits.`);
                    }
                }
            }
        } catch (error) {
            console.error('Error uploading image:', error);
        }
    };

    return (
        <>
            <span>{collection.asset.title}</span>
            <span style={{ fontSize: '12px' }}>({collection.collection.assets.length} items)</span>
            {collection.isOwnedByUser &&
                <Box>
                    <span style={{ fontSize: '14px' }}>Upload:
                        <input type="file" name="images" accept="image/*" multiple onChange={handleUpload} disabled={disableUpload} />
                    </span>
                    <span style={{ fontSize: '14px' }}>You have {credits} credits, enought to upload {budget} MB.</span>
                    {disableUpload &&
                        <Button variant="contained" color="primary" onClick={() => navigate('/profile/edit/credits')}>
                            Credits: {credits}
                        </Button>
                    }
                </Box>
            }
            <ImageGrid collection={collection.collection.assets} />
        </>
    );
};

export default CollectionView;
