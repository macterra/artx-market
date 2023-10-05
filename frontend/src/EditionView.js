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
                            <a href={`/asset/${metadata.nft.asset.xid}`}>{metadata.nft.asset.asset.title}</a>
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Edition:</TableCell>
                        <TableCell>{metadata.asset.title}</TableCell>
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
                        </TableCell>
                    </TableRow>
                    {nft.cert?.auth?.cid &&
                        <TableRow>
                            <TableCell>IPFS:</TableCell>
                            <TableCell>
                                <a href={`/ipfs/${nft.cert.auth.cid}/assets/${nft.xid}/meta.json`} target="_blank" rel="noopener noreferrer">
                                    {nft.cert.auth.cid}
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
