import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
} from '@mui/material';

const ImageDetails = () => {
    const { hash } = useParams();
    const [metadata, setMetadata] = useState(null);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const response = await fetch(`/data/assets/${hash}/meta.json`);
                const metadata = await response.json();
                setMetadata(metadata);
            } catch (error) {
                console.error('Error fetching image metadata:', error);
            }
        };

        fetchMetadata();
    }, [hash]);

    if (!metadata) {
        return <p>Loading...</p>;
    }

    const handleSetPfpClick = async () => {
        try {
            const response = await fetch('/profile/pfp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ pfp: metadata.asset.path }),
            });

            if (response.ok) {
                console.log('Profile picture updated successfully');
            } else {
                const data = await response.json();
                console.error('Error updating profile picture:', data.message);
            }
        } catch (error) {
            console.error('Error updating profile picture:', error);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ width: '50%', padding: '16px' }}>
                <img src={metadata.asset.path} alt={metadata.asset.originalName} style={{ width: '100%', height: 'auto' }} />
            </div>
            <div style={{ width: '50%', padding: '16px' }}>
                <h2>Metadata:</h2>
                <TableContainer>
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell>Title:</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Description:</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Tags:</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Creator:</TableCell>
                                <TableCell>{metadata.asset.creator}</TableCell>
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
                            {/* Add any other metadata you want to display */}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Button variant="contained" color="primary" onClick={handleSetPfpClick}>
                    Set as Profile Picture
                </Button>
            </div>
        </div>
    );
};

export default ImageDetails;