import React, { useState } from 'react';
import { Box, Button, Grid, TextField, Modal } from '@mui/material';
import axios from 'axios';
import InvoiceView from './InvoiceView';

const CreditsTrader = ({ profile, setRefreshProfile }) => {

    const minPurchase = 1000;
    const maxPurchase = 25000;

    const [balance, setBalance] = useState(profile.credits);
    const [purchase, setPurchase] = useState(minPurchase);
    const [modalOpen, setModalOpen] = useState(false);
    const [disablePurchase, setDisablePurchase] = useState(false);
    const [invoice, setInvoice] = useState(null);

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
            const response = await axios.post('/api/v1/invoice', {
                description: `${purchase} credits`,
                amount: purchase
            });

            const invoice = response.data;

            if (invoice) {
                setInvoice(invoice);
                setModalOpen(true);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleInvoiceClose = async () => {
        setModalOpen(false);

        if (invoice.paid) {
            try {
                const creditResponse = await axios.post(`/api/v1/profile/credit`, {
                    invoice: invoice,
                });

                if (creditResponse.status === 200) {
                    setBalance(creditResponse.data.credits);
                    setRefreshProfile((prevKey) => prevKey + 1);
                } else {
                    console.error('Error:', creditResponse.data.message);
                    alert(creditResponse.data.message);
                }
            }
            catch (error) {
                console.error('Error:', error);
            }
        }

        setInvoice(null);
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
            {invoice &&
                <Modal
                    open={modalOpen}
                    onClose={() => handleInvoiceClose()}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <div style={{
                        backgroundColor: '#282c34',
                        padding: '1em',
                        width: '600px',
                        height: '600px',
                        overflow: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <InvoiceView invoice={invoice} title='Buy Credits' />
                        <Button
                            style={{ marginTop: '20px' }}
                            variant="contained"
                            color="primary"
                            onClick={() => handleInvoiceClose()}
                        >
                            Close
                        </Button>
                    </div>
                </Modal>
            }
        </div>
    );
};

export default CreditsTrader;
