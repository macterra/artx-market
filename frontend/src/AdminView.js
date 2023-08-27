import React, { useState, useEffect } from 'react';
import { Box, Button, Table, TableBody, TableRow, TableCell, Tab, Tabs, Grid } from '@mui/material';

const AdminView = ({ navigate }) => {

    const [admin, setAdmin] = useState(null);
    const [disableSave, setDisableSave] = useState(false);
    const [disableVerify, setDisableVerify] = useState(false);
    const [tab, setTab] = useState(null);
    const [logs, setLogs] = useState([]);
    const [invalidAssets, setInvalidAssets] = useState([]);
    const [invalidAgents, setInvalidAgents] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`/api/v1/admin`);

                if (response.status === 401) {
                    navigate('/');
                    return;
                }

                const admin = await response.json();
                setAdmin(admin);
                setTab('state');
            } catch (error) {
                console.error('Error fetching admin data:', error);
            }
        };

        fetchData();
    }, [navigate]);

    if (!admin) {
        return <p></p>;
    }

    const handleClaim = async () => {
        try {
            const response = await fetch('/api/v1/admin/claim');
            const admin = await response.json();
            setAdmin(admin);
        } catch (error) {
            console.error('Error fetching admin data:', error);
        }
    };

    const handleSave = async () => {
        setDisableSave(true);
        try {
            const response = await fetch('/api/v1/admin/save');
            const admin = await response.json();
            if (admin.xid) {
                setAdmin(admin);
            }
            else {
                alert("Save failed");
            }
        } catch (error) {
            console.error('Error fetching admin data:', error);
        }
        setDisableSave(false);
    };
    
    const handlePeg = async () => {
        setDisableSave(true);
        try {
            const response = await fetch('/api/v1/admin/peg');
            const admin = await response.json();
            if (admin.pending) {
                setAdmin(admin);
            }
            else {
                alert("Peg failed");
            }
        } catch (error) {
            console.error('Error fetching admin data:', error);
        }
        setDisableSave(false);
    };
    
    const handleCertify = async () => {
        setDisableSave(true);
        try {
            const response = await fetch('/api/v1/admin/certify');
            const admin = await response.json();
            if (!admin.pending) {
                setAdmin(admin);
            }
            else {
                alert("Still pending");
            }
        } catch (error) {
            console.error('Error fetching admin data:', error);
        }
        setDisableSave(false);
    };

    const pinAssets = async () => {
        setDisableVerify(true);
        setLogs([]);

        const response = await fetch('/api/v1/admin/assets');
        const assets = await response.json();
        const logs = [];

        for (const [i, xid] of assets.entries()) {
            const response = await fetch(`/api/v1/admin/pin/asset/${xid}`);
            const asset = await response.json();
            const index = (i+1).toString().padStart(5, " ");

            if (asset.cid) {
                logs.push(`${index} Asset ${xid} ${asset.cid}`);
            }
            else if (asset.error) {
                logs.push(`${index} Asset ${xid} ${asset.error}`);
            }

            setLogs([...logs]);
        }

        setDisableVerify(false);
    };


    const verifyAssets = async () => {
        setDisableVerify(true);
        setLogs([]);

        const response = await fetch('/api/v1/admin/assets');
        const assets = await response.json();
        const logs = [];
        const invalidAssets = [];

        for (const [i, xid] of assets.entries()) {
            const response = await fetch(`/api/v1/admin/verify/asset/${xid}`);
            const asset = await response.json();
            const index = (i+1).toString().padStart(5, " ");

            if (asset.verified) {
                logs.push(`${index} Asset ${xid} ✔`);
            }
            else {
                logs.push(`${index} Asset ${xid} ${asset.error}`);
                invalidAssets.push(xid);
            }

            setLogs([...logs]);
        }

        setInvalidAssets(invalidAssets);
        setDisableVerify(false);
    };

    const fixAssets = async () => {
        setDisableVerify(true);

        const logs = [];
        const stillInvalid = [];

        for (const [i, xid] of invalidAssets.entries()) {
            const response = await fetch(`/api/v1/admin/fix/asset/${xid}`);
            const asset = await response.json();
            const index = (i+1).toString().padStart(5, " ");

            if (asset.fixed) {
                logs.push(`${index} Asset ${xid} ✔`);
            }
            else {
                logs.push(`${index} Asset ${xid} ${asset.message}`);
                stillInvalid.push(xid);
            }

            setLogs([...logs]);
        }

        setInvalidAssets(stillInvalid);
        setDisableVerify(false);
    };

    const verifyAgents = async () => {
        setDisableVerify(true);
        setLogs([]);

        const response = await fetch('/api/v1/admin/agents');
        const agents = await response.json();
        const logs = [];
        const invalidAgents = [];

        for (const [i, xid] of agents.entries()) {
            const response = await fetch(`/api/v1/admin/verify/agent/${xid}`);
            const asset = await response.json();
            const index = (i+1).toString().padStart(5, " ");

            if (asset.verified) {
                logs.push(`${index} Agent ${xid} ✔`);
            }
            else {
                logs.push(`${index} Agent ${xid} ${asset.error}`);
                invalidAgents.push(xid);
            }

            setLogs([...logs]);

            if (invalidAgents.length > 0) {
                setInvalidAgents(invalidAgents);
            }
        }

        setDisableVerify(false);
    };

    const fixAgents = async () => {
        setDisableVerify(true);

        const logs = [];
        const stillInvalid = [];

        for (const [i, xid] of invalidAgents.entries()) {
            const response = await fetch(`/api/v1/admin/fix/agent/${xid}`);
            const asset = await response.json();
            const index = (i+1).toString().padStart(5, " ");

            if (asset.fixed) {
                logs.push(`${index} Agent ${xid} ✔`);
            }
            else {
                logs.push(`${index} Agent ${xid} ${asset.message}`);
                stillInvalid.push(xid);
            }

            setLogs([...logs]);
        }

        setInvalidAgents(stillInvalid);
        setDisableVerify(false);
    };

    if (!admin.owner) {
        return (
            <Button variant="contained" color="primary" onClick={handleClaim}>
                Claim Admin
            </Button>
        )
    }

    return (
        <Box>
            <h1>Admin</h1>
            <div>
                <Tabs
                    value={tab}
                    onChange={(event, newTab) => setTab(newTab)}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab key="state" value="state" label={'State'} />
                    <Tab key="verify" value="verify" label={'Verify'} />
                </Tabs>
                {tab === 'state' &&
                    <Box>
                        <Table>
                            <TableBody>
                                <TableRow>
                                    <TableCell>XID</TableCell>
                                    <TableCell>{admin.xid}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Owner</TableCell>
                                    <TableCell>{admin.owner}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Created</TableCell>
                                    <TableCell>{admin.created}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Updated</TableCell>
                                    <TableCell>{admin.updated}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Githash</TableCell>
                                    <TableCell>{admin.githash}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>CID</TableCell>
                                    <TableCell>{admin.cid}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Certificate</TableCell>
                                    <TableCell>{admin.latest}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Pending Txn</TableCell>
                                    <TableCell>{admin.pending}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                        <Button variant="contained" color="primary" onClick={handleSave} disabled={disableSave}>
                            Save All
                        </Button>
                        <Button variant="contained" color="primary" onClick={handlePeg} disabled={disableSave}>
                            Peg State
                        </Button>
                        <Button variant="contained" color="primary" onClick={handleCertify} disabled={disableSave}>
                            Certify
                        </Button>
                    </Box>
                }
                {tab === 'verify' &&
                    <Box>
                        <textarea
                            value={logs.join('\n')}
                            readOnly
                            style={{ width: '400px', height: '300px', overflow: 'auto' }}
                        />
                        <br></br>
                        <Grid container direction="row" justifyContent="center" alignItems="center" spacing={3}>
                            <Grid item>
                                <Button variant="contained" color="primary" onClick={pinAssets} disabled={disableVerify}>
                                    Pin Assets
                                </Button>
                            </Grid>
                            <Grid item>
                                <Button variant="contained" color="primary" onClick={verifyAssets} disabled={disableVerify}>
                                    Verify Assets
                                </Button>
                            </Grid>
                            {invalidAssets.length > 0 &&
                                <Grid item>
                                    <Button variant="contained" color="primary" onClick={fixAssets} disabled={disableVerify}>
                                        Fix Assets
                                    </Button>
                                </Grid>
                            }
                            <Grid item>
                                <Button variant="contained" color="primary" onClick={verifyAgents} disabled={disableVerify}>
                                    Verify Agents
                                </Button>
                            </Grid>
                            {invalidAgents.length > 0 &&
                                <Grid item>
                                    <Button variant="contained" color="primary" onClick={fixAgents} disabled={disableVerify}>
                                        Fix Agents
                                    </Button>
                                </Grid>
                            }
                        </Grid>
                    </Box>
                }
            </div>
        </Box>
    );
};

export default AdminView;
