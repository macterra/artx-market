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

const TokenTrader = ({ metadata }) => {
    const [ownedNfts, setOwnedNfts] = useState(0);
    const [unownedNfts, setUnownedNfts] = useState(0);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                let response = await fetch(`/api/profile/`);
                const myProfile = await response.json();

                const ownedNfts = [];
                const unownedNfts = [];

                for (const xid of metadata.token.nfts) {
                    response = await fetch(`/api/asset/${xid}`);
                    const nft = await response.json();
                    response = await fetch(`/api/profile/${nft.asset.owner}`);
                    nft.owner = await response.json();

                    if (nft.asset.owner === myProfile.id) {
                        ownedNfts.push(nft);
                    }
                    else {
                        unownedNfts.push(nft);
                    }
                }

                setOwnedNfts(ownedNfts);
                setUnownedNfts(unownedNfts);
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
    function NftTableRow({ nft, handleListClick }) {
        const [newPrice, setNewPrice] = useState(nft.nft.price);

        return (
            <TableRow>
                <TableCell>{nft.asset.title}</TableCell>
                <TableCell>
                    <TextField
                        defaultValue={nft.nft.price}
                        type="number"
                        onChange={(event) => {
                            nft.nft.newPrice = parseInt(event.target.value,10);
                            setNewPrice(nft.nft.newPrice);
                        }}
                        inputProps={{ min: 0 }}
                        sx={{ width: '20ch', marginRight: 1 }}
                    />
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={ async () => { 
                            await handleListClick(nft);
                            setNewPrice(nft.nft.price);
                         }}
                        disabled={nft.nft.price === newPrice}
                    >
                        List
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
                    {ownedNfts.length > 0 &&
                        <TableRow>
                            <TableCell>Listings:</TableCell>
                            <TableCell>
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
                                                <NftTableRow key={index} nft={nft} handleListClick={handleListClick} />
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </TableCell>
                        </TableRow>
                    }
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default TokenTrader;
