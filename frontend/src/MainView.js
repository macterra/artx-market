
import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import axios from 'axios';
import ProfileGrid from './ProfileGrid';

const MainView = ({ navigate }) => {

    const [profiles, setProfiles] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const profiles = await axios.get(`/api/v1/profiles`);
                setProfiles(profiles.data);

                const listings = await axios.get(`/api/v1/listings`);
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchData();
    }, [navigate]);

    if (!profiles) {
        return <p></p>;
    }

    return (
        <Box>
            <h1>Featured Artists</h1>
            <ProfileGrid collection={profiles} />
        </Box>
    );
};

export default MainView;
