import React, { useState } from 'react';
import { Box, Button, Grid, TextField } from '@mui/material';
import axios from 'axios';

const LnAddressEditor = ({ profile }) => {
    const [address, setAddress] = useState(profile.deposit);
    const [invoice, setInvoice] = useState(null);

    const handleSaveAddress = async () => {
        try {
            const response = await axios.patch('/api/v1/profile', { deposit: address });

            if (response.status === 200) {
                profile.deposit = address;
                setInvoice(null);
            } else {
                alert(response.data.message);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleTestAddress = async () => {
        try {
            const response = await axios.post(`/api/v1/profile/${profile.xid}/invoice`, { amount: 10 });

            if (response.status === 200) {
                setInvoice(`lightning:${response.data.invoice}`);
            } else {
                console.error('Status Error:', response.data.message);
                alert(response.data.message);
            }
        } catch (error) {
            console.error('Catch Error:', error);
            alert(error.message);
        }
    };

    return (
        <form>
            <Grid container direction="column" alignItems="center">
                <Grid item>
                    <TextField
                        label="Lightning Address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        fullWidth
                        margin="normal"
                        sx={{ width: '20ch' }}
                    />
                </Grid>
                <Grid item>
                    <Box sx={{ marginTop: 2 }}>
                        <Grid container spacing={2}>
                            <Grid item>
                                <Button variant="contained" color="primary" onClick={handleSaveAddress}>
                                    Save
                                </Button>
                            </Grid>
                            {address &&
                                <Grid item>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={handleTestAddress}
                                        disabled={!!invoice}>
                                        Test
                                    </Button>
                                </Grid>
                            }
                        </Grid>
                    </Box>
                </Grid>
                {invoice &&
                    <Grid item>
                        <div>
                            <a href={invoice} onClick={() => setInvoice(null)}>⚡ zap 10 sats ⚡</a>
                        </div>
                    </Grid>
                }
            </Grid>
        </form>
    );
};

export default LnAddressEditor;
