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

const TokenHistory = ({ metadata }) => {
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                console.log(`history records ${metadata.history.length}`);
                console.log(metadata);

                setHistory(metadata.history);

                for (const rec of metadata.history) {
                    console.log(rec);
                }
            } catch (error) {
                console.error('Error fetching asset owner:', error);
            }
        };

        fetchHistory();
    }, [metadata]);

    if (!metadata || !history) {
        return;
    }

    function HistoryRow({ record }) {
        const [time, setTime] = useState("");
        const [message, setMessage] = useState("")

        useEffect(() => {
            const fetchInfo = async () => {
                if (record.type === 'mint') {
                    const response = await fetch(`/api/v1/profile/${record.creator}`);
                    const creator = await response.json();

                    if (metadata.token.editions == 1) {
                        setMessage(`${creator.name} minted a single edition.`);
                    }
                    else {
                        setMessage(`${creator.name} minted ${metadata.token.editions} editions.`);
                    }
                }

                if (record.type === 'list') {
                    const response1 = await fetch(`/api/v1/profile/${record.seller}`);
                    const seller = await response1.json();

                    const response2 = await fetch(`/api/v1/asset/${record.edition}`);
                    const edition = await response2.json();

                    if (record.price == 0) {
                        setMessage(`${seller.name} delisted edition ${edition.asset.title}.`);
                    }
                    else {
                        setMessage(`${seller.name} listed edition ${edition.asset.title} for ${record.price} sats.`);
                    }
                }

                if (record.type === 'sale') {
                    const response1 = await fetch(`/api/v1/profile/${record.seller}`);
                    const seller = await response1.json();

                    const response2 = await fetch(`/api/v1/profile/${record.buyer}`);
                    const buyer = await response2.json();

                    const response3 = await fetch(`/api/v1/asset/${record.edition}`);
                    const edition = await response3.json();

                    setMessage(`${seller.name} sold edition ${edition.asset.title} to ${buyer.name} for ${record.price} sats.`);
                }

                setTime(record.time);
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
