import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import axios from 'axios';
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
import AgentBadge from './AgentBadge';

const AppHeader = () => {
    const { xid } = useParams();
    const navigate = useNavigate();

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userId, setUserId] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const [aboutOpen, setAboutOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

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

    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                const response = await axios.get(`/check-auth`);
                const check = response.data;

                if (check.isAuthenticated) {
                    setIsAuthenticated(true);
                    setUserId(check.userId);
                    setIsAdmin(check.isAdmin);
                } else {
                    setIsAuthenticated(false);
                    setIsAdmin(false);
                }
            } catch (error) {
                console.error('Error fetching authentication status:', error);
                setIsAuthenticated(false);
                setIsAdmin(false);
            }
        };

        checkAuthStatus();
    }, []);

    const handleLogin = () => {
        navigate('/login');
    };

    const handleLogout = async () => {
        await axios.get('/logout');
        navigate('/logout');
    };

    const handleGettingStartedClick = async () => {
        window.open('https://github.com/macterra/artx-market/wiki/Getting-Started', '_blank');
    };

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Button color="inherit" onClick={() => navigate('/')}>
                        <img src="/artx-logo-64.png" alt="Logo" style={{ marginRight: '10px' }} /> ArtX
                    </Button>
                    {userId && (
                        xid === userId ? (
                            <Button color="inherit" onClick={() => navigate(`/profile/edit/`)}>
                                Settings
                            </Button>
                        ) : (
                            <AgentBadge xid={userId} fontSize={'.6em'} />
                        )
                    )}
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        &nbsp;
                    </Typography>
                    {!isAuthenticated && (
                        <Button color="inherit" onClick={handleLogin}>
                            Login
                        </Button>
                    )}
                    <Button
                        color="inherit"
                        aria-controls="help-menu"
                        aria-haspopup="true"
                        onClick={handleHelpMenuClick}>☰</Button>
                    <Menu
                        id="help-menu"
                        anchorEl={anchorEl}
                        keepMounted
                        open={Boolean(anchorEl)}
                        onClose={handleHelpMenuClose}
                    >
                        {isAdmin && <MenuItem onClick={() => navigate('/admin')}>Admin</MenuItem>}
                        <MenuItem onClick={handleGettingStartedClick}>Getting Started</MenuItem>
                        <MenuItem onClick={handleAboutClick}>About</MenuItem>
                        {isAuthenticated && <MenuItem onClick={handleLogout}>Logout</MenuItem>}
                    </Menu>
                </Toolbar>
            </AppBar>
            <Dialog onClose={handleAboutClose} open={aboutOpen}>
                <DialogTitle>About ArtX Market</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        The ArtX Market enables digital artists to showcase their work with curated collections,
                        and collectors to trade the art using <a href="https://bitcoin.org/" target="_blank" rel="noopener noreferrer">Bitcoin</a>/
                        <a href="https://lightning.network/" target="_blank" rel="noopener noreferrer">Lightning⚡</a>.
                        <p />
                        Tokens may be minted with 1-100 limited editions (NFTs), each tradeable and owned individually.
                        NFT ownership is securely registered on the Bitcoin blockchain
                        and <a href="https://ipfs.tech/" target="_blank" rel="noopener noreferrer">IPFS network</a>.
                    </DialogContentText>
                    <DialogContentText>
                        <BuildTime />
                    </DialogContentText>
                    <DialogContentText>
                        <p>open sourced on github:
                            <a href="https://github.com/macterra/artx-market" target="_blank" rel="noopener noreferrer">
                                macterra/artx-market
                            </a>
                        </p>
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
