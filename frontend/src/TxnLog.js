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

const TxnLog = ({ profile }) => {
    const [txnlog, setTxnLog] = useState([]);

    useEffect(() => {
        const fetchHistory = async () => {
            setTxnLog(profile.txnlog);
        };

        fetchHistory();
    }, [profile]);

    if (!profile || !txnlog) {
        return;
    }

    function HistoryRow({ record }) {
        const [time, setTime] = useState("");
        const [message, setMessage] = useState("");
        const [credits, setCredits] = useState("");
        const [sats, setSats] = useState("");

        useEffect(() => {
            const fetchInfo = async () => {
                if (record.type === 'credits') {
                    setMessage(`Traded sats for credits.`);
                    setCredits(record.credits);
                    setSats(-record.credits);
                }

                if (record.type === 'mint') {
                    const response = await fetch(`/api/v1/asset/${record.xid}`);
                    const metadata = await response.json();

                    if (metadata.token.editions === 1) {
                        setMessage(`Minted a single edition of ${metadata.asset.title}.`);
                    }
                    else {
                        setMessage(`Minted ${metadata.token.editions} editions of ${metadata.asset.title}.`);
                    }

                    setCredits(-record.credits);
                }

                if (record.type === 'upload') {
                    const response = await fetch(`/api/v1/asset/${record.xid}`);
                    const metadata = await response.json();
                    const mb = (record.bytes / 1000000).toFixed(2);

                    if (record.files === 1) {
                        setMessage(`Uploaded 1 file (${mb} MB) to ${metadata.asset.title} collection.`);
                    }
                    else {
                        setMessage(`Uploaded ${record.files} files (${mb} MB) to ${metadata.asset.title} collection.`);
                    }

                    setCredits(-record.credits);
                }

                if (record.type === 'sell') {
                    const response1 = await fetch(`/api/v1/asset/${record.edition}`);
                    const edition = await response1.json();

                    const response2 = await fetch(`/api/v1/asset/${edition.nft.asset}`);
                    const token = await response2.json();

                    const response3 = await fetch(`/api/v1/profile/${record.buyer}`);
                    const buyer = await response3.json();

                    setMessage(`Sold "${token.asset.title} (${edition.asset.title})" to ${buyer.name}.`);

                    setSats(record.price);
                }

                if (record.type === 'buy') {
                    const response1 = await fetch(`/api/v1/asset/${record.edition}`);
                    const edition = await response1.json();

                    const response2 = await fetch(`/api/v1/asset/${edition.nft.asset}`);
                    const token = await response2.json();

                    const response3 = await fetch(`/api/v1/profile/${record.seller}`);
                    const seller = await response3.json();

                    setMessage(`Bought "${token.asset.title} (${edition.asset.title})" from ${seller.name}.`);

                    setSats(-record.price);
                }

                setTime(record.time);
            };

            fetchInfo();
        }, [record]);

        return (
            <TableRow>
                <TableCell>{time}</TableCell>
                <TableCell align="right">{sats}</TableCell>
                <TableCell align="right">{credits}</TableCell>
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
                        <TableCell>Credits</TableCell>
                        <TableCell>Event</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {txnlog.map((record, index) => (
                        <HistoryRow key={index} record={record} />
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default TxnLog;
