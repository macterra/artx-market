
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Box, Tab, Tabs } from '@mui/material';

import NameEditor from './NameEditor';
import CollectionEditor from './CollectionEditor';
import LnAddressEditor from './LnAddressEditor';
import LinksEditor from './LinksEditor';
import CreditsTrader from './CreditsTrader';
import TxnLog from './TxnLog';
import MergeEditor from './MergeEditor';
import AgentBadge from './AgentBadge';

const ProfileEditor = () => {
    const { jump } = useParams();
    const navigate = useNavigate();

    const [profile, setProfile] = useState({});
    const [tab, setTab] = useState(null);
    const [refreshProfile, setRefreshProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const getProfile = await axios.get(`/api/v1/profile`);
                const profile = getProfile.data;

                document.title = `${profile.name} Settings`;
                setProfile(profile);

                if (!tab) {
                    setTab(jump || 'name');
                }
            } catch (error) {
                console.error('Error fetching profile data:', error);
                navigate('/');
            }
        };

        fetchProfile();
    }, [navigate, tab, jump, refreshProfile]);

    if (!profile) {
        return;
    }

    return (
        <Box>
            <Box display="flex" alignItems="center" justifyContent="center">
                <AgentBadge agent={profile} refreshProfile={refreshProfile} />
                <div>Settings</div>
            </Box>
            <Tabs
                value={tab}
                onChange={(event, newTab) => { setTab(newTab) }}
                indicatorColor="primary"
                textColor="primary"
                variant="scrollable"
                scrollButtons="auto"
            >
                <Tab key="name" value="name" label={'Name'} />
                <Tab key="coll" value="coll" label={'Collections'} />
                <Tab key="links" value="links" label={'Links'} />
                <Tab key="ln" value="ln" label={'Lightning'} />
                <Tab key="credits" value="credits" label={'Credits'} />
                <Tab key="log" value="log" label={'Log'} />
                <Tab key="merge" value="merge" label={'Merge'} />
            </Tabs>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Box style={{ width: '90vw' }}>
                    {tab === 'name' &&
                        <NameEditor profile={profile} setRefreshProfile={setRefreshProfile} />
                    }
                    {tab === 'coll' &&
                        <CollectionEditor />
                    }
                    {tab === 'links' &&
                        <LinksEditor />
                    }
                    {tab === 'ln' &&
                        <LnAddressEditor profile={profile} setRefreshProfile={setRefreshProfile} />
                    }
                    {tab === 'credits' &&
                        <CreditsTrader profile={profile} setRefreshProfile={setRefreshProfile} />
                    }
                    {tab === 'log' &&
                        <TxnLog profile={profile} refreshProfile={refreshProfile} />
                    }
                    {tab === 'merge' &&
                        <MergeEditor profile={profile} refreshProfile={refreshProfile} />
                    }
                </Box>
            </div>
        </Box >
    );
};

export default ProfileEditor;
