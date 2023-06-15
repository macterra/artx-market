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
} from '@mui/material';

const NftMinter = ({ metadata }) => {
    const [owner, setOwner] = useState(null);
    const [collection, setCollection] = useState(null);
    const [editions, setEditions] = useState(1);
    const [storageFee, setStorageFee] = useState(null);
    const [collectionId, setCollectionId] = useState(null);
    const [fileSize, setFileSize] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profResp = await fetch(`/api/profile/${metadata.asset.owner}`);
                const profileData = await profResp.json();
                const fileSize = metadata.file.fileSize || 0;
                const collectionId = metadata.asset.collection || 0;

                setOwner(profileData.name);
                setCollection(profileData.collections[collectionId].name);
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
        //alert(`Mint ${editions} editions`);

        try {
            const payload = { xid: metadata.asset.xid, editions: editions };
            const response = await fetch('/api/mint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                console.log('Asset minted successfully');
                //setTab(0);
            } else {
                const data = await response.json();
                console.error('Error minting:', data.message);
                alert(data.message);
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
                                <Link to={`/profile/${metadata.asset.owner}/${collectionId}`}>
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
        </>
    );
};

export default NftMinter;
