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
import utils from './utils';

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
        const title = utils.truncateTitle(metadata.asset.title, 20);
        return <a href={`/asset/${metadata.xid}`}>{title}</a>;
    }

    function collectionLink(metadata) {
        const title = utils.truncateTitle(metadata.asset.title, 20);
        return <a href={`/collection/${metadata.xid}`}>{title}</a>;
    }

    function nftLink(metadata) {
        const title = utils.truncateTitle(metadata.asset.title, 20);
        return <a href={`/nft/${metadata.xid}`}>{title}</a>;
    }

    function profileLink(agent) {
        const name = utils.truncateTitle(agent.name, 20);
        return <a href={`/profile/${agent.xid}`}>{name}</a>;
    }

    const ObjectCache = {};
    const locks = {};

    async function getObject(xid, url) {
        if (!ObjectCache[xid]) {
            if (!locks[xid]) {
                locks[xid] = true;

                ObjectCache[xid] = fetch(url)
                    .then(response => response.json())
                    .catch(error => {
                        console.error(`Failed to fetch asset ${xid}: ${error}`);
                        delete ObjectCache[xid]; // remove failed promise from cache
                        throw error; // re-throw the error to be handled by the caller
                    })
                    .finally(() => {
                        delete locks[xid]; // release the lock
                    });
            } else {
                await new Promise(resolve => {
                    const intervalId = setInterval(() => {
                        if (!locks[xid]) {
                            clearInterval(intervalId);
                            resolve();
                        }
                    }, 50);
                });
            }
        }

        return ObjectCache[xid];
    }

    async function getAsset(xid) {
        return getObject(xid, `/api/v1/asset/${xid}`);
    }

    async function getProfile(xid) {
        return getObject(xid, `/api/v1/profile/${xid}`);
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
                    const metadata = await getAsset(record.xid);

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
                    const metadata = await getAsset(record.xid);

                    setMessage(<div>Unminted {assetLink(metadata)}.</div>);
                    setCredits(record.credits);
                }

                if (record.type === 'upload') {
                    const metadata = await getAsset(record.xid);

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
                    const edition = await getAsset(record.edition);
                    const token = await getAsset(edition.nft.asset);
                    const buyer = await getProfile(record.buyer);

                    setMessage(<div>Sold "{assetLink(token)} ({nftLink(edition)})" to {profileLink(buyer)}.</div>);
                    setSats(record.sats || record.price);
                    setCredits(record.credits);
                }

                if (record.type === 'buy') {
                    const edition = await getAsset(record.edition);
                    const token = await getAsset(edition.nft.asset);
                    const seller = await getProfile(record.seller);

                    setMessage(<div>Bought "{assetLink(token)} ({nftLink(edition)})" from {profileLink(seller)}.</div>);
                    setSats(-(record.sats || record.price));
                }

                if (record.type === 'royalty') {
                    const edition = await getAsset(record.edition);
                    const token = await getAsset(edition.nft.asset);
                    const buyer = await getProfile(record.buyer);
                    const seller = await getProfile(record.seller);

                    setMessage(<div>Royalty when {profileLink(seller)} sold "{assetLink(token)} ({nftLink(edition)})" to {profileLink(buyer)}.</div>);
                    setSats(record.sats);
                    setCredits(record.credits);
                }
            };

            fetchInfo();
        }, [record]);

        if (!message) {
            return;
        }

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
