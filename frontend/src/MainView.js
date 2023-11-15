
import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import axios from 'axios';
import ProfileGrid from './ProfileGrid';
import ListingsGrid from './ListingsGrid';

const MainView = () => {

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
    }, []);

    if (!profiles) {
        return;
    }

    return (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
            {listings &&
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                    <p>Recent Listings</p>
                    <ListingsGrid listings={listings} />
                </Box>
            }
            {profiles &&
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                    <p>Featured Artists</p>
                    <ProfileGrid collection={profiles} />
                </Box>
            }
        </Box>
    );
};

export default MainView;
