import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    TextField,
    Modal,
} from '@mui/material';

const TokenMinter = ({ metadata, setTab, setRefreshKey }) => {
    const [owner, setOwner] = useState(null);
    const [collection, setCollection] = useState(null);
    const [editions, setEditions] = useState(1);
    const [storageFee, setStorageFee] = useState(null);
    const [collectionId, setCollectionId] = useState(null);
    const [fileSize, setFileSize] = useState(null);
    const [charge, setCharge] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [invoiceUrl, setInvoiceUrl] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profResp = await fetch(`/api/v1/profile/${metadata.asset.owner}`);
                const profileData = await profResp.json();
                const fileSize = metadata.file.size;
                const collectionId = metadata.asset.collection;

                const collResp = await fetch(`/api/v1/collections/${collectionId}`);
                const collectionData = await collResp.json();

                setOwner(profileData.name);
                setCollection(collectionData.asset.title);
                setStorageFee(Math.round(fileSize / 1000));
                setFileSize(fileSize);
                setCollectionId(collectionId);
            } catch (error) {
                console.error('Error fetching image metadata:', error);
            }
        };

        fetchProfile();
    }, [metadata]);

    if (!metadata) {
        return;
    }

    const handleEditionsChange = async (value) => {
        if (value < 1) {
            value = 1;
        }
        if (value > 100) {
            value = 100;
        }

        setEditions(value);
    };

    const handleMintClick = async () => {
        try {
            const response = await fetch('/api/v1/charge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ description: 'mint', amount: storageFee + 100 * editions }),
            });

            const chargeData = await response.json();

            if (chargeData.url) {
                setCharge(chargeData);
                setInvoiceUrl(chargeData.url);
                setModalOpen(true);
            }
        } catch (error) {
            console.error('Error minting:', error);
        }
    };

    const handleInvoiceClose = async () => {
        setModalOpen(false);

        try {
            const response = await fetch(`/api/v1/charge/${charge.id}`);
            const chargeData = await response.json();

            if (chargeData.paid) {
                const response = await fetch(`/api/v1/asset/${metadata.asset.xid}/mint`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', },
                    body: JSON.stringify({ editions: editions }),
                });

                if (response.ok) {
                    setTab('token');
                    setRefreshKey((prevKey) => prevKey + 1);
                } else {
                    const data = await response.json();
                    console.error('Error minting:', data.message);
                    alert(data.message);
                }
            }
        } catch (error) {
            console.error('Error minting:', error);
        }
    };

    return (
        <>
            <TableContainer>
                <Table>
                    <TableBody>
                        <TableRow>
                            <TableCell>Title:</TableCell>
                            <TableCell>{metadata.asset.title}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Owner:</TableCell>
                            <TableCell>
                                <Link to={`/profile/${metadata.asset.owner}`}>{owner}</Link>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Collection:</TableCell>
                            <TableCell>
                                <Link to={`/collection/${collectionId}`}>
                                    {collection}
                                </Link>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Storage fee:</TableCell>
                            <TableCell>{storageFee} sats for {fileSize} bytes</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Minting fee:</TableCell>
                            <TableCell>{100 * editions} sats for {editions} editions</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Total fee:</TableCell>
                            <TableCell>{storageFee + 100 * editions} sats</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
            <form>
                <TextField
                    label="Editions (1-100)"
                    type="number" // Set the input type to "number"
                    value={editions}
                    onChange={(e) => handleEditionsChange(e.target.value)}
                    fullWidth
                    margin="normal"
                    inputProps={{
                        min: 1, // Set the minimum value to 1
                        max: 100, // Set the maximum value to 100
                    }}
                />
                <Button variant="contained" color="primary" onClick={handleMintClick}>
                    Mint
                </Button>
            </form>
            <Modal
                open={modalOpen}
                onClose={() => handleInvoiceClose()}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <div style={{ backgroundColor: '#282c34', padding: '1em', width: '50vw', height: '100vh', overflow: 'auto' }}>
                    <iframe
                        src={invoiceUrl}
                        title="Invoice"
                        width="100%"
                        height="90%"
                        style={{ border: 'none' }}
                    />
                    <Button onClick={() => handleInvoiceClose()}>Close</Button>
                </div>
            </Modal>
        </>
    );
};

export default TokenMinter;
