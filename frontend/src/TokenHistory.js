import React, { useEffect, useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    TableHead,
    Paper,
} from '@mui/material';
import AgentBadge from './AgentBadge';

const TokenHistory = ({ metadata }) => {
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const fetchHistory = async () => {
            setHistory(metadata.history);
        };

        fetchHistory();
    }, [metadata]);

    if (!metadata || !history) {
        return;
    }

    function HistoryRow({ record }) {
        const [time, setTime] = useState("");
        const [message, setMessage] = useState(null)

        useEffect(() => {
            const fetchInfo = async () => {
                setMessage(`unknown record type ${record.type}`);
                setTime(record.time);

                if (record.type === 'mint') {
                    if (metadata.token.editions === 1) {
                        setMessage(
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <AgentBadge xid={record.creator} />{"minted a single edition."}
                            </div>
                        );
                    }
                    else {
                        setMessage(
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <AgentBadge xid={record.creator} />{`minted ${metadata.token.editions} editions.`}
                            </div>
                        );
                    }
                }

                if (record.type === 'unmint') {
                    setMessage(
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <AgentBadge xid={record.creator} />{"unminted the token."}
                        </div>
                    );
                }

                if (record.type === 'list') {
                    const response = await fetch(`/api/v1/asset/${record.edition}`);
                    const edition = await response.json();

                    if (record.price === 0) {
                        setMessage(
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <AgentBadge xid={record.seller} />{`delisted edition ${edition.asset.title}.`}
                            </div>
                        );
                    }
                    else {
                        setMessage(
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <AgentBadge xid={record.seller} />{`listed edition ${edition.asset.title} for ${record.price} sats.`}
                            </div>
                        );
                    }
                }

                if (record.type === 'sale') {
                    const response = await fetch(`/api/v1/asset/${record.edition}`);
                    const edition = await response.json();

                    setMessage(
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <AgentBadge xid={record.seller} />{`sold edition ${edition.asset.title} to `}<AgentBadge xid={record.buyer} />{`for ${record.price} sats.`}
                        </div>
                    );
                }
            };

            fetchInfo();
        }, [record]);

        return (
            <TableRow>
                <TableCell>{time}</TableCell>
                <TableCell>{message}</TableCell>
            </TableRow>
        );
    };

    return (
        <TableContainer component={Paper} style={{ maxHeight: '600px', overflow: 'auto' }}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Time</TableCell>
                        <TableCell>Event</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {history.map((record, index) => (
                        <HistoryRow key={index} record={record} />
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default TokenHistory;
