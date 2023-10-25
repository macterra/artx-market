import React, { useState, useEffect } from "react";
import {
  useNavigate,
  useParams,
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import AppHeader from "./AppHeader";
import MainView from "./MainView";
import ProfileEditor from "./ProfileEditor";
import AssetView from "./AssetView";
import NftView from "./NftView";
import ProfileHeader from "./ProfileHeader";
import ProfileView from "./ProfileView";
import CollectionView from "./CollectionView";
import AdminView from "./AdminView";
import CertView from "./CertView";
import Footer from "./Footer";

import "./App.css";

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin/" element={<ViewAdmin />} />
          <Route path="/cert/:xid" element={<ViewCert />} />
          <Route path="/profile/:userId" element={<ViewProfile />} />
          <Route path="/profile/edit/:jump?" element={<EditProfile />} />
          <Route path="/collection/:xid" element={<ViewCollection />} />
          <Route path="/asset/:xid/" element={<ViewAsset />} />
          <Route path="/nft/:xid/" element={<ViewNft />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      <Footer />
    </>
  );
}

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

function Home() {
  const navigate = useNavigate();

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <AppHeader navigate={navigate} />
        <header className="App-header">
          <MainView navigate={navigate} />
        </header>
      </div>
    </ThemeProvider>
  );
}

function ViewProfile() {
  const { userId } = useParams();
  const [refreshProfile, setRefreshProfile] = useState(null);
  const navigate = useNavigate();

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <AppHeader navigate={navigate} xid={userId} />
        <header className="App-header">
          <Box display="flex" flexDirection="column" flexGrow={1}>
            <ProfileHeader
              navigate={navigate}
              userId={userId}
              refreshProfile={refreshProfile}
            />
            <ProfileView
              navigate={navigate}
              setRefreshProfile={setRefreshProfile}
            />
          </Box>
        </header>
      </div>
    </ThemeProvider>
  );
}

function ViewCollection() {
  const navigate = useNavigate();

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <AppHeader navigate={navigate} />
        <header className="App-header">
          <Box display="flex" flexDirection="column" flexGrow={1}>
            <CollectionView navigate={navigate} />
          </Box>
        </header>
      </div>
    </ThemeProvider>
  );
}

function EditProfile() {
  const [refreshProfile, setRefreshProfile] = useState(null);
  const navigate = useNavigate();

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <AppHeader navigate={navigate} />
        <header className="App-header">
          <Box display="flex" flexDirection="column" flexGrow={1}>
            <ProfileEditor
              navigate={navigate}
              refreshProfile={refreshProfile}
              setRefreshProfile={setRefreshProfile}
            />
          </Box>
        </header>
      </div>
    </ThemeProvider>
  );
}

function ViewAsset() {
  const navigate = useNavigate();

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <AppHeader navigate={navigate} />
        <header className="App-header">
          <AssetView navigate={navigate} />
        </header>
      </div>
    </ThemeProvider>
  );
}

function ViewNft() {
  const navigate = useNavigate();

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <AppHeader navigate={navigate} />
        <header className="App-header">
          <NftView navigate={navigate} />
        </header>
      </div>
    </ThemeProvider>
  );
}

function ViewAdmin() {
  const navigate = useNavigate();

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <AppHeader navigate={navigate} />
        <header className="App-header">
          <AdminView navigate={navigate} />
        </header>
      </div>
    </ThemeProvider>
  );
}

function ViewCert() {
  const navigate = useNavigate();

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <AppHeader navigate={navigate} />
        <header className="App-header">
          <CertView navigate={navigate} />
        </header>
      </div>
    </ThemeProvider>
  );
}

function NotFound() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/");
  });
}

export default App;
