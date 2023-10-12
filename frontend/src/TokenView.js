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
    Button,
} from '@mui/material';
import AgentBadge from './AgentBadge';

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

const TokenView = ({ metadata, setTab, setRefreshKey }) => {

    const [collection, setCollection] = useState(0);
    const [nfts, setNfts] = useState([]);
    const [owned, setOwned] = useState(0);
    const [ownAll, setOwnAll] = useState(0);
    const [ranges, setRanges] = useState(null);
    const [licenseUrl, setLicenseUrl] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                let response = await fetch(`/api/v1/profile/`);
                const myProfile = await response.json();

                response = await fetch(`/api/v1/collections/${metadata.asset.collection}`);
                const collectionData = await response.json();
                setCollection(collectionData.asset.title);

                response = await fetch('/api/v1/licenses');
                const licenses = await response.json();
                setLicenseUrl(licenses[metadata.token.license]);

                const nfts = [];
                let owned = 0;
                const ownedEditions = [];

                for (const xid of metadata.token.nfts) {
                    response = await fetch(`/api/v1/asset/${xid}`);
                    const nft = await response.json();
                    response = await fetch(`/api/v1/profile/${nft.asset.owner}`);
                    nft.owner = await response.json();
                    nfts.push(nft);

                    if (nft.asset.owner === myProfile.xid) {
                        owned += 1;
                        ownedEditions.push(nft.nft.edition);
                    }
                }

                setNfts(nfts);
                setOwned(owned);
                setOwnAll(metadata.userIsOwner && owned == metadata.token.editions);
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

    const handleUnmint = async (event) => {
        try {
            let response = await fetch(`/api/v1/asset/${metadata.xid}/unmint`);

            if (response.ok) {
                const unmint = await response.json();
                alert(`${unmint.refund} credits refunded`);
                setTab("meta");
                setRefreshKey((prevKey) => prevKey + 1);
            }
        }
        catch (error) {
            console.error('Error fetching asset owner:', error);
        }
    };

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
                    <TableRow>
                        <TableCell>IPFS:</TableCell>
                        <TableCell>
                            <a href={`/ipfs/${metadata.token.cid}/${metadata.file.fileName}`} target="_blank" rel="noopener noreferrer">
                                {metadata.token.cid}
                            </a>
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>License:</TableCell>
                        <TableCell>
                            <Link to={`${licenseUrl}`}>
                                {metadata.token.license}
                            </Link>
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Creator:</TableCell>
                        <TableCell>
                                <AgentBadge xid={metadata.asset.owner} />
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Royalty:</TableCell>
                        <TableCell>
                            {metadata.token.royalty * 100}%
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Editions:</TableCell>
                        {nfts && nfts.length === 1 ? (
                            <TableCell>
                                <a href={`/nft/${nfts[0].xid}`}>1 of 1</a>
                                {ownAll &&
                                    <Button variant="contained" color="primary" onClick={handleUnmint} style={{ marginLeft: '10px' }}>
                                        Unmint
                                    </Button>
                                }
                            </TableCell>
                        ) : (
                            <TableCell>{metadata.token.editions}</TableCell>
                        )}
                    </TableRow>
                    {metadata.token.editions > 1 && owned > 0 &&
                        <TableRow>
                            <TableCell>Owned:</TableCell>
                            <TableCell>
                                {ownAll ?
                                    <React.Fragment>
                                        all
                                        <Button variant="contained" color="primary" onClick={handleUnmint} style={{ marginLeft: '10px' }}>
                                            Unmint
                                        </Button>
                                    </React.Fragment>
                                    :
                                    `${owned} editions (${ranges})`
                                }
                            </TableCell>
                        </TableRow>
                    }
                    {nfts && nfts.length === 1 &&
                        <TableRow>
                            <TableCell>Owner:</TableCell>
                            <TableCell>
                                <AgentBadge agent={nfts[0].owner} />
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
                                                    <TableCell>
                                                        <a href={`/nft/${nft.xid}`}>{nft.asset.title}</a>
                                                    </TableCell>
                                                    <TableCell>
                                                        <AgentBadge agent={nft.owner} />
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
        </TableContainer >
    );
};

export default TokenView;
