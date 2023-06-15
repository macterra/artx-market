import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tab, Tabs } from '@mui/material';
import MetadataView from './MetadataView'
import AssetEditor from './AssetEditor';
import NftMinter from './NftMinter';
import PfpEditor from './PfpEditor';

const AssetView = ({ navigate, isAuthenticated }) => {
    const { xid } = useParams();

    const [metadata, setMetadata] = useState(null);
    const [isOwner, setIsOwner] = useState(false);
    const [tab, setTab] = useState(0);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const response = await fetch(`/api/asset/${xid}`);
                const metadata = await response.json();
                setMetadata(metadata);

                if (isAuthenticated) {
                    const response2 = await fetch(`/check-auth/${metadata.asset.owner}`);
                    const data = await response2.json();
                    setIsOwner(data.sameId);
                } else {
                    setIsOwner(false);
                    setTab(0);
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

    const handleTabChange = (event, newIndex) => {
        setTab(newIndex);
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
                    <Tab key={0} label={'Metadata'} />
                    {isOwner && <Tab key={1} label={'Edit'} />}
                    {isOwner && <Tab key={2} label={'Mint'} />}
                    {isOwner && <Tab key={3} label={'Pfp'} />}
                </Tabs>
                {tab === 0 && <MetadataView metadata={metadata} />}
                {tab === 1 && <AssetEditor metadata={metadata} setTab={setTab} />}
                {tab === 2 && <NftMinter metadata={metadata} />}
                {tab === 3 && <PfpEditor metadata={metadata} setTab={setTab} />}
            </div>
        </div>
    );
};

export default AssetView;
