import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
  } from '@mui/material';

const ImageDetails = () => {
    const { hash } = useParams();
    const [image, setImage] = useState(null);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const response = await fetch(`/data/assets/${hash}/meta.json`);
                const metadata = await response.json();
                setImage(metadata);
            } catch (error) {
                console.error('Error fetching image metadata:', error);
            }
        };

        fetchMetadata();
    }, [hash]);

    if (!image) {
        return <p>Loading...</p>;
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ width: '50%', padding: '16px' }}>
                <img src={image.asset.path} alt={image.asset.filename} style={{ width: '100%', height: 'auto' }} />
            </div>

            <div style={{ width: '50%', padding: '16px' }}>
                <h2>Metadata:</h2>
                <TableContainer>
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell>Filename:</TableCell>
                                <TableCell>{image.asset.filename}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>File size:</TableCell>
                                <TableCell>{image.asset.fileSize} bytes</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Image size:</TableCell>
                                <TableCell>{image.image.width} x {image.image.height}</TableCell>
                            </TableRow>
                            {/* Add any other metadata you want to display */}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        </div>
    );
};

export default ImageDetails;