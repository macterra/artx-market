
import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import axios from 'axios';
import ProfileGrid from './ProfileGrid';
import ListingsGrid from './ListingsGrid';

const MainView = () => {

    const [profiles, setProfiles] = useState([]);
    const [listings, setListings] = useState([]);
    const [sales, setSales] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const profiles = await axios.get(`/api/v1/profiles`);
                setProfiles(profiles.data);

                const listings = await axios.get(`/api/v1/listings`);
                setListings(listings.data);

                const sales = await axios.get(`/api/v1/sales`);
                setSales(sales.data);
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchData();
    }, []);

    return (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
            {listings.length > 0 &&
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                    <p>Recent Listings</p>
                    <ListingsGrid listings={listings} />
                </Box>
            }
            {sales.length > 0 &&
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                    <p>Recent Sales</p>
                    <ListingsGrid listings={sales} />
                </Box>
            }
            {profiles.length > 0 &&
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                    <p>Featured Artists</p>
                    <ProfileGrid collection={profiles} />
                </Box>
            }
        </Box>
    );
};

export default MainView;
