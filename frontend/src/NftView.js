import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
} from '@mui/material';

const NftView = ({ metadata }) => {

    const [owner, setOwner] = useState(0);
    const [collection, setCollection] = useState(0);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profResp = await fetch(`/api/profile/${metadata.asset.owner}`);
                const profileData = await profResp.json();
                setOwner(profileData.name);
                setCollection(profileData.collections[metadata.asset.collection || 0].name);
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
    );
};

export default NftView;
