
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Tab, Tabs } from '@mui/material';

import NameEditor from './NameEditor';
import CollectionEditor from './CollectionEditor';
import LnAddressEditor from './LnAddressEditor';
import LinksEditor from './LinksEditor';
import CreditsEditor from './CreditsEditor';
import TxnLog from './TxnLog';
import AgentBadge from './AgentBadge';

const ProfileEditor = ({ navigate, refreshProfile, setRefreshProfile }) => {
    const { jump } = useParams();
    const [profile, setProfile] = useState({});
    const [tab, setTab] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(`/api/v1/profile`);

                if (response.ok) {
                    const data = await response.json();
                    setProfile(data);
                }
                else {
                    navigate('/');
                }

                if (jump) {
                    setTab(jump);
                }
                else if (!tab) {
                    setTab('name');
                }
            } catch (error) {
                console.error('Error fetching profile data:', error);
                navigate('/');
            }
        };

        fetchProfile();
    }, [navigate, jump, refreshProfile]);

    if (!profile) {
        return;
    }

    return (
        <Box>
            <Box display="flex" alignItems="center" justifyContent="center">
                <div>Edit Profile ::</div>
                <AgentBadge agent={profile} refreshProfile={refreshProfile} />
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
            </Tabs>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Box style={{ width: '50vw' }}>
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
                        <CreditsEditor profile={profile} setRefreshProfile={setRefreshProfile} />
                    }
                    {tab === 'log' &&
                        <TxnLog profile={profile} refreshProfile={refreshProfile} />
                    }
                </Box>
            </div>
        </Box >
    );
};

export default ProfileEditor;
