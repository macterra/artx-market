import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProfileCard from './ProfileCard';

const ProfileGrid = ({ collection }) => {
    const [profiles, setProfiles] = useState([]);

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                setProfiles(collection);
            } catch (error) {
                console.error('Error fetching image metadata:', error);
            }
        };
        fetchAssets();
    }, [collection]);

    if (!profiles) {
        return <p>Loading profiles...</p>;
    }

    const imageCardStyle = {
        margin: '8px', // Add a margin around the ImageCard components
        textDecoration: 'none', // Remove the text decoration from the Link component
    };

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'left' }}>
            {profiles.map((profile, index) => (
                <Link key={index} to={`/profile/${profile.id}`} style={imageCardStyle}>
                    <ProfileCard key={index} profile={profile} />
                </Link>
            ))}
        </div>
    );
};

export default ProfileGrid;
