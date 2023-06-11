import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

import {
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
} from '@mui/material';

const NftView = ({ navigate }) => {
    const { xid } = useParams();
    const [metadata, setMetadata] = useState(null);
    const [creator, setCreator] = useState(null);
    const [collection, setCollection] = useState(null);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const response = await fetch(`/api/asset/${xid}`);
                const metadata = await response.json();
                setMetadata(metadata);

                const profResp = await fetch(`/api/profile/${metadata.asset.creator}`);
                const profileData = await profResp.json();
                setCreator(profileData.name);
                setCollection(profileData.collections[metadata.asset.collection || 0].name);
            } catch (error) {
                console.error('Error fetching image metadata:', error);
            }
        };

        fetchMetadata();
    }, [xid]);

    if (!metadata) {
        return <p>Loading...</p>;
    }

    const handleEditClick = async () => {
        navigate(`/image/edit/${metadata.asset.xid}`)
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
                                    <Link to={`/profile/${metadata.asset.creator}/${metadata.asset.collection||0}`}>
                                        {collection}
                                    </Link>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
                <Button variant="contained" color="primary" onClick={handleEditClick}>
                    Mint
                </Button>
            </div>
        </div>
    );
};

export default NftView;
