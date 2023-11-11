import React, { useState, useEffect } from 'react';
import { Box, Button, Paper, TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Tab, Tabs, Grid } from '@mui/material';
import AuditLog from './AuditLog';
import AgentBadge from './AgentBadge';

const AdminView = ({ navigate }) => {

    const [admin, setAdmin] = useState(null);
    const [disableButton, setDisableButton] = useState(false);
    const [disableVerify, setDisableVerify] = useState(false);
    const [tab, setTab] = useState(null);
    const [logs, setLogs] = useState([]);
    const [walletJson, setWalletJson] = useState(null);
    const [userList, setUserList] = useState(null);

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

                const agentResponse = await fetch('/api/v1/admin/agents');

                if (agentResponse.ok) {
                    const userList = await agentResponse.json();
                    setUserList(userList);
                }

                const walletResponse = await fetch(`/api/v1/admin/walletinfo`);

                if (walletResponse.ok) {
                    const walletinfo = await walletResponse.json();
                    const walletJson = JSON.stringify(walletinfo, null, 2);
                    setWalletJson(walletJson);
                }

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
        setDisableButton(true);
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
        setDisableButton(false);
    };

    const handleNotarize = async () => {
        setDisableButton(true);
        try {
            const response = await fetch('/api/v1/admin/notarize');
            const admin = await response.json();
            if (admin.pending) {
                setAdmin(admin);
            }
            else {
                alert("notarize failed");
            }
        } catch (error) {
            console.error('Error fetching admin data:', error);
        }
        setDisableButton(false);
    };

    const handleRegister = async () => {
        setDisableButton(true);
        try {
            const response = await fetch('/api/v1/admin/register');
            const admin = await response.json();
            if (admin.pending) {
                setAdmin(admin);
            }
            else {
                alert("Register failed");
            }
        } catch (error) {
            console.error('Error fetching admin data:', error);
        }
        setDisableButton(false);
    };

    const handleCertify = async () => {
        setDisableButton(true);
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
        setDisableButton(false);
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
            const index = (i + 1).toString().padStart(5, " ");

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

    if (!admin.owner) {
        return (
            <Box>
                <Button variant="contained" color="primary" onClick={handleClaim}>
                    Claim Admin
                </Button>
            </Box>
        )
    }

    return (
        <Box style={{ width: '90vw' }}>
            <div>Admin</div>
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
                    <Tab key="wallet" value="wallet" label={'Wallet'} />
                    <Tab key="users" value="users" label={'Users'} />
                    <Tab key="auditlog" value="auditlog" label={'Audit Log'} />
                </Tabs>
                {tab === 'state' &&
                    <Box>
                        <Table>
                            <TableBody>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>{admin.name}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>XID</TableCell>
                                    <TableCell>{admin.xid}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>XID58</TableCell>
                                    <TableCell>{admin.xid58}</TableCell>
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
                                    <TableCell><a href={`/cert/${admin.latest}`}>{admin.latest}</a></TableCell>
                                </TableRow>
                                {admin.pending &&
                                    <TableRow>
                                        <TableCell>Pending Txn</TableCell>
                                        <TableCell>
                                            <a href={`https://mempool.space/tx/${admin.pending}`} target="_blank" rel="noopener noreferrer">
                                                {admin.pending}
                                            </a>
                                        </TableCell>
                                    </TableRow>
                                }
                            </TableBody>
                        </Table>
                        <Grid container direction="row" justifyContent="center" alignItems="center" spacing={3}>
                            <Grid item>
                                <Button variant="contained" color="primary" onClick={handleSave} disabled={disableButton}>
                                    Save All
                                </Button>
                            </Grid>
                            {admin.latest ? (
                                <Grid item>
                                    <Button variant="contained" color="primary" onClick={handleNotarize} disabled={admin.pending || disableButton}>
                                        Notarize State
                                    </Button>
                                </Grid>
                            ) : (
                                <Grid item>
                                    <Button variant="contained" color="primary" onClick={handleRegister} disabled={admin.pending || disableButton}>
                                        Register State
                                    </Button>
                                </Grid>
                            )}
                            <Grid item>
                                <Button variant="contained" color="primary" onClick={handleCertify} disabled={!admin.pending || disableButton}>
                                    Certify
                                </Button>
                            </Grid>
                        </Grid>
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
                        </Grid>
                    </Box>
                }
                {tab === 'wallet' &&
                    <Box>
                        <textarea
                            value={walletJson}
                            readOnly
                            style={{ width: '600px', height: '400px', overflow: 'auto' }}
                        />
                    </Box>
                }
                {tab === 'users' && userList &&
                    <TableContainer component={Paper} style={{ maxHeight: '600px', overflow: 'auto' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>user</TableCell>
                                    <TableCell>deposit</TableCell>
                                    <TableCell>credits</TableCell>
                                    <TableCell>updated</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {userList.map((user, index) => (
                                    <TableRow>
                                        <TableCell><AgentBadge agent={user} /></TableCell>
                                        <TableCell>{user.deposit}</TableCell>
                                        <TableCell align="right">{user.credits}</TableCell>
                                        <TableCell>{user.updated}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                }
                {tab === 'auditlog' &&
                    <AuditLog />
                }
            </div>
        </Box>
    );
};

export default AdminView;
