import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

import {
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    TextField,
} from '@mui/material';

const NftView = ({ navigate }) => {
    const { xid } = useParams();
    const [metadata, setMetadata] = useState(null);
    const [creator, setCreator] = useState(null);
    const [collection, setCollection] = useState(null);
    const [editions, setEditions] = useState(1);
    const [storageFee, setStorageFee] = useState(null);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const response = await fetch(`/api/asset/${xid}`);
                const metadata = await response.json();
                const profResp = await fetch(`/api/profile/${metadata.asset.creator}`);
                const profileData = await profResp.json();
                
                setMetadata(metadata);
                setCreator(profileData.name);
                setCollection(profileData.collections[metadata.asset.collection || 0].name);
                setStorageFee(Math.round(metadata.asset.fileSize/1000));
            } catch (error) {
                console.error('Error fetching image metadata:', error);
            }
        };

        fetchMetadata();
    }, [xid]);

    if (!metadata) {
        return <p>Loading...</p>;
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
        alert(`Mint ${editions} editions`);
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ width: '50%', padding: '16px' }}>
                <img src={metadata.asset.path} alt={metadata.asset.originalName} style={{ width: '100%', height: 'auto' }} />
            </div>
            <div style={{ width: '50%', padding: '16px' }}>
                <h2>NFT</h2>
                <TableContainer>
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell>Title:</TableCell>
                                <TableCell>{metadata.asset.title}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Creator:</TableCell>
                                <TableCell>
                                    <Link to={`/profile/${metadata.asset.creator}`}>{creator}</Link>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Collection:</TableCell>
                                <TableCell>
                                    <Link to={`/profile/${metadata.asset.creator}/${metadata.asset.collection || 0}`}>
                                        {collection}
                                    </Link>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Storage fee:</TableCell>
                                <TableCell>{storageFee} sats for {metadata.asset.fileSize} bytes</TableCell>
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
            </div>
        </div>
    );
};

export default NftView;
