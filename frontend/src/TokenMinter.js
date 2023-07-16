import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
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
    const [collectionId, setCollectionId] = useState(null);
    const [fileSize, setFileSize] = useState(0);
    const [charge, setCharge] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [invoiceUrl, setInvoiceUrl] = useState('');
    const [exchangeRate, setExchangeRate] = useState(0);
    const [editionRate, setEditionRate] = useState(0);
    const [editionFee, setEditionFee] = useState(0);
    const [storageFee, setStorageFee] = useState(0);
    const [totalFee, setTotalFee] = useState(0);
    const [usdPrice, setUsdPrice] = useState(0);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profile = await axios.get(`/api/v1/profile/${metadata.asset.owner}`);
                const fileSize = metadata.file.size;
                const collectionId = metadata.asset.collection;
                const collection = await axios.get(`/api/v1/collections/${collectionId}`);
                const collectionName = collection.data.asset.title;

                setOwner(profile.data.name);
                setCollection(collectionName);
                setFileSize(fileSize);
                setCollectionId(collectionId);

                const rates = await axios.get('/api/v1/rates');

                setExchangeRate(rates.data.bitcoin.usd);
                setEditionRate(rates.data.editionRate);

                const editions = 1;
                setEditions(editions);
                const editionFee = editions * rates.data.editionRate;
                setEditionFee(editionFee);
                const storageFee = Math.round(fileSize * rates.data.storageRate);
                setStorageFee(storageFee);
                const totalFee = storageFee + editionFee;
                setTotalFee(totalFee);
                const usdPrice = totalFee * rates.data.bitcoin.usd / 100000000;
                setUsdPrice(usdPrice);
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

        const editions = value;
        setEditions(editions);
        const editionFee = editions * editionRate;
        setEditionFee(editionFee);
        const totalFee = storageFee + editionFee;
        setTotalFee(totalFee);
        const usdPrice = totalFee * exchangeRate / 100000000;
        setUsdPrice(usdPrice);
    };

    const handleMintClick = async () => {
        try {
            const response = await axios.post('/api/v1/charge', {
                description: 'mint',
                amount: storageFee + 100 * editions
            });

            const chargeData = response.data;

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
            const chargeResponse = await axios.get(`/api/v1/charge/${charge.id}`);
            const chargeData = chargeResponse.data;

            if (chargeData.paid) {
                try {
                    const mintResponse = await axios.post(`/api/v1/asset/${metadata.asset.xid}/mint`, {
                        editions: editions
                    });

                    if (mintResponse.status === 200) {
                        setTab('token');
                        setRefreshKey((prevKey) => prevKey + 1);
                    } else {
                        console.error('Error minting:', mintResponse.data.message);
                        alert(mintResponse.data.message);
                    }
                } catch (error) {
                    console.error('Error minting:', error);
                }
            }
        } catch (error) {
            console.error('Error:', error);
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
                            <TableCell>Exchange rate:</TableCell>
                            <TableCell>{exchangeRate} USD/BTC</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Storage fee:</TableCell>
                            <TableCell>{storageFee} sats for {fileSize} bytes</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Minting fee:</TableCell>
                            <TableCell>{editionFee} sats for {editions} editions</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Total fee:</TableCell>
                            <TableCell>{totalFee} sats (${usdPrice.toFixed(2)})</TableCell>
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
