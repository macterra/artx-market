
import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Tab, Tabs } from '@mui/material';
import CollectionEditor from './CollectionEditor';

const ProfileEditor = ({ navigate }) => {
    const [profile, setProfile] = useState({});
    const [name, setName] = useState('');
    const [tagline, setTagline] = useState('');
    const [address, setAddress] = useState('');
    const [invoice, setInvoice] = useState(null);
    const [tab, setTab] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(`/api/profile`);
                const data = await response.json();
                setProfile(data);
                setName(data.name);
                setTagline(data.tagline);
                setAddress(data.deposit);
                setTab("name");
            } catch (error) {
                console.error('Error fetching profile data:', error);
                //navigate('/');
            }
        };

        fetchProfile();
    }, []);

    const handleSaveClick = async () => {
        try {
            const response = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ name: name, tagline: tagline }),
            });

            if (response.ok) {
                profile.name = name;
                profile.tagline = tagline;
            } else {
                const data = await response.json();
                console.error('Error updating profile:', data.message);
                alert(data.message);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    const handleSaveAddress = async () => {
        try {
            const response = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ deposit: address }),
            });

            if (response.ok) {
                profile.deposit = address;
            } else {
                const data = await response.json();
                console.error('Error updating profile:', data.message);
                alert(data.message);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    const handleTestAddress = async () => {
        try {
            const response = await fetch(`/api/profile/${profile.xid}/invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ amount: 10 }),
            });

            if (response.ok) {
                const data = await response.json();
                setInvoice(`lightning:${data.invoice}`);
            } else {
                const data = await response.json();
                console.error('Error:', data.message);
                alert(data.message);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    return (
        <Box>
            <h2>Edit Profile</h2>
            <Tabs
                value={tab}
                onChange={(event, newTab) => { setTab(newTab) }}
                indicatorColor="primary"
                textColor="primary"
                variant="scrollable"
                scrollButtons="auto"
            >
                <Tab key="name" value="name" label={'Name'} />
                <Tab key="coll" value="coll" label={'Collections'} />
                <Tab key="links" value="links" label={'Links'} />
                <Tab key="ln" value="ln" label={'Lightning'} />
            </Tabs>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Box style={{ width: '50vw' }}>
                    {tab === 'name' &&
                        <form>
                            <TextField
                                label="Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                fullWidth
                                margin="normal"
                            />
                            <TextField
                                label="Tagline"
                                value={tagline}
                                onChange={(e) => setTagline(e.target.value)}
                                fullWidth
                                margin="normal"
                            />
                            <Button variant="contained" color="primary" onClick={handleSaveClick}>
                                Save
                            </Button>
                        </form>
                    }
                    {tab === 'coll' &&
                        <CollectionEditor />
                    }
                    {tab === 'ln' &&
                        <form>
                            <TextField
                                label="Lightning Address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                fullWidth
                                margin="normal"
                            />
                            <Button variant="contained" color="primary" onClick={handleSaveAddress}>
                                Save
                            </Button>
                            {address &&
                                <Button variant="contained" color="primary" onClick={handleTestAddress}>
                                    Test
                                </Button>
                            }
                            {invoice &&
                                <div>
                                    <a href={invoice}>zap!</a>
                                </div>
                            }
                        </form>
                    }
                </Box>
            </div>
        </Box >
    );
};

export default ProfileEditor;
