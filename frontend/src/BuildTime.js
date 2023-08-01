
import React from 'react';

const BuildTime = () => {

    const buildDate = new Date(process.env.REACT_APP_BUILD_TIME);

    const year = buildDate.getFullYear();
    const month = String(buildDate.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed in JavaScript
    const day = String(buildDate.getDate()).padStart(2, '0');
    const hours = String(buildDate.getHours()).padStart(2, '0');
    const minutes = String(buildDate.getMinutes()).padStart(2, '0');
    const seconds = String(buildDate.getSeconds()).padStart(2, '0');

    const localBuildTime = `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;

    return (
        <div className="build-time">
            <p>Build Time: {localBuildTime}</p>
        </div>
    );
};

export default BuildTime;
