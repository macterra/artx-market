import React, { useState } from 'react';
import { Box, Button, Grid, TextField } from '@mui/material';

const LnAddressEditor = ({ profile }) => {
    const [address, setAddress] = useState(profile.deposit);
    const [invoice, setInvoice] = useState(null);

    const handleSaveAddress = async () => {
        try {
            const response = await fetch('/api/v1/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ deposit: address }),
            });

            if (response.ok) {
                profile.deposit = address;
                setInvoice(null);
            } else {
                const data = await response.json();
                console.error('Error updating profile:', data.message);
                alert(data.message);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    const handleTestAddress = async () => {
        try {
            const response = await fetch(`/api/v1/profile/${profile.xid}/invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ amount: 10 }),
            });

            if (response.ok) {
                const data = await response.json();
                setInvoice(`lightning:${data.invoice}`);
            } else {
                const data = await response.json();
                console.error('Error:', data.message);
                alert(data.message);
            }
        } catch (error) {
            console.error('Error:', error);
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
