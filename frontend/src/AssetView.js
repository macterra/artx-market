import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tab, Tabs } from '@mui/material';
import MetadataView from './MetadataView'
import AssetEditor from './AssetEditor';
import NftMinter from './NftMinter';

const AssetView = ({ navigate }) => {
    const { xid } = useParams();
    const [metadata, setMetadata] = useState(null);
    const [tab, setTab] = useState(0);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const response = await fetch(`/api/asset/${xid}`);
                const metadata = await response.json();
                setMetadata(metadata);
            } catch (error) {
                console.error('Error fetching image metadata:', error);
            }
        };

        fetchMetadata();
    }, [xid]);

    if (!metadata) {
        return;
    }

    const handleTabChange = (event, newIndex) => {
        setTab(newIndex);
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ width: '50%', padding: '16px' }}>
                <img src={metadata.asset.path} alt={metadata.asset.originalName} style={{ width: '100%', height: 'auto' }} />
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
                    <Tab key={1} label={'Edit'} />
                    <Tab key={2} label={'Mint'} />
                </Tabs>
                {tab === 0 && <MetadataView metadata={metadata} />}
                {tab === 1 && <AssetEditor metadata={metadata} setTab={setTab} />}
                {tab === 2 && <NftMinter metadata={metadata} />}
            </div>
        </div>
    );
};

export default AssetView;
