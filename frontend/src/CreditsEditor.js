import React, { useState } from 'react';
import { Box, Button, Grid, TextField, Modal } from '@mui/material';
import axios from 'axios';
import QrCard from './QrCard';

const CreditsEditor = ({ profile, setRefreshProfile }) => {

    const minPurchase = 1000;
    const maxPurchase = 25000;

    const [balance, setBalance] = useState(profile.credits);
    const [purchase, setPurchase] = useState(minPurchase);
    const [modalOpen, setModalOpen] = useState(false);
    const [disablePurchase, setDisablePurchase] = useState(false);
    const [invoice, setInvoice] = useState(null);
    const [paid, setPaid] = useState(false);

    const handlePurchaseChange = async (value) => {
        if (value < minPurchase) {
            value = minPurchase;
        }

        if (value > maxPurchase) {
            value = maxPurchase;
        }

        setPurchase(value);
    }

    function initWebSocket(wslink) {
        const reconnectInterval = 5000;
        const ws = new WebSocket(wslink);

        ws.addEventListener('open', () => {
            console.log(`ws open`);
        });

        ws.addEventListener('close', () => {
            console.log(`ws close`);
            setTimeout(initWebSocket, reconnectInterval);
        });

        ws.addEventListener('error', error => {
            console.log(`ws error: ${error}`)
        });

        ws.addEventListener('message', event => {
            try {
                const data = JSON.parse(event.data);

                console.log(`ws message ${JSON.stringify(data, null, 4)}`);

                if (data.payment &&
                    data.payment.checking_id &&
                    //data.payment.checking_id === invoice.checking_id &&
                    data.payment.pending === false) {
                    console.log(`invoice ${data.payment.checking_id} paid!`);
                    setPaid(true);
                }
            } catch (error) {
                console.log(`error: ${error}`);
            }
        });
    };

    const handlePurchaseClick = async () => {
        setDisablePurchase(true);

        try {
            // TBD: check for possible unexpired charge before creating a new one here
            const response = await axios.post('/api/v1/invoice', {
                description: 'add credits',
                amount: purchase,
                timeout: 60,
            });

            const invoice = response.data;

            if (invoice) {
                setInvoice(invoice);
                setModalOpen(true);
                initWebSocket(invoice.wslink);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleInvoiceClose = async () => {
        setModalOpen(false);
        setDisablePurchase(false);

        if (!paid) {
            return;
        }

        try {
            invoice.paid = paid;

            const creditResponse = await axios.post(`/api/v1/profile/credit`, {
                invoice: invoice,
            });

            if (creditResponse.status === 200) {
                setBalance(creditResponse.data.credits);
                setRefreshProfile((prevKey) => prevKey + 1);
                setInvoice(null);
                setPaid(false);
            } else {
                console.error('Error:', creditResponse.data.message);
                alert(creditResponse.data.message);
            }
        }
        catch (error) {
            console.error('Error:', error);
        }
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
                        width: '500px',
                        height: '500px',
                        overflow: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <div>Invoice</div>
                        <QrCard invoice={invoice} paid={paid} />
                        <Button variant="contained" color="primary" onClick={() => handleInvoiceClose()}>Close</Button>
                    </div>
                </Modal>
            }
        </div>
    );
};

export default CreditsEditor;
