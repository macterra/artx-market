import React, { useState, useEffect } from 'react';
import { Box, Button } from '@mui/material';
import axios from 'axios';

const AdminView = ({ navigate }) => {

    const [admin, setAdmin] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const admin = await axios.get('/api/v1/admin');

                console.log(`admin ${admin}`);

                // if (!admin.xid) {
                //     navigate('/');
                // }

                setAdmin(admin.data);
            } catch (error) {
                console.error('Error fetching admin data:', error);
            }
        };

        fetchData();
    }, [navigate]);

    if (!admin) {
        return <p>Loading...</p>;
    }

    const handleClaim = async () => {
        try {
            const admin = await axios.get('/api/v1/admin/claim');
            setAdmin(admin);
        } catch (error) {
            console.error('Error fetching admin data:', error);
        }
    };

    return (
        <Box>
            <h1>Admin</h1>
            <p>xid: {admin.xid}</p>
            {!admin.owner &&
                <Button variant="contained" color="primary" onClick={handleClaim}>
                    Claim Admin
                </Button>
            }
            {admin.owner &&
                <Box>
                    <p>owner: {admin.owner}</p>
                    <p>created: {admin.created}</p>
                    <p>updated: {admin.updated}</p>
                    <p>githash: {admin.githash}</p>
                </Box>
            }
        </Box>
    );
};

export default AdminView;
