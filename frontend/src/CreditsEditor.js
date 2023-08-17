import React, { useState } from 'react';
import { Box, Button, Grid, TextField } from '@mui/material';


const CreditsEditor = ({ profile }) => {

    const minPurchase = 1000;
    const maxPurchase = 100000;

    const [balance, setBalance] = useState(profile.credits);
    const [purchase, setPurchase] = useState(minPurchase);

    const handlePurchaseChange = async (value) => {
        if (value < minPurchase) {
            value = minPurchase;
        }

        if (value > maxPurchase) {
            value = maxPurchase;
        }

        setPurchase(value);
    }

    return (
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
                        <Grid container spacing={2} justify="center">
                            <Grid item>
                                <Button variant="contained" color="primary">
                                    Add Credits
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>
                </Grid>
            </Grid>
        </form>
    );
};

export default CreditsEditor;
