import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Tab, Tabs } from '@mui/material';
import PfpEditor from './PfpEditor';
import TokenTrader from './TokenTrader';
import TokenHistory from './TokenHistory';
import EditionView from './EditionView';

const NftView = ({ navigate }) => {
    const { xid } = useParams();

    const [nft, setNft] = useState(null);
    const [isOwner, setIsOwner] = useState(false);
    const [tab, setTab] = useState("edition");
    const [refreshKey, setRefreshKey] = useState(0);
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const auth = await axios.get('/check-auth');
                const isAuthenticated = auth.data.isAuthenticated;
                const asset = await axios.get(`/api/v1/nft/${xid}`);
                const nft = asset.data;

                setIsAuthenticated(isAuthenticated);
                setNft(nft);
                setIsOwner(nft.owned);
            } catch (error) {
                console.error('Error fetching image nft.token:', error);
            }
        };

        fetchMetadata();
    }, [xid, refreshKey, navigate]);

    if (!nft) {
        return;
    }

    const handleTabChange = (event, newTab) => {
        setTab(newTab);
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ width: '50%', padding: '16px' }}>
                <img src={nft.token.file.path} alt={nft.token.asset.title} style={{ width: '100%', height: 'auto' }} />
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
                    {isAuthenticated &&
                        <Tab key="trade" value="trade" label={'Buy/Sell'} />
                    }
                    {isOwner &&
                        <Tab key="pfp" value="pfp" label={'Pfp'} />
                    }
                    <Tab key="history" value="history" label={'History'} />
                </Tabs>
                {tab === 'edition' && <EditionView nft={nft} />}
                {tab === 'trade' && <TokenTrader metadata={nft.token} setRefreshKey={setRefreshKey} />}
                {tab === 'pfp' && <PfpEditor metadata={nft.token} setTab={setTab} />}
                {tab === 'history' && <TokenHistory metadata={nft.token} />}
            </div>
        </div>
    );
};

export default NftView;
