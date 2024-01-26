import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Button,
} from '@mui/material';

import utils from './utils';
import AgentBadge from './AgentBadge';

function findAdjacentXids(list, targetXid) {
    let prevXid = null;
    let nextXid = null;
    let firstXid = null;
    let lastXid = null;

    for (let i = 0; i < list.length; i++) {
        if (list[i].xid === targetXid) {
            if (i > 0) {
                prevXid = list[i - 1].xid;
            }
            if (i < list.length - 1) {
                nextXid = list[i + 1].xid;
            }
            break;
        }
    }

    firstXid = list[0].xid;

    if (firstXid === targetXid) {
        firstXid = null;
    }

    lastXid = list[list.length - 1].xid;

    if (lastXid === targetXid) {
        lastXid = null;
    }

    return { firstXid, prevXid, nextXid, lastXid };
}

const MetadataView = ({ navigate, metadata }) => {

    const [profile, setProfile] = useState(0);
    const [collectionId, setCollectionId] = useState(0);
    const [collectionName, setCollectionName] = useState(0);
    const [firstXid, setFirstXid] = useState(null);
    const [prevXid, setPrevXid] = useState(null);
    const [nextXid, setNextXid] = useState(null);
    const [lastXid, setLastXid] = useState(null);
    const [isDeleted, setIsDeleted] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                if (metadata.asset.collection === 'deleted') {
                    setIsDeleted(true);
                }
                else {
                    const getProfile = await axios.get(`/api/v1/profile/${metadata.asset.owner}`);
                    const profile = getProfile.data;
                    setProfile(profile);

                    const getCollection = await axios.get(`/api/v1/collections/${metadata.asset.collection}`);
                    const collectionData = getCollection.data;
                    const { firstXid, prevXid, nextXid, lastXid } = findAdjacentXids(collectionData.collection.assets, metadata.xid);

                    setCollectionId(collectionData.xid);
                    setCollectionName(utils.truncateTitle(collectionData.asset.title, 20));
                    setFirstXid(firstXid);
                    setPrevXid(prevXid);
                    setNextXid(nextXid);
                    setLastXid(lastXid);
                }
            } catch (error) {
                console.error('Error fetching metadata:', error);
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
                        <TableCell>
                            <span>{metadata.asset.title}</span>
                            {profile?.deposit &&
                                <a href={`lightning:${profile.deposit}`} style={{ margin: '8px', textDecoration: 'none' }} title={`zap ${profile.name} some sats!`}>⚡</a>
                            }
                        </TableCell>
                    </TableRow>
                    {!isDeleted &&
                        <TableRow>
                            <TableCell>Collection:</TableCell>
                            <TableCell>
                                <div style={{ display: 'inline-block' }}>
                                    <Button
                                        color="inherit"
                                        disabled={!firstXid}
                                        onClick={() => navigate(`/asset/${firstXid}`)}>
                                        {'<<'}
                                    </Button>
                                    <Button
                                        color="inherit"
                                        disabled={!prevXid}
                                        onClick={() => navigate(`/asset/${prevXid}`)}>
                                        {'<'}
                                    </Button>
                                </div>
                                <Button
                                    color="inherit"
                                    disabled={!collectionName}
                                    onClick={() => navigate(`/collection/${collectionId}`)}>
                                    {collectionName}
                                </Button>
                                <div style={{ display: 'inline-block' }}>
                                    <Button
                                        color="inherit"
                                        disabled={!nextXid}
                                        onClick={() => navigate(`/asset/${nextXid}`)}>
                                        {'>'}
                                    </Button>
                                    <Button
                                        color="inherit"
                                        disabled={!lastXid}
                                        onClick={() => navigate(`/asset/${lastXid}`)}>
                                        {'>>'}
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    }
                    <TableRow>
                        <TableCell>Creator:</TableCell>
                        <TableCell>
                            <AgentBadge xid={metadata.asset.owner} />
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Created:</TableCell>
                        <TableCell>{metadata.asset.created}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Updated:</TableCell>
                        <TableCell>{metadata.asset.updated}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>File size:</TableCell>
                        <TableCell>{metadata.file.size} bytes</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Image size:</TableCell>
                        <TableCell>{metadata.image.width} x {metadata.image.height}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Image format:</TableCell>
                        <TableCell>{metadata.image.format}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default MetadataView;
