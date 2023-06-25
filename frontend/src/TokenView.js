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

function convertToRanges(arr) {
    let result = '';
    let rangeStart;

    for (let i = 0; i < arr.length; i++) {
        if (i === 0 || arr[i] !== arr[i - 1] + 1) {
            if (rangeStart) {
                result += rangeStart === arr[i - 1] ? `,${rangeStart}` : `-${arr[i - 1]}`;
            }
            rangeStart = arr[i];
            result += `,${rangeStart}`;
        } else if (i === arr.length - 1 && rangeStart !== arr[i]) {
            result += `-${arr[i]}`;
        }
    }

    return result.substring(1); // Remove the leading comma
}

const TokenView = ({ metadata }) => {

    const [collection, setCollection] = useState(0);
    const [nfts, setNfts] = useState([]);
    const [owned, setOwned] = useState(0);
    const [ranges, setRanges] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                let response = await fetch(`/api/profile/`);
                const myProfile = await response.json();

                response = await fetch(`/api/collections/${metadata.asset.collection}`);
                const collectionData = await response.json();
                setCollection(collectionData.asset.title);

                const nfts = [];
                let owned = 0;
                const ownedEditions = [];

                for (const xid of metadata.token.nfts) {
                    response = await fetch(`/api/asset/${xid}`);
                    const nft = await response.json();
                    response = await fetch(`/api/profile/${nft.asset.owner}`);
                    nft.owner = await response.json();
                    nfts.push(nft);

                    if (nft.asset.owner === myProfile.id) {
                        owned += 1;
                        ownedEditions.push(nft.nft.edition);
                    }
                }

                console.log(nfts);
                setNfts(nfts);
                setOwned(owned);
                setRanges(convertToRanges(ownedEditions));

            } catch (error) {
                console.error('Error fetching asset owner:', error);
            }
        };

        fetchProfile();
    }, [metadata]);

    if (!metadata || !metadata.token) {
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
                            <Link to={`/collection/${metadata.asset.collection}`}>
                                {collection}
                            </Link>
                        </TableCell>
                    </TableRow>
                    {metadata.token.editions > 1 &&
                        <TableRow>
                            <TableCell>Editions:</TableCell>
                            <TableCell>{metadata.token.editions}</TableCell>
                        </TableRow>
                    }
                    {metadata.token.editions > 1 && owned > 0 &&
                        <TableRow>
                            <TableCell>Owned:</TableCell>
                            <TableCell>{owned} ({ranges})</TableCell>
                        </TableRow>
                    }
                    {nfts && nfts.length === 1 &&
                        <TableRow>
                            <TableCell>Owner:</TableCell>
                            <TableCell>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    {nfts[0].owner.pfp &&
                                        <img
                                            src={nfts[0].owner.pfp}
                                            alt=""
                                            style={{
                                                width: '30px',
                                                height: '30px',
                                                objectFit: 'cover',
                                                marginRight: '16px',
                                                borderRadius: '50%',
                                            }}
                                        />}
                                    {nfts[0].owner.name}
                                </div>
                            </TableCell>
                        </TableRow>
                    }
                    {metadata.token.editions > 1 &&
                        <TableRow>
                            <TableCell>Owners:</TableCell>
                            <TableCell>
                                <TableContainer component={Paper} style={{ maxHeight: '300px', overflow: 'auto' }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Edition</TableCell>
                                                <TableCell>Owner</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {nfts.map((nft, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{nft.asset.title}</TableCell>
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
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </TableCell>
                        </TableRow>
                    }
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default TokenView;
