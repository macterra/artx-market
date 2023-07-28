
import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';

const AdminView = ({ navigate }) => {

    const [admin, setAdmin] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                let response = await fetch(`/api/v1/admin`);
                const data = await response.json();

                setAdmin(data);
            } catch (error) {
                console.error('Error fetching admin data:', error);
            }
        };

        fetchData();
    }, [navigate]);

    if (!admin) {
        return <p>Loading...</p>;
    }

    return (
        <Box>
            <h1>Admin</h1>
        </Box>
    );
};

export default AdminView;
