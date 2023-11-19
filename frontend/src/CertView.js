import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Box, Table, TableBody, TableRow, TableCell, Tab, Tabs } from '@mui/material';

const CertView = () => {
    const { xid } = useParams();
    const navigate = useNavigate();

    const [tab, setTab] = useState(null);
    const [cert, setCert] = useState(null);
    const [certJson, setCertJson] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const getCert = await axios.get(`/api/v1/cert/${xid}`);
                const cert = getCert.data;

                setCert(cert);
                setCertJson(JSON.stringify(cert, null, 2));
                setTab("cert");
            } catch (error) {
                console.error('Error fetching cert data:', error);
                navigate('/');
            }
        };

        fetchData();
    }, [navigate, xid]);

    if (!cert) {
        return;
    }

    return (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" style={{ width: '90vw' }}>
            <div>Certificate</div>
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
                                    <TableCell>{cert.auth.cid}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>XID58</TableCell>
                                    <TableCell>{cert.auth.xid58}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>OP_RETURN</TableCell>
                                    <TableCell>{cert.auth.op_return}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Time</TableCell>
                                    <TableCell>{cert.auth.time}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Previous</TableCell>
                                    <TableCell>
                                        {cert.prev === "None" ? (cert.prev) : (<a href={`/cert/${cert.prev}`}>{cert.prev}</a>)}
                                    </TableCell>
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
