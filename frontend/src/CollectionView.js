
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { Box, Button, Grid, Modal } from '@mui/material';
import ImageGrid from './ImageGrid';
import AgentBadge from './AgentBadge';

const CollectionView = () => {
    const { xid } = useParams();
    const navigate = useNavigate();

    const [collection, setCollection] = useState(null);
    const [images, setImages] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [credits, setCredits] = useState(0);
    const [disableUpload, setDisableUpload] = useState(null);
    const [showMintAll, setShowMintAll] = useState(null);
    const [disableMintAll, setDisableMintAll] = useState(null);
    const [budget, setBudget] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [uploadResults, setUploadResults] = useState(null);
    const [uploadWarnings, setUploadWarnings] = useState(null);

    useEffect(() => {
        const fetchCollection = async () => {
            try {
                console.log(`fetchCollection ${refreshKey}`);

                const getCollection = await axios.get(`/api/v1/collections/${xid}`);
                const collection = getCollection.data;

                document.title = collection.asset.title;

                setCollection(collection);
                setImages(collection.collection.assets);
                setShowMintAll(collection.costToMintAll > 0);

                const getAuth = await axios.get('/check-auth');
                const auth = getAuth.data;

                if (auth.isAuthenticated) {
                    const getRates = await axios.get('/api/v1/rates');
                    const uploadRate = getRates.data.uploadRate;
                    const getProfile = await axios.get('/api/v1/profile');
                    const credits = getProfile.data.credits;
                    const budget = credits / uploadRate / 1000000;

                    setCredits(credits);
                    setDisableUpload(credits < 1);
                    setBudget(budget.toFixed(2));
                    setDisableMintAll(collection.costToMintAll > credits);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                return navigate('/');
            }
        };

        fetchCollection();
    }, [navigate, xid, refreshKey]);

    if (!collection) {
        return;
    }

    const uploadFiles = async (formData) => {
        try {
            const response = await axios.post(`/api/v1/collections/${collection.xid}/upload`, formData);
            const data = response.data;
            let uploadResults = ''
            let uploadWarnings = '';

            if (data.filesUploaded) {
                const mb = data.bytesUploaded / 1000000;
                uploadResults = `You were debited ${data.creditsDebited} credits to upload ${data.filesUploaded} files (${mb.toFixed(2)} MB)`;
                setRefreshKey((prevKey) => prevKey + 1);
            }

            if (data.filesSkipped) {
                if (data.filesSkipped === 1) {
                    uploadWarnings = `1 file was skipped due to insufficient credits. `;
                }
                else {
                    uploadWarnings = `${data.filesSkipped} files were skipped due to insufficient credits. `;
                }
            }

            if (data.filesErrored) {
                if (data.filesErrored === 1) {
                    uploadWarnings += `1 file was skipped due to error reading image.`;
                }
                else {
                    uploadWarnings += `${data.filesErrored} files were skipped due to error reading image.`;
                }
            }

            setUploadResults(uploadResults);
            setUploadWarnings(uploadWarnings);
        } catch (error) {
            console.error('Error uploading images:', error);
            setUploadResults('Error uploading images');
            setUploadWarnings('');
        }
    };

    const handleUpload = async (event) => {
        const files = event.target.files;
        const formData = new FormData();

        for (const file of files) {
            formData.append('images', file);
        }

        await uploadFiles(formData);
    };

    const handlePaste = async (event) => {
        const items = (event.clipboardData || event.originalEvent.clipboardData).items;
        const formData = new FormData();

        for (const item of items) {
            if (item.kind === 'file') {
                const file = item.getAsFile();
                formData.append('images', file);
            }
        }

        await uploadFiles(formData);
    };

    const handleDrop = async (files) => {
        const formData = new FormData();

        for (const file of files) {
            formData.append('images', file);
        }

        await uploadFiles(formData);
    };

    const handleMintAllClick = async () => {
        setDisableMintAll(true);

        try {
            await axios.get(`/api/v1/collections/${collection.xid}/mint-all`);
            setRefreshKey((prevKey) => prevKey + 1);
        }
        catch (error) {
            console.error('Error:', error);
            alert(error.response.data.message);
        }
    };

    const handleUploadClick = async () => {
        setModalOpen(true);
    };

    const handleModalClose = async () => {
        setModalOpen(false);
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

    const FileUploadByPaste = () => {
        useEffect(() => {
            window.addEventListener('paste', handlePaste);

            // Clean up the event listener when the component unmounts
            return () => {
                window.removeEventListener('paste', handlePaste);
            }
        }, []);

        return (
            <div></div>
        );
    };

    const FileUploadDropzone = () => {
        const { getRootProps, getInputProps, isDragActive } = useDropzone({
            onDrop: handleDrop,
            accept: 'image/*',
            multiple: true,
            disabled: disableUpload
        });

        return (
            <div {...getRootProps()} className={`${isDragActive ? 'dropzone active' : 'dropzone'}`}>
                <input {...getInputProps()} />
                {
                    isDragActive ?
                        <p>Drop the images here ...</p> :
                        <div>
                            <p>Copy/Paste or Drag 'n' Drop some images here, or click to select files</p>
                            <p>{uploadResults}</p>
                            <p>{uploadWarnings}</p>
                        </div>
                }
            </div>
        );
    };

    return (
        <>
            <Box>
                <Box display="flex" alignItems="center" justifyContent="center">
                    <CollectionBadge collection={collection} />
                    <div style={{ fontSize: '0.5em' }}>by</div>
                    <AgentBadge xid={collection.asset.owner} />
                </Box>
                <Box display="flex" alignItems="center" justifyContent="center">
                    {collection.collection.assets.length === 1 ? (
                        <span style={{ fontSize: '12px' }}> (1 item)</span>
                    ) : (
                        <span style={{ fontSize: '12px' }}> ({collection.collection.assets.length} items)</span>
                    )}
                </Box>
                {collection.isOwnedByUser &&
                    <Box style={{ marginLeft: '20px', marginRight: '20px' }}>
                        <Grid container alignItems="center" justifyContent="space-between">
                            <Grid item>
                                <Button variant="contained" color="primary" disabled={disableUpload} onClick={handleUploadClick}>
                                    Upload...
                                </Button>
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
                <ImageGrid images={images} />
            </Box>
            <Modal
                open={modalOpen}
                onClose={() => handleModalClose()}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <div style={{
                    backgroundColor: '#282c34',
                    padding: '1em',
                    width: '400px',
                    height: '400px',
                    overflow: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <FileUploadByPaste />
                    <FileUploadDropzone />
                    <p style={{ fontSize: '14px' }}>You have {credits} credits, enough to upload {budget} MB.</p>

                    <input
                        id="file-upload"
                        type="file"
                        name="images"
                        accept="image/*"
                        multiple
                        onChange={handleUpload}
                        disabled={disableUpload}
                        style={{ display: 'none' }}
                    />

                    <Grid container direction="row" justifyContent="center" alignItems="center" spacing={3}>
                        <Grid item>
                            <label htmlFor="file-upload" className="custom-file-upload">
                                <Button variant="contained" color="primary" component="span">
                                    Select Images
                                </Button>
                            </label>
                        </Grid>
                        {disableUpload &&
                            <Grid item>
                                <Button variant="contained" color="primary" onClick={() => navigate('/profile/edit/credits')}>
                                    Credits: {credits}
                                </Button>
                            </Grid>
                        }
                        <Grid item>
                            <Button variant="contained" color="primary" onClick={handleModalClose}>
                                Close
                            </Button>
                        </Grid>
                    </Grid>
                </div>
            </Modal>
        </>
    );
};

export default CollectionView;
