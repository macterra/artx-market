import React from "react";
import { Button } from "@mui/material";

function Footer() {
  const handleDiscordButtonClick = () => {
    const discordInviteLink = "https://discord.gg/RgZsQZqfp";

    window.open(discordInviteLink, "_blank");
  };

  return (
    <footer className="footer">
      <Button color="inherit" onClick={handleDiscordButtonClick}>
        Join Our Discord
      </Button>
    </footer>
  );
}

export default Footer;
