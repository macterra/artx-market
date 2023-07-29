import React, { useState, useEffect } from 'react';
import { Box, Button, Table, TableBody, TableRow, TableCell } from '@mui/material';

const AdminView = ({ navigate }) => {

    const [admin, setAdmin] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`/api/v1/admin`);

                if (response.status === 401) {
                    navigate('/');
                    return;
                }

                const admin = await response.json();
                setAdmin(admin);
            } catch (error) {
                console.error('Error fetching admin data:', error);
            }
        };

        fetchData();
    }, [navigate]);

    if (!admin) {
        return <p>Loading...</p>;
    }

    const handleClaim = async () => {
        try {
            const response = await fetch('/api/v1/admin/claim');
            const admin = await response.json();
            setAdmin(admin);
        } catch (error) {
            console.error('Error fetching admin data:', error);
        }
    };

    const handleSave = async () => {
        try {
            const response = await fetch('/api/v1/admin/save');
            const admin = await response.json();
            setAdmin(admin);
        } catch (error) {
            console.error('Error fetching admin data:', error);
        }
    };

    return (
        <Box>
            <h1>Admin</h1>
            {!admin.owner &&
                <Button variant="contained" color="primary" onClick={handleClaim}>
                    Claim Admin
                </Button>
            }
            {admin.owner &&
                <Box>
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell>XID</TableCell>
                                <TableCell>{admin.xid}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Owner</TableCell>
                                <TableCell>{admin.owner}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Created</TableCell>
                                <TableCell>{admin.created}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Updated</TableCell>
                                <TableCell>{admin.updated}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Githash</TableCell>
                                <TableCell>{admin.githash}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>CID</TableCell>
                                <TableCell>{admin.cid}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                    <Button variant="contained" color="primary" onClick={handleSave}>
                        Save All
                    </Button>
                </Box>
            }
        </Box>
    );
};

export default AdminView;
