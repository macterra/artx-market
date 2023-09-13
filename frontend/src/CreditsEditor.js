import React, { useState } from 'react';
import { Box, Button, Grid, TextField, Modal } from '@mui/material';
import axios from 'axios';

const CreditsEditor = ({ profile, setRefreshProfile }) => {

    const minPurchase = 1000;
    const maxPurchase = 25000;

    const [balance, setBalance] = useState(profile.credits);
    const [purchase, setPurchase] = useState(minPurchase);
    const [charge, setCharge] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [invoiceUrl, setInvoiceUrl] = useState('');
    const [disablePurchase, setDisablePurchase] = useState(false);

    const handlePurchaseChange = async (value) => {
        if (value < minPurchase) {
            value = minPurchase;
        }

        if (value > maxPurchase) {
            value = maxPurchase;
        }

        setPurchase(value);
    }

    const handlePurchaseClick = async () => {
        setDisablePurchase(true);

        try {
            // TBD: check for possible unexpired charge before creating a new one here
            const response = await axios.post('/api/v1/charge', {
                description: 'add credits',
                amount: purchase
            });

            const chargeData = response.data;

            if (chargeData.url) {
                setCharge(chargeData);
                setInvoiceUrl(chargeData.url);
                setModalOpen(true);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleInvoiceClose = async () => {
        setModalOpen(false);

        try {
            const chargeResponse = await axios.get(`/api/v1/charge/${charge.id}`);
            const chargeData = chargeResponse.data;

            if (chargeData.paid) {
                try {
                    const creditResponse = await axios.post(`/api/v1/profile/credit`, {
                        charge: chargeData,
                    });

                    if (creditResponse.status === 200) {
                        setBalance(creditResponse.data.credits);
                        setRefreshProfile((prevKey) => prevKey + 1);
                    } else {
                        console.error('Error:', creditResponse.data.message);
                        alert(creditResponse.data.message);
                    }
                } catch (error) {
                    console.error('Error:', error);
                }
            }
        } catch (error) {
            console.error('Error:', error);
        }

        setDisablePurchase(false);
    };

    return (
        <div>
            <form>
                <Grid container direction="column" alignItems="center">
                    <Grid item>
                        <TextField
                            label="Current balance"
                            value={balance}
                            fullWidth
                            margin="normal"
                            sx={{ width: '20ch' }}
                        />
                    </Grid>
                    <Grid item>
                        <TextField
                            label="Purchase (1 credit/sat)"
                            value={purchase}
                            fullWidth
                            margin="normal"
                            type="number"
                            onChange={(e) => handlePurchaseChange(e.target.value)}
                            inputProps={{
                                min: minPurchase,
                                max: maxPurchase,
                            }}
                            sx={{ width: '20ch' }}
                        />
                    </Grid>
                    <Grid item>
                        <Box sx={{ marginTop: 2 }}>
                            <Grid container spacing={2}>
                                <Grid item>
                                    <Button variant="contained" color="primary" onClick={() => setPurchase(1000)}>
                                        1K
                                    </Button>
                                </Grid>
                                <Grid item>
                                    <Button variant="contained" color="primary" onClick={() => setPurchase(5000)}>
                                        5K
                                    </Button>
                                </Grid>
                                <Grid item>
                                    <Button variant="contained" color="primary" onClick={() => setPurchase(10000)}>
                                        10K
                                    </Button>
                                </Grid>
                                <Grid item>
                                    <Button variant="contained" color="primary" onClick={() => setPurchase(25000)}>
                                        25K
                                    </Button>
                                </Grid>
                            </Grid>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item>
                                    <Button variant="contained" color="primary" onClick={handlePurchaseClick} disabled={disablePurchase}>
                                        Add Credits
                                    </Button>
                                </Grid>
                            </Grid>
                        </Box>
                    </Grid>
                </Grid>
            </form>
            <Modal
                open={modalOpen}
                onClose={() => handleInvoiceClose()}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <div style={{ backgroundColor: '#282c34', padding: '1em', width: '50vw', height: '100vh', overflow: 'auto' }}>
                    <iframe
                        src={invoiceUrl}
                        title="Invoice"
                        width="100%"
                        height="90%"
                        style={{ border: 'none' }}
                    />
                    <Button onClick={() => handleInvoiceClose()}>Close</Button>
                </div>
            </Modal>
        </div>
    );
};

export default CreditsEditor;
