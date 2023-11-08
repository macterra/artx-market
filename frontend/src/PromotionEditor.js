
import React, { useState, useEffect } from 'react';
import { Grid, Box, Button, Typography } from '@mui/material';
import axios from 'axios';

const PromotionEditor = ({ metadata }) => {
    const [message, setMessage] = useState(null);
    const [link, setLink] = useState(null);
    const [disableSend, setDisableSend] = useState(false);

    useEffect(() => {
        const initState = async () => {
            try {
                const response = await axios.get('/api/v1/listings');
                const listings = response.data;

                const creatorResponse = await axios.get(`/api/v1/profile/${metadata.asset.owner}`);
                const creator = creatorResponse.data;

                let message = `Check out "${metadata.asset.title}" by ${creator.name}`;

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

                setMessage(`${message}\n#art #nft`);
                setLink(window.location.href);
            }
            catch (error) {
                console.log(error);
            }
        };

        initState();
    }, [metadata]);

    const handleSendClick = async () => {
        setDisableSend(true);

        const theMessage = message.trim();

        if (!theMessage) {
            alert("Message can't be blank");
            return;
        }

        try {
            await axios.patch('/api/v1/announce', { message: theMessage });
        }
        catch (error) {
            console.error('Error:', error);
            alert("Could not send");
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
                <Box
                    border={1}
                    borderColor="grey.500"
                    p={1}
                    m={1}
                    style={{ whiteSpace: 'pre-wrap' }}
                >
                    <Typography align="left">{message}</Typography>
                    <Typography>{link}</Typography>
                    <img src={metadata.file.path} alt={metadata.asset.title} style={{ width: '80%', height: 'auto' }} />
                </Box>
                <Button variant="contained" color="primary" onClick={handleSendClick} disabled={disableSend}>
                    Send Announcement
                </Button>
            </Grid>
        </Grid>
    );
};

export default PromotionEditor;
