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

const EditionView = ({ metadata, edition }) => {

    const [nft, setNft] = useState(null);

    useEffect(() => {
        const fetchNft = async () => {
            try {
                let response = await fetch(`/api/v1/profile/`);
                const myProfile = await response.json();

                const xid = metadata.token.nfts[edition - 1];

                response = await fetch(`/api/v1/asset/${xid}`);
                const nft = await response.json();

                response = await fetch(`/api/v1/profile/${nft.asset.owner}`);
                nft.owner = await response.json();
                nft.owned = (nft.asset.owner === myProfile.xid);

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
                </TableBody>
            </Table>
        </TableContainer >
    );
};

export default EditionView;
