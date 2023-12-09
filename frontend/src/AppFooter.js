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

  const logoStyle = { marginLeft: '10px', height: '32px' };

  return (
    <footer className="footer">
      <Button color="inherit" onClick={() => openTab(config.discordLink)}>
        Join our discord <img src="/discord-mark-white.png" alt="Discord" style={logoStyle} />
      </Button>
      <Button color="inherit" onClick={() => openTab(config.issuesLink)}>
        Report an issue <img src="/github-mark-white.png" alt="Github" style={logoStyle} />
      </Button>
      <Button color="inherit" onClick={() => openTab(config.followLink)}>
        Follow us <img src="/xcom-mark-white.png" alt="X.com" style={logoStyle} />
      </Button>
    </footer>
  );
}

export default AppFooter;
