import React, { useEffect } from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import BuildTime from './BuildTime';

const AppHeader = ({ isAuthenticated, setIsAuthenticated, navigate }) => {

    const checkAuthStatus = async () => {
        try {
            const response = await fetch('/check-auth');
            const data = await response.json();
            if (data.message === 'Authenticated') {
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error('Error fetching authentication status:', error);
            setIsAuthenticated(false);
        }
    };

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const handleLogin = () => {
        window.location.href = '/login';
    };

    const handleLogout = async () => {
        await fetch('/logout', { method: 'GET', credentials: 'include' });
        //window.location.reload();
        checkAuthStatus();
    };

    return (
        <AppBar position="static">
            <Toolbar>
                <BuildTime />
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    ArtX Market
                </Typography>
                {isAuthenticated && (
                    <Button color="inherit" onClick={() => navigate('/')}>
                        Home
                    </Button>
                )}
                {isAuthenticated && (
                    <Button color="inherit" onClick={() => navigate('/profile')}>
                        Profile
                    </Button>
                )}
                {isAuthenticated ? (
                    <Button color="inherit" onClick={handleLogout}>
                        Logout
                    </Button>
                ) : (
                    <Button color="inherit" onClick={handleLogin}>
                        Login
                    </Button>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default AppHeader;
