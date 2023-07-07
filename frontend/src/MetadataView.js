import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Button,
} from '@mui/material';

function findAdjacentXids(list, targetXid) {
    let prevXid = null;
    let nextXid = null;
    let firstXid = null;
    let lastXid = null;

    for (let i = 0; i < list.length; i++) {
        if (list[i].asset.xid === targetXid) {
            if (i > 0) {
                prevXid = list[i - 1].asset.xid;
            }
            if (i < list.length - 1) {
                nextXid = list[i + 1].asset.xid;
            }
            break;
        }
    }

    firstXid = list[0].asset.xid;

    if (firstXid === targetXid) {
        firstXid = null;
    }

    lastXid = list[list.length - 1].asset.xid;

    if (lastXid === targetXid) {
        lastXid = null;
    }

    return { firstXid, prevXid, nextXid, lastXid };
}

const MetadataView = ({ navigate, metadata }) => {

    const [ownerId, setOwnerId] = useState(0);
    const [ownerName, setOwnerName] = useState(0);
    const [collectionId, setCollectionId] = useState(0);
    const [collectionName, setCollectionName] = useState(0);
    const [firstXid, setFirstXid] = useState(null);
    const [prevXid, setPrevXid] = useState(null);
    const [nextXid, setNextXid] = useState(null);
    const [lastXid, setLastXid] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const ownerId = metadata.asset.owner;
                let response = await fetch(`/api/profile/${ownerId}`);
                const profileData = await response.json();
                response = await fetch(`/api/collections/${metadata.asset.collection}`);
                const collectionData = await response.json();
                const { firstXid, prevXid, nextXid, lastXid } = findAdjacentXids(collectionData.collection.assets, metadata.asset.xid);

                setOwnerId(profileData.xid);
                setOwnerName(profileData.name);
                setCollectionId(collectionData.asset.xid);
                setCollectionName(collectionData.asset.title);
                setFirstXid(firstXid);
                setPrevXid(prevXid);
                setNextXid(nextXid);
                setLastXid(lastXid);
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
                        <TableCell>{metadata.asset.title}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Owner:</TableCell>
                        <TableCell>
                            <Link to={`/profile/${ownerId}`}>{ownerName}</Link>
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
                    <TableRow>
                        <TableCell>Collection:</TableCell>
                        <TableCell>
                            <Button
                                color="inherit"
                                disabled={!firstXid}
                                onClick={() => navigate(`/asset/${firstXid}`)}>
                                {'\u003C\u003C'}
                            </Button>
                            <Button
                                color="inherit"
                                disabled={!prevXid}
                                onClick={() => navigate(`/asset/${prevXid}`)}>
                                {'\u003C'}
                            </Button>
                            <Button
                                color="inherit"
                                disabled={!collectionName}
                                onClick={() => navigate(`/collection/${collectionId}`)}>
                                {collectionName}
                            </Button>
                            <Button
                                color="inherit"
                                disabled={!nextXid}
                                onClick={() => navigate(`/asset/${nextXid}`)}>
                                {'\u003E'}
                            </Button>
                            <Button
                                color="inherit"
                                disabled={!lastXid}
                                onClick={() => navigate(`/asset/${lastXid}`)}>
                                {'\u003E\u003E'}
                            </Button>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default MetadataView;
