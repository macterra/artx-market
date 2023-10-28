
import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import axios from 'axios';
import ProfileGrid from './ProfileGrid';
import ListingsGrid from './ListingsGrid';

const MainView = ({ navigate }) => {

    const [profiles, setProfiles] = useState(null);
    const [listings, setListings] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const profiles = await axios.get(`/api/v1/profiles`);
                setProfiles(profiles.data);

                const listings = await axios.get(`/api/v1/listings`);
                setListings(listings.data);
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchData();
    }, [navigate]);

    if (!profiles) {
        return;
    }

    return (
        <Box>
            <h2>Recent Listings</h2>
            <ListingsGrid listings={listings} />
            <h2>Featured Artists</h2>
            <ProfileGrid collection={profiles} />
        </Box>
    );
};

export default MainView;
