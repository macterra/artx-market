import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    TableHead,
    Paper,
} from '@mui/material';

const NftView = ({ metadata }) => {

    const [collection, setCollection] = useState(0);
    const [nfts, setNfts] = useState([]);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profResp = await fetch(`/api/profile/${metadata.asset.owner}`);
                const profileData = await profResp.json();
                setCollection(profileData.collections[metadata.asset.collection || 0].name);

                const nfts = [];

                for (const xid of metadata.nft.nfts) {
                    const response = await fetch(`/api/asset/${xid}`);
                    const nft = await response.json();
                    const response2 = await fetch(`/api/profile/${nft.asset.owner}`);
                    nft.owner = await response2.json();
                    nfts.push(nft);
                }

                console.log(nfts);
                setNfts(nfts);

            } catch (error) {
                console.error('Error fetching asset owner:', error);
            }
        };

        fetchProfile();
    }, [metadata]);

    if (!metadata) {
        return;
    }

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
                            <TableCell>Collection:</TableCell>
                            <TableCell>
                                <Link to={`/profile/${metadata.asset.owner}/${metadata.asset.collection || 0}`}>
                                    {collection}
                                </Link>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Editions:</TableCell>
                            <TableCell>{metadata.nft.editions}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
            <h2>owners</h2>
            <TableContainer component={Paper} style={{ maxHeight: '300px', overflow: 'auto' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Edition</TableCell>
                            <TableCell>Owner</TableCell>
                            <TableCell>Price</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {nfts.map((nft, index) => (
                            <TableRow key={index}>
                                <TableCell>{nft.asset.title}</TableCell>
                                <TableCell>{nft.owner.name}</TableCell>
                                <TableCell>?</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );
};

export default NftView;
