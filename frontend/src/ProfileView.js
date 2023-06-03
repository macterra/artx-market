
import React, { useState, useEffect } from 'react';

const ProfileView = ({ userId }) => {
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(`/api/profile${userId ? `?userId=${userId}` : ''}`);
                const data = await response.json();
                setProfile(data);
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
        };

        fetchProfile();
    }, [userId]);

    if (!profile) {
        return <p>Loading profile...</p>;
    }

    return (
        <div>
            {profile.pfp && (
                <img
                    src={profile.pfp}
                    alt="Profile pic"
                    style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                />
            )}
            <h2>{profile.name}</h2>
            <p>{profile.tagline}</p>
        </div>
    );
};

export default ProfileView;