import React, { useEffect, useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    TableHead,
    Paper,
    TextField,
    Button,
} from '@mui/material';

const TokenTrader = ({ metadata, setRefreshKey }) => {
    const [ownedNfts, setOwnedNfts] = useState(0);
    const [listedNfts, setListedNfts] = useState(0);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                let response = await fetch(`/api/profile/`);
                const myProfile = await response.json();

                const ownedNfts = [];
                const listedNfts = [];

                for (const xid of metadata.token.nfts) {
                    response = await fetch(`/api/asset/${xid}`);
                    const nft = await response.json();
                    response = await fetch(`/api/profile/${nft.asset.owner}`);
                    nft.owner = await response.json();

                    if (nft.asset.owner === myProfile.id) {
                        ownedNfts.push(nft);
                    }
                    else if (nft.nft.price > 0) {
                        listedNfts.push(nft);
                    }
                }

                setOwnedNfts(ownedNfts);
                setListedNfts(listedNfts);
            } catch (error) {
                console.error('Error fetching asset owner:', error);
            }
        };

        fetchProfile();
    }, [metadata]);

    if (!metadata || !metadata.token) {
        return;
    }

    const handleListClick = async (nft) => {
        try {
            const response = await fetch(`/api/asset/${nft.asset.xid}/list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ price: nft.nft.newPrice }),
            });

            if (response.ok) {
                nft.nft.price = nft.nft.newPrice;
            } else {
                const data = await response.json();
                console.error('Error listing:', data.message);
                alert(data.message);
            }
        } catch (error) {
            console.error('Error listing:', error);
        }
    };

    // Create a new component for the table row
    function SellerTableRow({ nft }) {
        const [disableList, setDisableList] = useState(true);

        return (
            <TableRow>
                <TableCell>{nft.asset.title}</TableCell>
                <TableCell>
                    <TextField
                        defaultValue={nft.nft.price}
                        type="number"
                        onChange={(event) => {
                            nft.nft.newPrice = parseInt(event.target.value, 10) || 0;
                            setDisableList(nft.nft.price === nft.nft.newPrice);
                        }}
                        inputProps={{ min: 0 }}
                        sx={{ width: '20ch', marginRight: 1 }}
                    />
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                            handleListClick(nft);
                            setDisableList(true);
                        }}
                        disabled={disableList}
                    >
                        List
                    </Button>
                </TableCell>
            </TableRow>
        );
    };

    const handleBuyClick = async (nft) => {
        try {
            const response = await fetch(`/api/asset/${nft.asset.xid}/buy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ price: nft.nft.newPrice }),
            });

            if (response.ok) {
                //setTab('token');
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

    function BuyerTableRow({ nft }) {
        return (
            <TableRow>
                <TableCell>{nft.asset.title}</TableCell>
                <TableCell>
                    <TextField
                        defaultValue={nft.nft.price}
                        type="number"
                        disabled={true}
                        sx={{ width: '20ch', marginRight: 1 }}
                    />
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                            handleBuyClick(nft);
                        }}
                        disabled={nft.nft.price < 1}
                    >
                        Buy
                    </Button>
                </TableCell>
            </TableRow>
        );
    };

    return (
        <TableContainer>
            <Table>
                <TableBody>
                    <TableRow>
                        <TableCell>Title:</TableCell>
                        <TableCell>{metadata.asset.title}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Editions:</TableCell>
                        <TableCell>{metadata.token.editions > 1 ? metadata.token.editions : "1 of 1"}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Sell:</TableCell>
                        <TableCell>
                            {ownedNfts.length > 0 &&
                                <TableContainer component={Paper} style={{ maxHeight: '300px', overflow: 'auto' }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Edition</TableCell>
                                                <TableCell>Price</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {ownedNfts.map((nft, index) => (
                                                <SellerTableRow key={index} nft={nft} />
                                            ))}
                                        </TableBody>

                                    </Table>
                                </TableContainer>
                            }                            
                            {ownedNfts.length < 1 && "None currently owned"}
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Buy:</TableCell>
                        <TableCell>
                            {listedNfts.length > 0 &&
                                <TableContainer component={Paper} style={{ maxHeight: '300px', overflow: 'auto' }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Edition</TableCell>
                                                <TableCell>Price</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {listedNfts.map((nft, index) => (
                                                <BuyerTableRow nft={nft} />
                                            ))}
                                        </TableBody>

                                    </Table>
                                </TableContainer>
                            }
                            {listedNfts.length < 1 && "None currently listed"}
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default TokenTrader;
