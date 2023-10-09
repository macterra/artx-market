import React, { useState, useEffect } from 'react';
import { Box, Button, Grid, TextField, FormControl, FormControlLabel, Radio, RadioGroup } from '@mui/material';
import axios from 'axios';

const LnAddressEditor = ({ profile }) => {
    const [address, setAddress] = useState(null);
    const [invoice, setInvoice] = useState(null);
    const [testing, setTesting] = useState(false);
    const [validAddress, setValidAddress] = useState(false);
    const [depositToCredits, setDepositToCredits] = useState(true);

    useEffect(() => {
        setDepositToCredits(profile.depositToCredits);
        setAddress(profile.deposit);
    }, [profile]);

    const handleSaveAddress = async () => {
        if (depositToCredits) {
            try {
                await axios.patch('/api/v1/profile', { depositToCredits: depositToCredits });
                profile.deposit = address;
                setValidAddress(true);
            } catch (error) {
                console.error('Error:', error);
            }
        }
        else {
            setTesting(true);

            try {
                await axios.patch('/api/v1/profile', {
                    deposit: address,
                    depositToCredits: depositToCredits
                });
                profile.deposit = address;
                setValidAddress(true);
            } catch (error) {
                console.error('Error:', error);
                if (error.response) {
                    alert(error.response.data.message);
                }
                else {
                    alert('An error occurred');
                }
                setValidAddress(false);
                setDepositToCredits(true);
            }

            setAddress(profile.deposit);
            setInvoice(null);
            setTesting(false);
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
                    <FormControl component="fieldset">
                        <RadioGroup
                            aria-label="deposit"
                            value={depositToCredits ? 'deposit' : 'address'}
                            onChange={(event) => setDepositToCredits(event.target.value === 'deposit')}
                        >
                            <FormControlLabel
                                value="deposit"
                                control={<Radio />}
                                label="Deposit to credits"
                            />
                            <FormControlLabel
                                value="address"
                                control={<Radio />}
                                label={
                                    <Box sx={{ width: '40ch' }}>
                                        <TextField
                                            label="Lightning Address"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            fullWidth
                                            margin="normal"
                                        />
                                    </Box>
                                }
                            />
                        </RadioGroup>
                    </FormControl>
                </Grid>
                <Grid item>
                    <Box sx={{ marginTop: 2 }}>
                        <Grid container spacing={2}>
                            <Grid item>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleSaveAddress}
                                    disabled={testing}>
                                    Save
                                </Button>
                            </Grid>
                            <Grid item>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleTestAddress}
                                    disabled={!validAddress}>
                                    Test
                                </Button>
                            </Grid>
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
