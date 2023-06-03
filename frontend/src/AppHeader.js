
import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import BuildTime from './BuildTime';

const AppHeader = ({ isAuthenticated, handleLogin, handleLogout, navigate }) => {
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
        )
        {isAuthenticated && (
          <Button color="inherit" onClick={() => navigate('/profiles')}>
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
