import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Table, TableBody, TableRow, TableCell, Tab, Tabs } from '@mui/material';

const CertView = ({ navigate }) => {
    const { xid } = useParams();
    const [tab, setTab] = useState(null);
    const [cert, setCert] = useState(null);
    const [certJson, setCertJson] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`/api/v1/cert/${xid}`);

                if (response.status !== 200) {
                    navigate('/');
                    return;
                }

                console.log(`CertView status=${response.status}`);

                const cert = await response.json();
                setCert(cert);
                setCertJson(JSON.stringify(cert, null, 2));
                setTab("cert");
            } catch (error) {
                console.error('Error fetching admin data:', error);
            }
        };

        fetchData();
    }, [navigate, xid]);

    if (!cert) {
        return;
    }

    return (
        <Box>
            <h1>Certificate</h1>
            <div>
                <Tabs
                    value={tab}
                    onChange={(event, newTab) => setTab(newTab)}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab key="cert" value="cert" label={'Cert'} />
                    <Tab key="json" value="json" label={'JSON'} />
                </Tabs>
                {tab === 'cert' &&
                    <Box>
                        <Table>
                            <TableBody>
                                <TableRow>
                                    <TableCell>XID</TableCell>
                                    <TableCell>{cert.xid}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>CID</TableCell>
                                    <TableCell>{cert.cid}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Time</TableCell>
                                    <TableCell>{cert.time}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Previous</TableCell>
                                    <TableCell><a href={`/cert/${cert.prev}`}>{cert.prev}</a></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Chain ID</TableCell>
                                    <TableCell>{cert.auth.chainid}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Block Height</TableCell>
                                    <TableCell>{cert.auth.blockheight}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Block Hash</TableCell>
                                    <TableCell>
                                        <a href={`https://mempool.space/block/${cert.auth.blockhash}`} target="_blank" rel="noopener noreferrer">
                                            {cert.auth.blockhash}
                                        </a>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Txn ID</TableCell>
                                    <TableCell>
                                        <a href={`https://mempool.space/tx/${cert.auth.tx.txid}`} target="_blank" rel="noopener noreferrer">
                                            {cert.auth.tx.txid}
                                        </a>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </Box>
                }
                {tab === 'json' &&
                    <Box>
                        <textarea
                            value={certJson}
                            readOnly
                            style={{ width: '600px', height: '400px', overflow: 'auto' }}
                        />
                    </Box>
                }
            </div>
        </Box>
    );
};

export default CertView;
