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

function CommonLayout({ children }) {
    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <div className="App">
                <header className="App-header">
                    <AppHeader />
                </header>
                <main className="App-content">
                    {children}
                </main>
                <footer className="App-footer">
                    <Footer />
                </footer>
            </div>
        </ThemeProvider>
    );
}

function Home() {
    return (
        <CommonLayout>
            <MainView />
        </CommonLayout>
    )
}

function ViewLogin() {
    return (
        <CommonLayout>
            <LoginView />
        </CommonLayout>
    )
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
    return (
        <CommonLayout>
            <CollectionView />
        </CommonLayout>
    )
}

function ViewAsset() {
    return (
        <CommonLayout>
            <AssetView />
        </CommonLayout>
    )
}

function ViewNft() {
    return (
        <CommonLayout>
            <NftView />
        </CommonLayout>
    )
}

function ViewAdmin() {
    return (
        <CommonLayout>
            <AdminView />
        </CommonLayout>
    )
}

function ViewCert() {
    return (
        <CommonLayout>
            <CertView />
        </CommonLayout>
    )
}

function NotFound() {
    const navigate = useNavigate();

    useEffect(() => {
        navigate("/");
    });
}

export default App;
