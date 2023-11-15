import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Tab, Tabs } from '@mui/material';
import PfpEditor from './PfpEditor';
import TokenTrader from './TokenTrader';
import TokenHistory from './TokenHistory';
import EditionView from './EditionView';
import PromotionEditor from './PromotionEditor';

const NftView = () => {
    const { xid } = useParams();
    const navigate = useNavigate();

    const [nft, setNft] = useState(null);
    const [isOwner, setIsOwner] = useState(false);
    const [tab, setTab] = useState("edition");
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const asset = await axios.get(`/api/v1/nft/${xid}`);
                const nft = asset.data;

                setNft(nft);
                setIsOwner(nft.owned);
            } catch (error) {
                console.error('Error:', error);
                navigate('/');
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
        <div className="container">
            <div className="left-pane">
                <img src={nft.token.file.path} alt={nft.nft.title} style={{ width: '100%', height: 'auto' }} />
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
                    <Tab key="edition" value="edition" label={'NFT'} />
                    <Tab key="trade" value="trade" label={'Buy/Sell'} />
                    {isOwner && <Tab key="promote" value="promote" label={'Promote'} />}
                    {isOwner && <Tab key="pfp" value="pfp" label={'Pfp'} />}
                    <Tab key="history" value="history" label={'History'} />
                </Tabs>
                {tab === 'edition' && <EditionView nft={nft} />}
                {tab === 'trade' && <TokenTrader metadata={nft.token} xid={nft.xid} setRefreshKey={setRefreshKey} />}
                {tab === 'promote' && <PromotionEditor metadata={nft.token} xid={nft.xid} />}
                {tab === 'pfp' && <PfpEditor metadata={nft.token} setTab={setTab} />}
                {tab === 'history' && <TokenHistory metadata={nft.token} xid={nft.xid} />}
            </div>
        </div>
    );
};

export default NftView;
