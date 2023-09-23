import React, { useEffect, useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
} from '@mui/material';

const EditionView = ({ metadata, edition }) => {

    const [nft, setNft] = useState(null);

    useEffect(() => {
        const fetchNft = async () => {
            try {
                const xid = metadata.token.nfts[edition - 1];
                const response = await fetch(`/api/v1/nft/${xid}`);
                const nft = await response.json();
                setNft(nft);
            } catch (error) {
                console.error('Error fetching NFT:', error);
            }
        };

        fetchNft();
    }, [metadata, edition]);

    if (!metadata || !nft) {
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
                        <TableCell>Edition:</TableCell>
                        <TableCell>{nft.asset.title}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Owner:</TableCell>
                        <TableCell>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                {nft.owner.pfp &&
                                    <img
                                        src={nft.owner.pfp}
                                        alt=""
                                        style={{
                                            width: '30px',
                                            height: '30px',
                                            objectFit: 'cover',
                                            marginRight: '16px',
                                            borderRadius: '50%',
                                        }}
                                    />} {nft.owner.name}
                            </div>
                        </TableCell>
                    </TableRow>
                    {nft.cert?.cid &&
                        <TableRow>
                            <TableCell>IPFS:</TableCell>
                            <TableCell>
                                <a href={`/ipfs/${nft.cert.cid}/assets/${nft.xid}/meta.json`} target="_blank" rel="noopener noreferrer">
                                    {nft.cert.cid}
                                </a>
                            </TableCell>
                        </TableRow>
                    }
                    {nft.cert?.xid &&
                        <TableRow>
                            <TableCell>Certificate:</TableCell>
                            <TableCell>
                                <a href={`/cert/${nft.cert.xid}`}>
                                    {nft.cert.xid}
                                </a>
                            </TableCell>
                        </TableRow>
                    }
                </TableBody>
            </Table>
        </TableContainer >
    );
};

export default EditionView;
