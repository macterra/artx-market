import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Tab, Tabs } from '@mui/material';
import axios from 'axios';

import CollectionGrid from './CollectionGrid';
import ImageGrid from './ImageGrid';

const ProfileView = () => {
    const { xid } = useParams();

    const [profile, setProfile] = useState(null);
    const [tab, setTab] = useState("created");

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const getProfile = await axios.get(`/api/v1/profile/${xid}`);
                setProfile(getProfile.data);
            } catch (error) {
                console.error('Error fetching profile data:', error);
                // Let ProfileHeader navigate to home
            }
        };

        fetchProfile();
    }, [xid]);

    if (!profile) {
        return <p></p>;
    }

    return (
        <Box>
            <Tabs
                value={tab}
                onChange={(_, newTab) => { setTab(newTab); }}
                indicatorColor="primary"
                textColor="primary"
                variant="scrollable"
                scrollButtons="auto"
            >
                <Tab key="created" value="created" label={'Created'} />
                <Tab key="minted" value="minted" label={'Minted'} />
                <Tab key="collected" value="collected" label={'Collected'} />
                <Tab key="listed" value="listed" label={'Listed'} />
                <Tab key="unlisted" value="unlisted" label={'Unlisted'} />
                {profile.isUser && <Tab key="deleted" value="deleted" label={'Deleted'} />}
            </Tabs>
            {tab === 'created' &&
                <CollectionGrid collections={profile.collections} />
            }
            {tab === 'minted' &&
                <ImageGrid images={profile.minted} />
            }
            {tab === 'collected' &&
                <ImageGrid images={profile.collected} />
            }
            {tab === 'listed' &&
                <ImageGrid images={profile.listed} />
            }
            {tab === 'unlisted' &&
                <ImageGrid images={profile.unlisted} />
            }
            {tab === 'deleted' &&
                <ImageGrid images={profile.deleted} />
            }
        </Box>
    );
};

export default ProfileView;
