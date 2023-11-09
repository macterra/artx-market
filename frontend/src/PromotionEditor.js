
import React, { useState, useEffect } from 'react';
import { Grid, Box, Button, Typography } from '@mui/material';
import axios from 'axios';

const PromotionEditor = ({ metadata, xid }) => {
    const [message, setMessage] = useState(null);
    const [link, setLink] = useState(null);
    const [fee, setFee] = useState(null);
    const [disableSend, setDisableSend] = useState(false);

    useEffect(() => {
        const initState = async () => {
            try {
                const getCreator = await axios.get(`/api/v1/profile/${metadata.asset.owner}`);
                const creator = getCreator.data;

                const getRates = await axios.get('/api/v1/rates');
                const rates = getRates.data;

                let message = `Check out "${metadata.asset.title}" by ${creator.name}`;

                if (xid) {
                    const getNft = await axios.get(`/api/v1/asset/${xid}`);
                    const nft = getNft.data;

                    if (nft.nft.price) {
                        message = `New listing! "${nft.nft.title}" by ${creator.name} for ${nft.nft.price} sats`;
                    }
                    else {
                        message = `Check out "${nft.nft.title}" by ${creator.name}`;
                    }
                }
                else {
                    const getListings = await axios.get('/api/v1/listings');
                    const listings = getListings.data;

                    for (const listing of listings) {
                        if (listing.token === metadata.xid) {
                            if (listing.editions > 1) {
                                message = `New listings! ${listing.editions} editions of "${listing.title}" by ${creator.name} for ${listing.min}-${listing.max} sats`;
                            }
                            else {
                                message = `New listing! "${listing.title}" by ${creator.name} for ${listing.price} sats`;
                            }
                        }
                    }
                }

                setMessage(`${message}\n#art #nft`);
                setLink(window.location.href);
                setFee(rates.promoteFee);
            }
            catch (error) {
                console.log(error);
            }
        };

        initState();
    }, [metadata, xid]);

    const handleSendClick = async () => {
        setDisableSend(true);

        const theMessage = message.trim();

        if (!theMessage) {
            alert("Message can't be blank");
            return;
        }

        try {
            const response = await axios.post('/api/v1/promote', { message: theMessage, xid: metadata.xid });
            alert(response.data.message || "Announcement sent!");
        }
        catch (error) {
            console.error('Error:', error);

            if (error.response) {
                alert(error.response.data?.message || 'Could not send');
            }
        }
    };

    return (
        <Grid container
            direction="column"
            justifyContent="flex-start"
            alignItems="center"
            spacing={3}
            sx={{ width: '80%', margin: 'auto' }} >
            <Grid item>
                <Box border={1} borderColor="grey.500" p={1} m={1} style={{ whiteSpace: 'pre-wrap' }} >
                    <Typography align="left">{message}</Typography>
                    <Typography>{link}</Typography>
                    <img src={metadata.file.path} alt={metadata.asset.title} style={{ width: '80%', height: 'auto' }} />
                </Box>
            </Grid>
            <Grid item>
                <Button variant="contained" color="primary" onClick={handleSendClick} disabled={disableSend}>
                    Send Announcement
                </Button>
                <p style={{ fontSize: '0.5em' }}>{`promotions cost ${fee} credits`}</p>
            </Grid>
        </Grid>
    );
};

export default PromotionEditor;
