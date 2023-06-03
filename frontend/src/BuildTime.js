
import React from 'react';

const BuildTime = () => {
    const localBuildTime = new Date(process.env.REACT_APP_BUILD_TIME).toLocaleString('en-GB');

    return (
        <div className="build-time">
            <p>Build Time: {localBuildTime}</p>
        </div>
    );
};

export default BuildTime;
