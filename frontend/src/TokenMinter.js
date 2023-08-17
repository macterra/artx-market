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
    Select,
    MenuItem,
} from '@mui/material';

const TokenMinter = ({ navigate, metadata, setTab, setRefreshKey }) => {
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
    const [royalty, setRoyalty] = useState(0);
    const [license, setLicense] = useState(null);
    const [licenses, setLicenses] = useState([]);
    const [disableMint, setDisableMint] = useState(false);
    const [credits, setCredits] = useState(0);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profile = await axios.get(`/api/v1/profile/${metadata.asset.owner}`);
                const fileSize = metadata.file.size;
                const collectionId = metadata.asset.collection;
                const collection = await axios.get(`/api/v1/collections/${collectionId}`);
                const collectionName = collection.data.asset.title;
                const defaultRoyalty = collection.data.collection.default.royalty;
                const defaultEditions = collection.data.collection.default.editions;
                const defaultLicense = collection.data.collection.default.license;

                setOwner(profile.data.name);
                setCredits(profile.data.credits);
                setCollection(collectionName);
                setRoyalty(defaultRoyalty);
                setLicense(defaultLicense);
                setFileSize(fileSize);
                setCollectionId(collectionId);

                const rates = await axios.get('/api/v1/rates');

                setExchangeRate(rates.data.bitcoin.usd);
                setEditionRate(rates.data.editionRate);

                const licenses = await axios.get('/api/v1/licenses');
                setLicenses(Object.keys(licenses.data));

                const editions = defaultEditions;
                setEditions(editions);
                const editionFee = editions * rates.data.editionRate;
                setEditionFee(editionFee);
                const storageFee = Math.round(fileSize * rates.data.storageRate);
                setStorageFee(storageFee);
                const totalFee = storageFee + editionFee;
                setTotalFee(totalFee);
                const usdPrice = totalFee * rates.data.bitcoin.usd / 100000000;
                setUsdPrice(usdPrice);

                setDisableMint(totalFee > profile.data.credits);
            } catch (error) {
                console.error('Error fetching image metadata:', error);
            }
        };

        fetchProfile();
    }, [metadata]);

    if (!metadata) {
        return;
    }

    const handleRoyaltyChange = async (value) => {
        if (value < 0) {
            value = 0;
        }

        if (value > 25) {
            value = 25;
        }

        setRoyalty(value);
    };

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

        setDisableMint(totalFee > credits);
    };

    const handleMintClick = async () => {
        setDisableMint(true);

        try {
            // TBD: check for possible unexpired charge before creating a new one here
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
                    const mintResponse = await axios.post(`/api/v1/asset/${metadata.xid}/mint`, {
                        license: license,
                        royalty: royalty,
                        editions: editions,
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

        setDisableMint(false);
    };

    const handleMintClick2 = async () => {
        try {
            const mintResponse = await axios.post(`/api/v1/asset/${metadata.xid}/mint`, {
                license: license,
                royalty: royalty,
                editions: editions,
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
    };

    const handleAddCredits = async () => {
        navigate('/profile/edit/credits');
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
                            <TableCell>License:</TableCell>
                            <TableCell>
                                <Select
                                    value={license}
                                    onChange={(e) => setLicense(e.target.value)}
                                    margin="normal"
                                    sx={{ width: '20ch' }}
                                >
                                    {licenses.map((licenseName, index) => (
                                        <MenuItem key={index} value={licenseName}>
                                            {licenseName}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Royalty (0-25%):</TableCell>
                            <TableCell>
                                <TextField
                                    type="number" // Set the input type to "number"
                                    value={royalty}
                                    onChange={(e) => handleRoyaltyChange(e.target.value)}
                                    margin="normal"
                                    inputProps={{
                                        min: 0, // Set the minimum value to 1
                                        max: 25, // Set the maximum value to 100
                                    }}
                                    sx={{ width: '20ch' }}
                                />
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Editions (1-100):</TableCell>
                            <TableCell>
                                <TextField
                                    type="number" // Set the input type to "number"
                                    value={editions}
                                    onChange={(e) => handleEditionsChange(e.target.value)}
                                    margin="normal"
                                    inputProps={{
                                        min: 1, // Set the minimum value to 1
                                        max: 100, // Set the maximum value to 100
                                    }}
                                    sx={{ width: '20ch' }}
                                />
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Storage fee:</TableCell>
                            <TableCell>{storageFee} credits for {fileSize} bytes</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Minting fee:</TableCell>
                            <TableCell>{editionFee} credits for {editions} editions</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Total fee:</TableCell>
                            <TableCell>{totalFee} credits</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Current balance:</TableCell>
                            <TableCell>{credits} credits</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell></TableCell>
                            <TableCell>
                                <Button variant="contained" color="primary" onClick={handleMintClick2} disabled={disableMint}>
                                    Mint
                                </Button>
                                <Button variant="contained" color="primary" onClick={handleAddCredits}>
                                    Add Credits
                                </Button>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
            <form>
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
