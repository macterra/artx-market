
import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';

const MainView = ({ navigate }) => {

    const [message, setMessage] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                let response = await fetch(`/api/message`);
                const data = await response.json();

                setMessage(data.message);
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchData();
    }, [navigate]);

    if (!message) {
        return <p>Loading...</p>;
    }

    return (
        <Box>
            <p>{message}</p>
        </Box>
    );
};

export default MainView;
