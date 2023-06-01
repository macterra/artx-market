
import React from 'react';
import './BuildTime.css';

const BuildTime = () => {
    const localBuildTime = new Date(process.env.REACT_APP_BUILD_TIME).toLocaleString();

    return (
        <div className="build-time">
            <p>Build Time: {localBuildTime}</p>
        </div>
    );
};

export default BuildTime;