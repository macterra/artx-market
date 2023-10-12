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

const TxnLog = ({ profile, refreshProfile }) => {
    const [txnlog, setTxnLog] = useState([]);

    useEffect(() => {
        const fetchHistory = async () => {
            setTxnLog(profile.txnlog);
        };

        fetchHistory();
    }, [profile, refreshProfile]);

    if (!profile || !txnlog) {
        return;
    }

    function assetLink(metadata) {
        const title = metadata.asset.title;

        if (title.length > 20) {
            return <a href={`/asset/${metadata.xid}`}>{title.substring(0, 20)}...</a>;
        }
        else {
            return <a href={`/asset/${metadata.xid}`}>{title}</a>;
        }
    }

    function collectionLink(metadata) {
        const title = metadata.asset.title;

        if (title.length > 20) {
            return <a href={`/collection/${metadata.xid}`}>{title.substring(0, 20)}...</a>;
        }
        else {
            return <a href={`/collection/${metadata.xid}`}>{title}</a>;
        }
    }

    function nftLink(metadata) {
        return <a href={`/nft/${metadata.xid}`}>{metadata.asset.title}</a>;
    }

    function profileLink(agent) {
        const name = agent.name.substring(0, 20);

        if (name.length > 20) {
            return <a href={`/profile/${agent.xid}`}>{name.substring(0, 20)}...</a>;
        }
        else {
            return <a href={`/profile/${agent.xid}`}>{name}</a>;
        }
    }

    function HistoryRow({ record }) {
        const [time, setTime] = useState("");
        const [message, setMessage] = useState(null);
        const [credits, setCredits] = useState("");
        const [sats, setSats] = useState("");

        useEffect(() => {
            const fetchInfo = async () => {
                setMessage(`Unknown record type ${record.type}`);
                setTime(record.time);

                if (record.type === 'credits') {
                    setMessage(`Traded sats for credits.`);
                    setCredits(record.credits);
                    setSats(-record.credits);
                }

                if (record.type === 'mint') {
                    const response = await fetch(`/api/v1/asset/${record.xid}`);
                    const metadata = await response.json();

                    if (metadata.token) {
                        if (metadata.token.editions === 1) {
                            setMessage(<div>Minted a single edition of {assetLink(metadata)}.</div>);
                        }
                        else {
                            setMessage(<div>Minted {metadata.token.editions} editions of {assetLink(metadata)}.</div>);
                        }
                    }
                    else {
                        setMessage(<div>Minted {assetLink(metadata)}.</div>);
                    }

                    setCredits(-record.credits);
                }

                if (record.type === 'unmint') {
                    const response = await fetch(`/api/v1/asset/${record.xid}`);
                    const metadata = await response.json();

                    setMessage(<div>Unminted {assetLink(metadata)}.</div>);
                    setCredits(record.credits);
                }

                if (record.type === 'upload') {
                    const response = await fetch(`/api/v1/asset/${record.xid}`);
                    const metadata = await response.json();
                    const mb = (record.bytes / 1000000).toFixed(2);

                    if (record.files === 1) {
                        setMessage(<div>Uploaded 1 file (${mb} MB) to {collectionLink(metadata)} collection.</div>);
                    }
                    else {
                        setMessage(<div>Uploaded {record.files} files ({mb} MB) to {collectionLink(metadata)} collection.</div>);
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

                    setMessage(<div>Sold "{assetLink(token)} ({nftLink(edition)})" to {profileLink(buyer)}.</div>);
                    setSats(record.sats || record.price);
                    setCredits(record.credits);
                }

                if (record.type === 'buy') {
                    const response1 = await fetch(`/api/v1/asset/${record.edition}`);
                    const edition = await response1.json();

                    const response2 = await fetch(`/api/v1/asset/${edition.nft.asset}`);
                    const token = await response2.json();

                    const response3 = await fetch(`/api/v1/profile/${record.seller}`);
                    const seller = await response3.json();

                    setMessage(<div>Bought "{assetLink(token)} ({nftLink(edition)})" from {profileLink(seller)}.</div>);
                    setSats(-(record.sats || record.price));
                }

                if (record.type === 'royalty') {
                    const response1 = await fetch(`/api/v1/asset/${record.edition}`);
                    const edition = await response1.json();

                    const response2 = await fetch(`/api/v1/asset/${edition.nft.asset}`);
                    const token = await response2.json();

                    const response3 = await fetch(`/api/v1/profile/${record.seller}`);
                    const seller = await response3.json();

                    const response4 = await fetch(`/api/v1/profile/${record.buyer}`);
                    const buyer = await response4.json();

                    setMessage(<div>Royalty when {profileLink(seller)} sold "{assetLink(token)} ({nftLink(edition)})" to {profileLink(buyer)}.</div>);
                    setSats(record.sats);
                    setCredits(record.credits);
                }
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
