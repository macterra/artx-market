import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import { Box, Button, Paper, TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Tab, Tabs, Grid } from '@mui/material';
import AuditLog from './AuditLog';
import AgentBadge from './AgentBadge';

const AdminView = () => {
    const navigate = useNavigate();

    const [admin, setAdmin] = useState(null);
    const [disableButton, setDisableButton] = useState(false);
    const [tab, setTab] = useState(null);
    const [walletInfo, setWalletInfo] = useState(null);
    const [walletJson, setWalletJson] = useState(null);
    const [userList, setUserList] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const getAdmin = await axios.get(`/api/v1/admin`);
                const admin = getAdmin.data;

                setAdmin(admin);
                setTab('state');

                const getAgents = await axios.get('/api/v1/admin/agents');
                const agents = getAgents.data;

                setUserList(agents);

                const getWalletInfo = await axios.get(`/api/v1/admin/walletinfo`);
                const walletInfo = getWalletInfo.data;
                const walletJson = JSON.stringify(walletInfo, null, 2);

                setWalletInfo(walletInfo);
                setWalletJson(walletJson);
            } catch (error) {
                console.error('Error fetching admin data:', error);
                navigate('/');
            }
        };

        fetchData();
    }, [navigate]);

    if (!admin) {
        return <p></p>;
    }

    const handleClaim = async () => {
        try {
            const getAdmin = await axios.get('/api/v1/admin/claim');
            const admin = getAdmin.data;

            setAdmin(admin);
        } catch (error) {
            console.error('Error fetching admin data:', error);
        }
    };

    const handleSave = async () => {
        setDisableButton(true);
        try {
            const getAdmin = await axios.get('/api/v1/admin/save');
            const admin = getAdmin.data;

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

        if (admin.pending) {
            if (!window.confirm(`Spend USD ${walletInfo.fee_usd} for RBF?`)) {
                return;
            }
        }

        setDisableButton(true);
        try {
            const getAdmin = await axios.get('/api/v1/admin/notarize');
            const admin = getAdmin.data;

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
            const getAdmin = await axios.get('/api/v1/admin/register');
            const admin = getAdmin.data;

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
            const getAdmin = await axios.get('/api/v1/admin/certify');
            const admin = getAdmin.data;

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
        <Box>
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
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Box style={{ width: '90vw' }}>
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
                                            <TableCell>Default Pfp</TableCell>
                                            {admin.default_pfp ? (
                                                <TableCell><a href={admin.default_pfp}>{admin.default_pfp}</a></TableCell>
                                            ) : (
                                                <TableCell>not set</TableCell>
                                            )}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Default Thumbnail</TableCell>
                                            {admin.default_thumbnail ? (
                                                <TableCell><a href={admin.default_thumbnail}>{admin.default_thumbnail}</a></TableCell>
                                            ) : (
                                                <TableCell>not set</TableCell>
                                            )}
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
                                            <TableCell>
                                                <a href={`/cert/${admin.latest}`}>
                                                    {admin.latest}
                                                </a> ({admin.latestCertAge} {admin.latestCertAge === 1 ? 'hour' : 'hours'} ago)
                                            </TableCell>
                                        </TableRow>
                                        {admin.pending ? (
                                            <TableRow>
                                                <TableCell>Pending Txn</TableCell>
                                                <TableCell>
                                                    <a href={`https://mempool.space/tx/${admin.pending}`} target="_blank" rel="noopener noreferrer">
                                                        {admin.pending}
                                                    </a> (for {-admin.nextNotarize} hours)
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            <TableRow>
                                                <TableCell>Next Txn</TableCell>
                                                <TableCell>{admin.nextNotarize} {admin.nextNotarize === 1 ? 'hour' : 'hours'}</TableCell>
                                            </TableRow>
                                        )}
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
                                            <Button variant="contained" color="primary" onClick={handleNotarize} disabled={disableButton}>
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
                    </Box>
                </div>
            </div>
        </Box>
    );
};

export default AdminView;
