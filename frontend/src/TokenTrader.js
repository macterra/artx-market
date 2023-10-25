import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Modal,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
} from '@mui/material';
import axios from 'axios';
import InvoiceView from './InvoiceView';

const TokenTrader = ({ metadata, xid, setRefreshKey }) => {
    const [nfts, setNfts] = useState(0);
    const [exchangeRate, setExchangeRate] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [nftSale, setNftSale] = useState(null);
    const [invoice, setInvoice] = useState(null);
    const [disableBuy, setDisableBuy] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch('/api/v1/rates');
                const xrates = await response.json();
                setExchangeRate(xrates.bitcoin.usd);

                const nfts = [];

                if (xid) {
                    // single NFT specified from NftView
                    const response = await fetch(`/api/v1/asset/${xid}`);
                    const nft = await response.json();
                    nfts.push(nft);
                }
                else {
                    for (const xid of metadata.token.nfts) {
                        const response = await fetch(`/api/v1/asset/${xid}`);
                        const nft = await response.json();
                        nfts.push(nft);
                    }
                }

                setNfts(nfts);
            } catch (error) {
                console.error('Error:', error);
            }
        };

        fetchProfile();
    }, [metadata]);

    if (!metadata || !metadata.token || !nfts) {
        return;
    }

    const handleListClick = async (nft) => {
        try {
            const response = await fetch(`/api/v1/asset/${nft.xid}/list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ price: nft.nft.newPrice }),
            });

            if (response.ok) {
                nft.nft.price = nft.nft.newPrice;
                setRefreshKey((prevKey) => prevKey + 1);
            } else {
                const data = await response.json();
                console.error('Error listing:', data.message);
                alert(data.message);
            }
        } catch (error) {
            console.error('Error listing:', error);
        }
    };

    function TradeTableRow({ nft }) {
        const [disableSave, setDisableSave] = useState(true);
        const [usdPrice, setUsdPrice] = useState(0);
        const [listed, setListed] = useState(false);

        const updatePrice = (price) => {
            if (price > 0) {
                const usdPrice = price * exchangeRate / 100000000;
                setUsdPrice(`$${usdPrice.toFixed(2)}`);
            }
            else {
                setUsdPrice('not for sale');
            }
        };

        useEffect(() => {
            updatePrice(nft.nft.price);
            setListed(nft.nft.price > 0);
        }, [nft]);

        return (
            <TableRow>
                <TableCell><a href={`/nft/${nft.xid}`}>{nft.asset.title}</a></TableCell>
                <TableCell align="right">{usdPrice}</TableCell>
                {nft.userIsOwner ?
                    (
                        <TableCell>
                            <Box display="flex" alignItems="center">
                                <TextField
                                    defaultValue={nft.nft.price}
                                    type="number"
                                    onChange={(event) => {
                                        nft.nft.newPrice = parseInt(event.target.value, 10) || 0;
                                        setDisableSave(nft.nft.price === nft.nft.newPrice);
                                        updatePrice(nft.nft.newPrice);
                                    }}
                                    inputProps={{ min: 0 }}
                                    sx={{ width: '14ch', marginRight: 1 }}
                                />
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => {
                                        handleListClick(nft);
                                        setDisableSave(true);
                                        setListed(usdPrice > 0);
                                    }}
                                    disabled={disableSave}
                                >
                                    Save
                                </Button>
                            </Box>
                        </TableCell>

                    ) : (
                        <TableCell>
                            <Box display="flex" alignItems="center">
                                <TextField
                                    defaultValue={nft.nft.price}
                                    type="number"
                                    disabled={true}
                                    sx={{ width: '14ch', marginRight: 1 }}
                                />
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => {
                                        handleBuyClick(nft);
                                    }}
                                    disabled={!listed || disableBuy}
                                >
                                    Buy
                                </Button>
                            </Box>
                        </TableCell>
                    )
                }
                <TableCell>{listed ? '✔' : ''}</TableCell>
            </TableRow>
        );
    };

    const handleBuyClick = async (nft) => {
        setNftSale(nft);
        setDisableBuy(true);

        try {
            const response = await axios.post('/api/v1/invoice', {
                description: `buy ${nft.asset.title}`,
                amount: nft.nft.price
            });

            const invoice = response.data;

            if (invoice) {
                setInvoice(invoice);
                setModalOpen(true);
            }
            else {
                setDisableBuy(false);
                setNftSale(null);
            }
        } catch (error) {
            console.error('Error:', error);

            if (error.response.status === 401) {
                alert("You have to login first");
                return;
            }
        }
    };

    const handleInvoiceClose = async () => {
        setModalOpen(false);

        if (invoice.paid) {
            try {
                const response = await fetch(`/api/v1/asset/${nftSale.xid}/buy`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', },
                    body: JSON.stringify({ invoice: invoice }),
                });

                if (response.ok) {
                    setRefreshKey((prevKey) => prevKey + 1);
                } else {
                    const data = await response.json();
                    console.error('Error:', data.message);
                    alert(data.message);
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }

        setDisableBuy(false);
    };

    return (
        <>
            <TableContainer>
                <Table>
                    <TableBody>
                        <TableRow>
                            <TableCell>Title:</TableCell>
                            {xid ? (
                                <TableCell>{metadata.asset.title} ({nfts[0].asset.title})</TableCell>
                            ) : (
                                <TableCell>{metadata.asset.title}</TableCell>
                            )}
                        </TableRow>
                        {!xid &&
                            <TableRow>
                                <TableCell>Editions:</TableCell>
                                <TableCell>{metadata.token.editions > 1 ? metadata.token.editions : "1 of 1"}</TableCell>
                            </TableRow>
                        }
                        <TableRow>
                            <TableCell>Exchange rate:</TableCell>
                            <TableCell>{exchangeRate} USD/BTC</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={2}>
                                <TableContainer component={Paper} style={{ maxHeight: '600px', overflow: 'auto' }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Edition</TableCell>
                                                <TableCell>Price (USD)</TableCell>
                                                <TableCell>Price (sats)</TableCell>
                                                <TableCell>Listed</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {nfts.map((nft, index) => (
                                                <TradeTableRow key={index} nft={nft} />
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
            {invoice &&
                <Modal
                    open={modalOpen}
                    onClose={() => handleInvoiceClose()}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <div style={{
                        backgroundColor: '#282c34',
                        padding: '1em',
                        width: '600px',
                        height: '600px',
                        overflow: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <InvoiceView invoice={invoice} />
                        <Button
                            style={{ marginTop: '20px' }}
                            variant="contained"
                            color="primary"
                            onClick={() => handleInvoiceClose()}
                        >
                            Close
                        </Button>
                    </div>
                </Modal>
            }
        </>
    );
};

export default TokenTrader;
