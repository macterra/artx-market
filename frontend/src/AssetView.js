import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tab, Tabs } from '@mui/material';
import MetadataView from './MetadataView'
import AssetEditor from './AssetEditor';
import TokenMinter from './TokenMinter';
import PfpEditor from './PfpEditor';
import TokenView from './TokenView';
import TokenTrader from './TokenTrader';

const AssetView = ({ navigate, isAuthenticated }) => {
    const { xid } = useParams();

    const [metadata, setMetadata] = useState(null);
    const [isOwner, setIsOwner] = useState(false);
    const [isToken, setIsToken] = useState(false);
    const [tab, setTab] = useState(0);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const response = await fetch(`/api/asset/${xid}`);
                const metadata = await response.json();
                setMetadata(metadata);

                if (metadata.token) {
                    setIsToken(true);
                } else {
                    setIsToken(false);
                }

                if (isAuthenticated) {
                    const response2 = await fetch(`/check-auth/${metadata.asset.owner}`);
                    const data = await response2.json();
                    setIsOwner(data.sameId);
                } else {
                    setIsOwner(false);
                    setTab("meta");
                }
            } catch (error) {
                console.error('Error fetching image metadata:', error);
            }
        };

        fetchMetadata();
    }, [xid, isAuthenticated]);

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
                    {isToken && isAuthenticated && <Tab key="trade" value="trade" label={'Trade'} />}
                    {isOwner && !isToken && <Tab key="edit" value="edit" label={'Edit'} />}
                    {isOwner && !isToken && <Tab key="mint" value="mint" label={'Mint'} />}
                    {isOwner && <Tab key="pfp" value="pfp" label={'Pfp'} />}
                </Tabs>
                {tab === 'meta' && <MetadataView navigate={navigate} metadata={metadata} />}
                {tab === 'token' && <TokenView metadata={metadata} />}
                {tab === 'trade' && <TokenTrader metadata={metadata} setTable={setTab} />}
                {tab === 'edit' && <AssetEditor metadata={metadata} setTab={setTab} />}
                {tab === 'mint' && <TokenMinter metadata={metadata} setTab={setTab} />}
                {tab === 'pfp' && <PfpEditor metadata={metadata} setTab={setTab} />}
            </div>
        </div>
    );
};

export default AssetView;
