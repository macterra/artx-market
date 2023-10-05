import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Tab, Tabs } from '@mui/material';
import MetadataView from './MetadataView'
import PfpEditor from './PfpEditor';
import TokenTrader from './TokenTrader';
import TokenHistory from './TokenHistory';
import EditionView from './EditionView';

const NftView = ({ navigate }) => {
    const { xid } = useParams();

    const [nft, setNft] = useState(null);
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
                const asset = await axios.get(`/api/v1/nft/${xid}`);
                const nft = asset.data;
                const metadata = nft.nft.asset;

                setIsAuthenticated(isAuthenticated);
                setNft(nft);
                setMetadata(metadata);
                setIsToken(!!metadata.token);
                setIsOwner(nft.owned);
            } catch (error) {
                console.error('Error fetching image metadata:', error);
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
                    <Tab key="edition" value="edition" label={'NFT'} />
                    <Tab key="meta" value="meta" label={'Metadata'} />
                    {isToken && isAuthenticated && !isDeleted && <Tab key="trade" value="trade" label={'Buy/Sell'} />}
                    {isOwner && !isDeleted && <Tab key="pfp" value="pfp" label={'Pfp'} />}
                    {isToken && <Tab key="history" value="history" label={'History'} />}
                </Tabs>
                {tab === 'edition' && <EditionView nft={nft} />}
                {tab === 'meta' && <MetadataView navigate={navigate} metadata={metadata} />}
                {tab === 'trade' && <TokenTrader metadata={metadata} setRefreshKey={setRefreshKey} />}
                {tab === 'pfp' && <PfpEditor metadata={metadata} setTab={setTab} />}
                {tab === 'history' && <TokenHistory metadata={metadata} />}
            </div>
        </div>
    );
};

export default NftView;
