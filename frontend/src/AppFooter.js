import React, { useEffect, useState } from 'react';
import { Button } from "@mui/material";
import axios from 'axios';

function openTab(url) {
  window.open(url, "_blank");
}

function AppFooter() {

  const [config, setConfig] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const getConfig = await axios.get(`/api/v1/config`);
        setConfig(getConfig.data);
      } catch (error) {
        console.error('Error fetching config:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <footer className="footer">
      <Button color="inherit" onClick={() => openTab(config.discordLink)}>
        Join our discord
      </Button>
      <Button color="inherit" onClick={() => openTab(config.issuesLink)}>
        Report an issue
      </Button>
      <Button color="inherit" onClick={() => openTab(config.helpLink)}>
        Getting started
      </Button>
    </footer>
  );
}

export default AppFooter;
