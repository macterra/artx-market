import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
} from '@mui/material';

const MetadataView = ({ metadata }) => {

    const [creator, setCreator] = useState(0);
    const [collection, setCollection] = useState(0);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profResp = await fetch(`/api/profile/${metadata.asset.creator}`);
                const profileData = await profResp.json();
                setCreator(profileData.name);
                setCollection(profileData.collections[metadata.asset.collection || 0].name);
            } catch (error) {
                console.error('Error fetching asset creator:', error);
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
                        <TableCell>Creator:</TableCell>
                        <TableCell>
                            <Link to={`/profile/${metadata.asset.creator}`}>{creator}</Link>
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>File size:</TableCell>
                        <TableCell>{metadata.asset.fileSize} bytes</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Image size:</TableCell>
                        <TableCell>{metadata.image.width} x {metadata.image.height}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Image format:</TableCell>
                        <TableCell>{metadata.image.format}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Collection:</TableCell>
                        <TableCell>
                            <Link to={`/profile/${metadata.asset.creator}/${metadata.asset.collection || 0}`}>
                                {collection}
                            </Link>
                        </TableCell>
                    </TableRow>
                    {/* Add any other metadata you want to display */}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default MetadataView;
