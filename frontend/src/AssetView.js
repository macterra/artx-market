import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tab, Tabs } from '@mui/material';
import MetadataView from './MetadataView'
import AssetEditor from './AssetEditor';
import NftMinter from './NftMinter';
import PfpEditor from './PfpEditor';
import NftView from './NftView';

const AssetView = ({ navigate, isAuthenticated }) => {
    const { xid } = useParams();

    const [metadata, setMetadata] = useState(null);
    const [isOwner, setIsOwner] = useState(false);
    const [isNft, setIsNft] = useState(false);
    const [tab, setTab] = useState(0);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const response = await fetch(`/api/asset/${xid}`);
                const metadata = await response.json();
                setMetadata(metadata);

                if (metadata.nft) {
                    setIsNft(true);
                } else {
                    setIsNft(false);
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
                    {isNft && <Tab key="nft" value="nft" label={'NFT'} />}
                    {isOwner && <Tab key="edit" value="edit" label={'Edit'} />}
                    {isOwner && !isNft && <Tab key="mint" value="mint" label={'Mint'} />}
                    {isOwner && <Tab key="pfp" value="pfp" label={'Pfp'} />}
                </Tabs>
                {tab === 'meta' && <MetadataView navigate={navigate} metadata={metadata} />}
                {tab === 'nft' && <NftView metadata={metadata} />}
                {tab === 'edit' && <AssetEditor metadata={metadata} setTab={setTab} />}
                {tab === 'mint' && <NftMinter metadata={metadata} setTab={setTab} />}
                {tab === 'pfp' && <PfpEditor metadata={metadata} setTab={setTab} />}
            </div>
        </div>
    );
};

export default AssetView;
