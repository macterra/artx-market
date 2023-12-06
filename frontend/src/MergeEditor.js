import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { Box, Button, Grid, TextField, FormControl, FormControlLabel, Radio, RadioGroup } from '@mui/material';
import axios from 'axios';

const MergeEditor = ({ profile }) => {
    const navigate = useNavigate();

    const [merge, setMerge] = useState(null);
    const [sourceId, setSourceId] = useState(null);
    const [targetId, setTargetId] = useState(null);
    const [disableButtons, setDisableButtons] = useState(false);

    useEffect(() => {
        setMerge('nomerge');

        if (profile.mergeSourceId) {
            setMerge('source');
            setSourceId(profile.mergeSourceId);
        }
        else if (profile.mergeTargetId) {
            setMerge('target');
            setTargetId(profile.mergeTargetId);
        }
    }, [profile]);

    const handleSave = async () => {
        setDisableButtons(true);

        try {
            const getMerge = await axios.post('/api/v1/profile/merge', {
                merge: merge,
                sourceId: sourceId,
                targetId: targetId,
            });

            const { logout, message, newSourceId, newTargetId } = getMerge.data;

            setTargetId(newTargetId);
            setSourceId(newSourceId);
            alert(message);

            if (logout) {
                await axios.get('/logout');
                navigate('/logout');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(error.response.data.message);
            setTargetId('');
            setSourceId('');
        }

        setDisableButtons(false);
    };

    return (
        <form>
            <Grid container direction="column" alignItems="center">
                <Grid item>
                    <p style={{ fontSize: '0.5em' }}>
                        Merge one profile (the source) into another profile (the target).
                        The source must merge with the target's ID, and the target must merge with the source's ID.
                        When there is a match, all assets owned by the source are transferred to the target.
                        After the merge, only the target profile remains.
                        Merges are NOT reversible. Proceed with caution!
                    </p>
                </Grid>
                <Grid item>
                    <FormControl component="fieldset">
                        <RadioGroup
                            aria-label="merge"
                            value={merge}
                            onChange={(event) => setMerge(event.target.value)}
                        >
                            <FormControlLabel
                                value="nomerge"
                                control={<Radio />}
                                label={`Do not merge this profile (ID: ${profile.xid58})`}
                            />
                            <FormControlLabel
                                value="target"
                                control={<Radio />}
                                label={
                                    <Box sx={{ width: '35ch' }}>
                                        Merge this profile into another one:
                                        <TextField
                                            label="Merge Target ID"
                                            value={targetId}
                                            onChange={(e) => setTargetId(e.target.value)}
                                            fullWidth
                                            margin="normal"
                                        />
                                    </Box>
                                }
                            />
                            <FormControlLabel
                                value="source"
                                control={<Radio />}
                                label={
                                    <Box sx={{ width: '35ch' }}>
                                        Merge another profile into this one:
                                        <TextField
                                            label="Merge Source ID"
                                            value={sourceId}
                                            onChange={(e) => setSourceId(e.target.value)}
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
                                    onClick={handleSave}
                                    disabled={disableButtons}>
                                    {merge === 'nomerge' ? 'Save' : 'Merge'}
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>
                </Grid>
            </Grid>
        </form>
    );
};

export default MergeEditor;
