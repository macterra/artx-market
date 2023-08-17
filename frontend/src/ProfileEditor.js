
import React, { useState, useEffect } from 'react';
import { Box, Tab, Tabs } from '@mui/material';

import NameEditor from './NameEditor';
import CollectionEditor from './CollectionEditor';
import LnAddressEditor from './LnAddressEditor';
import LinksEditor from './LinksEditor';
import CreditsEditor from './CreditsEditor';

const ProfileEditor = ({ navigate }) => {
    const [profile, setProfile] = useState({});
    const [tab, setTab] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(`/api/v1/profile`);
                const data = await response.json();
                setProfile(data);
                setTab("name");
            } catch (error) {
                console.error('Error fetching profile data:', error);
                //navigate('/');
            }
        };

        fetchProfile();
    }, []);

    return (
        <Box>
            <h2>Edit Profile</h2>
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
            </Tabs>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Box style={{ width: '50vw' }}>
                    {tab === 'name' &&
                        <NameEditor profile={profile} />
                    }
                    {tab === 'coll' &&
                        <CollectionEditor />
                    }
                    {tab === 'links' &&
                        <LinksEditor />
                    }
                    {tab === 'ln' &&
                        <LnAddressEditor profile={profile} />
                    }
                    {tab === 'credits' &&
                        <CreditsEditor profile={profile} />
                    }
                </Box>
            </div>
        </Box >
    );
};

export default ProfileEditor;
