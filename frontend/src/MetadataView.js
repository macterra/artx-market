import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
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
    lastXid = list[list.length - 1].asset.xid;

    return { firstXid, prevXid, nextXid, lastXid };
}

const MetadataView = ({ metadata }) => {

    const [owner, setOwner] = useState(0);
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
                const collectionId = metadata.asset.collection || 0;
                const collection = profileData.collections[collectionId];
                response = await fetch(`/api/collection/${ownerId}/${collectionId}`);
                const collectionData = await response.json();
                const { firstXid, prevXid, nextXid, lastXid } = findAdjacentXids(collectionData, metadata.asset.xid);

                setOwner(profileData.name);
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
                            <Link to={`/profile/${metadata.asset.owner}`}>{owner}</Link>
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>First:</TableCell>
                        <TableCell>{firstXid}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Prev:</TableCell>
                        <TableCell>{prevXid}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Next:</TableCell>
                        <TableCell>{nextXid}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Last:</TableCell>
                        <TableCell>{lastXid}</TableCell>
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
                            <Link to={`/profile/${metadata.asset.owner}/${collectionId}`}>
                                {collectionName}
                            </Link>
                        </TableCell>
                    </TableRow>
                    {/* Add any other metadata you want to display */}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default MetadataView;
