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

const NftView = ({ metadata }) => {

    const [collection, setCollection] = useState(0);
    const [nfts, setNfts] = useState([]);
    const [owned, setOwned] = useState(0);
    const [ranges, setRanges] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                let response = await fetch(`/api/profile/`);
                const myProfile = await response.json();

                response = await fetch(`/api/profile/${metadata.asset.owner}`);
                const profileData = await response.json();
                setCollection(profileData.collections[metadata.asset.collection || 0].name);

                const nfts = [];
                let owned = 0;
                const ownedEditions = [];

                for (const xid of metadata.nft.nfts) {
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
                        <TableRow>
                            <TableCell>Owned:</TableCell>
                            <TableCell>{owned}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Ranges:</TableCell>
                            <TableCell>{ranges}</TableCell>
                        </TableRow>
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
                                                        <img
                                                            src={nft.owner.pfp}
                                                            alt=""
                                                            style={{
                                                                width: '30px',
                                                                height: '30px',
                                                                objectFit: 'cover',
                                                                marginRight: '16px',
                                                                borderRadius: '50%',
                                                            }} /> {nft.owner.name}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );
};

export default NftView;
