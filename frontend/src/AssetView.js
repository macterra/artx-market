import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Tab, Tabs } from '@mui/material';
import MetadataView from './MetadataView'
import AssetEditor from './AssetEditor';
import TokenMinter from './TokenMinter';
import PfpEditor from './PfpEditor';
import TokenView from './TokenView';
import TokenTrader from './TokenTrader';
import TokenHistory from './TokenHistory';
import PromotionEditor from './PromotionEditor';

const AssetView = ({ navigate }) => {
    const { xid } = useParams();

    const [metadata, setMetadata] = useState(null);
    const [isOwner, setIsOwner] = useState(false);
    const [isToken, setIsToken] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);
    const [tab, setTab] = useState("meta");
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const asset = await axios.get(`/api/v1/asset/${xid}`);
                const metadata = asset.data;
                setMetadata(metadata);
                setIsToken(!!metadata.token);
                setIsDeleted(metadata.asset.collection === 'deleted');
                setIsOwner(metadata.userIsOwner);
            } catch (error) {
                console.error('Error fetching metadata:', error);
            }
        };

        fetchMetadata();
    }, [xid, refreshKey, navigate]);

    if (!metadata) {
        return;
    }

    const handleTabChange = (event, newTab) => {
        setTab(newTab);
    };

    return (
        <div className="container">
            <div className="left-pane">
                <img src={metadata.file.path} alt={metadata.asset.title} style={{ width: '100%', height: 'auto' }} />
            </div>
            <div className="right-pane">
                <Tabs
                    value={tab}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab key="meta" value="meta" label={'Metadata'} />
                    {isToken && <Tab key="token" value="token" label={'Token'} />}
                    {isToken && <Tab key="trade" value="trade" label={'Buy/Sell'} />}
                    {isOwner && isToken && <Tab key="promote" value="promote" label={'Promote'} />}
                    {isOwner && !isToken && <Tab key="edit" value="edit" label={'Edit'} />}
                    {isOwner && !isToken && !isDeleted && <Tab key="mint" value="mint" label={'Mint'} />}
                    {isOwner && !isDeleted && <Tab key="pfp" value="pfp" label={'Pfp'} />}
                    {isToken && <Tab key="history" value="history" label={'History'} />}
                </Tabs>
                {tab === 'meta' && <MetadataView navigate={navigate} metadata={metadata} />}
                {tab === 'token' && <TokenView metadata={metadata} setTab={setTab} setRefreshKey={setRefreshKey} />}
                {tab === 'trade' && <TokenTrader metadata={metadata} setRefreshKey={setRefreshKey} />}
                {tab === 'promote' && <PromotionEditor metadata={metadata} />}
                {tab === 'edit' && <AssetEditor metadata={metadata} setTab={setTab} setRefreshKey={setRefreshKey} />}
                {tab === 'mint' && <TokenMinter navigate={navigate} metadata={metadata} setTab={setTab} setRefreshKey={setRefreshKey} />}
                {tab === 'pfp' && <PfpEditor metadata={metadata} setTab={setTab} />}
                {tab === 'history' && <TokenHistory metadata={metadata} />}
            </div>
        </div>
    );
};

export default AssetView;
