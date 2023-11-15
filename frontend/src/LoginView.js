
import React, { useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { Box } from '@mui/material';
import axios from 'axios';

const LoginView = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleMessage = async (event) => {
            if (event.data === 'authenticated') {
                const getAuth = await axios.get('/check-auth');
                const auth = getAuth.data;

                if (auth.isAdmin) {
                    navigate('/admin');
                }
                else if (auth.userId) {
                    navigate(`/profile/${auth.userId}`);
                }
                else {
                    navigate('/');
                }
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [navigate]);

    return (
        <Box
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'center',
                height: '100vh'
            }}
        >
            <iframe
                src="/authenticate"
                style={{
                    width: '80vw',
                    height: '80vh',
                    border: 'none'
                }}
                title="Authentication Page"
            />
        </Box>
    );
};

export default LoginView;
