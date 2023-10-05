import React, { useEffect, useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
} from '@mui/material';
import AgentBadge from './AgentBadge';

const EditionView = ({ nft }) => {

    const [metadata, setMetadata] = useState(null);

    useEffect(() => {
        setMetadata(nft);
    }, [nft]);

    if (!metadata) {
        return;
    }

    return (
        <TableContainer>
            <Table>
                <TableBody>
                    <TableRow>
                        <TableCell>Token:</TableCell>
                        <TableCell>
                            <a href={`/asset/${metadata.token.xid}`}>{metadata.token.asset.title}</a>
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Edition:</TableCell>
                        <TableCell>{metadata.asset.title}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Collection:</TableCell>
                        <TableCell>
                            <a href={`/collection/${metadata.collection.xid}`}>{metadata.collection.title}</a>
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Owner:</TableCell>
                        <TableCell>
                            <AgentBadge agent={metadata.owner} />
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Creator:</TableCell>
                        <TableCell>
                            <AgentBadge agent={metadata.creator} />
                        </TableCell>
                    </TableRow>
                    {metadata.cert?.auth?.cid &&
                        <TableRow>
                            <TableCell>IPFS:</TableCell>
                            <TableCell>
                                <a href={`/ipfs/${metadata.cert.auth.cid}/assets/${metadata.xid}/meta.json`} target="_blank" rel="noopener noreferrer">
                                    {metadata.cert.auth.cid}
                                </a>
                            </TableCell>
                        </TableRow>
                    }
                    {metadata.cert?.xid &&
                        <TableRow>
                            <TableCell>Certificate:</TableCell>
                            <TableCell>
                                <a href={`/cert/${metadata.cert.xid}`}>
                                    {metadata.cert.xid}
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
