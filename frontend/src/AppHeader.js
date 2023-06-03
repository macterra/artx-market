import React, { useEffect } from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from '@mui/material';

import BuildTime from './BuildTime';

const AppHeader = ({ isAuthenticated, setIsAuthenticated, navigate }) => {

    const [anchorEl, setAnchorEl] = React.useState(null);
    const [aboutOpen, setAboutOpen] = React.useState(false);

    const handleHelpMenuClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleHelpMenuClose = () => {
        setAnchorEl(null);
    };

    const handleAboutClick = () => {
        setAnchorEl(null);
        setAboutOpen(true);
    };

    const handleAboutClose = () => {
        setAboutOpen(false);
    };

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
        checkAuthStatus();
    };

    return (
        <>
            <AppBar position="static">
                <Toolbar>
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
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        ArtX Market
                    </Typography>
                    {isAuthenticated ? (
                        <Button color="inherit" onClick={handleLogout}>
                            Logout
                        </Button>
                    ) : (
                        <Button color="inherit" onClick={handleLogin}>
                            Login
                        </Button>
                    )}
                    <Button
                        color="inherit"
                        aria-controls="help-menu"
                        aria-haspopup="true"
                        onClick={handleHelpMenuClick}
                    >
                        Help
                    </Button>
                    <Menu
                        id="help-menu"
                        anchorEl={anchorEl}
                        keepMounted
                        open={Boolean(anchorEl)}
                        onClose={handleHelpMenuClose}
                    >
                        <MenuItem onClick={handleAboutClick}>About</MenuItem>
                    </Menu>
                </Toolbar>
            </AppBar>
            <Dialog onClose={handleAboutClose} open={aboutOpen}>
                <DialogTitle>About</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <BuildTime />
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleAboutClose}>Close</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default AppHeader;
