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
import EditionView from './EditionView';

const AssetView = ({ navigate }) => {
    const { xid, ed } = useParams();

    const [metadata, setMetadata] = useState(null);
    const [isOwner, setIsOwner] = useState(false);
    const [isToken, setIsToken] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);
    const [tab, setTab] = useState("meta");
    const [refreshKey, setRefreshKey] = useState(0);
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const [edition, setEdition] = useState(null);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const auth = await axios.get('/check-auth');
                const isAuthenticated = auth.data.isAuthenticated;
                setIsAuthenticated(isAuthenticated);

                const asset = await axios.get(`/api/v1/asset/${xid}`);
                const metadata = asset.data;
                setMetadata(metadata);

                const isToken = !!metadata.token;
                setIsToken(isToken);

                if (ed) {
                    if (!isToken) {
                        navigate(`/asset/${xid}`);
                        return;
                    }

                    const edition = parseInt(ed);

                    if (isNaN(edition) || edition < 1 || edition > metadata.token.editions) {
                        navigate(`/asset/${xid}`);
                        return;
                    }

                    setEdition(edition);
                    setTab('edition');
                }
                else {
                    if (isToken && metadata.token.editions === 1) {
                        setEdition(1);
                    }
                }

                if (metadata.asset.collection === 'deleted') {
                    setIsDeleted(true);
                } else {
                    setIsDeleted(false);
                }

                if (isAuthenticated) {
                    setIsOwner(metadata.userIsOwner);
                } else {
                    setIsOwner(false);
                }
            } catch (error) {
                console.error('Error fetching image metadata:', error);
            }
        };

        fetchMetadata();
    }, [xid, refreshKey, ed, navigate]);

    if (!metadata) {
        return;
    }

    const handleTabChange = (event, newTab) => {
        setTab(newTab);
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ width: '50%', padding: '16px' }}>
                <img src={metadata.file.path} alt={metadata.asset.title} style={{ width: '100%', height: 'auto' }} />
            </div>
            <div style={{ width: '50%', padding: '16px' }}>
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
                    {isToken && edition && <Tab key="edition" value="edition" label={'Edition'} />}
                    {isToken && isAuthenticated && !isDeleted && <Tab key="trade" value="trade" label={'Buy/Sell'} />}
                    {isOwner && !isToken && <Tab key="edit" value="edit" label={'Edit'} />}
                    {isOwner && !isToken && !isDeleted && <Tab key="mint" value="mint" label={'Mint'} />}
                    {isOwner && !isDeleted && <Tab key="pfp" value="pfp" label={'Pfp'} />}
                    {isToken && <Tab key="history" value="history" label={'History'} />}
                </Tabs>
                {tab === 'meta' && <MetadataView navigate={navigate} metadata={metadata} />}
                {tab === 'token' && <TokenView metadata={metadata} />}
                {tab === 'edition' && <EditionView metadata={metadata} edition={edition} />}
                {tab === 'trade' && <TokenTrader metadata={metadata} setRefreshKey={setRefreshKey} />}
                {tab === 'edit' && <AssetEditor metadata={metadata} setTab={setTab} setRefreshKey={setRefreshKey} />}
                {tab === 'mint' && <TokenMinter navigate={navigate} metadata={metadata} setTab={setTab} setRefreshKey={setRefreshKey} />}
                {tab === 'pfp' && <PfpEditor metadata={metadata} setTab={setTab} />}
                {tab === 'history' && <TokenHistory metadata={metadata} />}
            </div>
        </div>
    );
};

export default AssetView;
