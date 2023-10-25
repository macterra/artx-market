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

const AuditLog = () => {
    const [txnlog, setTxnLog] = useState([]);

    useEffect(() => {
        const fetchLog = async () => {
            const response = await fetch(`/api/v1/admin/auditlog`);

            if (response.ok) {
                const txnlog = await response.json();
                setTxnLog(txnlog);
            }
        };

        fetchLog();
    }, []);

    if (!txnlog) {
        return;
    }

    function AuditRow({ record }) {
        const [time, setTime] = useState("");
        const [message, setMessage] = useState("");
        const [sats, setSats] = useState("");

        useEffect(() => {
            const fetchInfo = async () => {
                setMessage(`unknown type: ${record.type}`);
                setTime(record.time);

                if (record.type === 'sale') {
                    const amount = record.invoice?.amount || record.charge?.amount;
                    const payout = record.payout?.amount || 0;
                    const royalty = record.royalty?.amount || 0;
                    const txnfee = amount - payout - royalty;

                    if (record.agent && record.asset) {
                        setMessage(
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <a href={`/profile/${record.agent}`}>{record.agentName}</a>
                                &nbsp;bought&nbsp;
                                <a href={`/nft/${record.asset}`}>{record.assetName}</a>
                                &nbsp;for:&nbsp;{`${amount} - ${payout} (payout) - ${royalty} (royalty)`}
                            </div>
                        );
                    }
                    else {
                        setMessage(`sale: ${amount} - ${payout} (payout) - ${royalty} (royalty)`);
                    }

                    setSats(txnfee);
                }

                if (record.type === 'credits') {
                    setMessage(
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <a href={`/profile/${record.agent}`}>{record.agentName}</a>
                            &nbsp;bought&nbsp;{`${record.amount} credits`}
                        </div>
                    );

                    setSats(record.amount);
                }
            };

            fetchInfo();
        }, [record]);

        return (
            <TableRow>
                <TableCell>{time}</TableCell>
                <TableCell align="right">{sats}</TableCell>
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
                        <TableCell>Sats</TableCell>
                        <TableCell>Event</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {txnlog.map((record, index) => (
                        <AuditRow key={index} record={record} />
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default AuditLog;
