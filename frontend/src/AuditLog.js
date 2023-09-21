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
                if (record.type === 'sale') {
                    const amount = record.charge.amount;
                    const payout = record.payout?.amount || 0;
                    const royalty = record.royalty?.amount || 0;
                    const txnfee = amount - payout - royalty;

                    setMessage(`sale: ${amount} - ${payout} (payout) - ${royalty} (royalty)`);
                    setSats(txnfee);
                }

                if (record.type === 'buy-credits') {
                    setMessage('buy-credits');
                    setSats(record.charge.amount);
                }

                setTime(record.time);
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
