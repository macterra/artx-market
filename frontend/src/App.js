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
import LoginView from "./LoginView";
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
                    <Route path="/login" element={<ViewLogin />} />
                    <Route path="/logout" element={<NotFound />} />
                    <Route path="/admin" element={<ViewAdmin />} />
                    <Route path="/cert/:xid" element={<ViewCert />} />
                    <Route path="/profile/:userId" element={<ViewProfile />} />
                    <Route path="/profile/edit/:jump?" element={<EditProfile />} />
                    <Route path="/collection/:xid" element={<ViewCollection />} />
                    <Route path="/asset/:xid" element={<ViewAsset />} />
                    <Route path="/nft/:xid" element={<ViewNft />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Router>
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
                <header className="App-header">
                    <AppHeader navigate={navigate} />
                </header>
                <main className="App-content">
                    <MainView navigate={navigate} />
                </main>
                <footer className="App-footer">
                    <Footer />
                </footer>
            </div>
        </ThemeProvider>
    );
}

function ViewLogin() {
    const navigate = useNavigate();

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <div className="App">
                <header className="App-header">
                    <AppHeader navigate={navigate} />
                </header>
                <main className="App-content">
                    <LoginView navigate={navigate} />
                </main>
                <footer className="App-footer">
                    <Footer />
                </footer>
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
                <header className="App-header">
                    <AppHeader navigate={navigate} xid={userId} />
                </header>
                <main className="App-content">
                    <ProfileHeader
                        navigate={navigate}
                        userId={userId}
                        refreshProfile={refreshProfile}
                    />
                    <ProfileView
                        navigate={navigate}
                        setRefreshProfile={setRefreshProfile}
                    />
                </main>
                <footer className="App-footer">
                    <Footer />
                </footer>
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
                <header className="App-header">
                    <AppHeader navigate={navigate} />
                </header>
                <main className="App-content">
                    <ProfileEditor
                        navigate={navigate}
                        refreshProfile={refreshProfile}
                        setRefreshProfile={setRefreshProfile}
                    />
                </main>
                <footer className="App-footer">
                    <Footer />
                </footer>
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
                <header className="App-header">
                    <AppHeader navigate={navigate} />
                </header>
                <main className="App-content">
                    <CollectionView navigate={navigate} />
                </main>
                <footer className="App-footer">
                    <Footer />
                </footer>
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
                <header className="App-header">
                    <AppHeader navigate={navigate} />
                </header>
                <main className="App-content">
                    <AssetView navigate={navigate} />
                </main>
                <footer className="App-footer">
                    <Footer />
                </footer>
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
                <header className="App-header">
                    <AppHeader navigate={navigate} />
                </header>
                <main className="App-content">
                    <NftView navigate={navigate} />
                </main>
                <footer className="App-footer">
                    <Footer />
                </footer>
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
                <header className="App-header">
                    <AppHeader navigate={navigate} />
                </header>
                <main className="App-content">
                    <AdminView navigate={navigate} />
                </main>
                <footer className="App-footer">
                    <Footer />
                </footer>
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
                <header className="App-header">
                    <AppHeader navigate={navigate} />
                </header>
                <main className="App-content">
                    <CertView navigate={navigate} />
                </main>
                <footer className="App-footer">
                    <Footer />
                </footer>
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
