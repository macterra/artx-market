import React, { useEffect, useState } from 'react';
import {
    TableCell,
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

const CollectionNavigator = ({ navigate, metadata }) => {

    const [ownerId, setOwnerId] = useState(0);
    const [collectionId, setCollectionId] = useState(0);
    const [collectionName, setCollectionName] = useState(0);
    const [firstXid, setFirstXid] = useState(null);
    const [prevXid, setPrevXid] = useState(null);
    const [nextXid, setNextXid] = useState(null);
    const [lastXid, setLastXid] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const ownerId = metadata.asset.owner;
                let response = await fetch(`/api/profile/${ownerId}`);
                const profileData = await response.json();
                const collectionId = metadata.asset.collection || 0;
                const collection = profileData.collections[collectionId];
                response = await fetch(`/api/collection/${ownerId}/${collectionId}`);
                const collectionData = await response.json();
                const { firstXid, prevXid, nextXid, lastXid } = findAdjacentXids(collectionData, metadata.asset.xid);

                setOwnerId(ownerId);
                setCollectionId(collectionId);
                setCollectionName(collection.name);
                setFirstXid(firstXid);
                setPrevXid(prevXid);
                setNextXid(nextXid);
                setLastXid(lastXid);
            } catch (error) {
                console.error('Error fetching metadata:', error);
            }
        };

        fetchData();
    }, [metadata]);

    if (!metadata) {
        return;
    }

    return (
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
                    onClick={() => navigate(`/profile/${ownerId}/${collectionId}`)}>
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
    );
};

export default CollectionNavigator;
