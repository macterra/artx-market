import React from "react";
import { Button } from "@mui/material";

function openTab(url) {
  window.open(url, "_blank");
}

function AppFooter() {
  return (
    <footer className="footer">
      <Button color="inherit" onClick={() => openTab("https://discord.gg/RgZsQZqfp")}>
        Join our discord
      </Button>
      <Button color="inherit" onClick={() => openTab("https://github.com/macterra/artx-market/issues")}>
        Report an issue
      </Button>
      <Button color="inherit" onClick={() => openTab("https://github.com/macterra/artx-market/wiki/Getting-Started")}>
        Getting started
      </Button>
    </footer>
  );
}

export default AppFooter;
