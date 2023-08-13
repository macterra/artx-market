const axios = require('axios');
const path = require('path');
const fs = require('fs');

const config = {
    data: 'data',
    assets: 'data/assets',
    archiver: 'http://localhost:5115'
};

async function testPinEndpoint(xid) {
    const assetPath = path.join(config.data, 'assets', xid);
    try {
        const response = await axios.post(`${config.archiver}/api/v1/pin`, {
            path: assetPath
        });

        if (response.status !== 200) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const ipfs = response.data;
        console.log(xid, ipfs);
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

const assets = fs.readdirSync(config.assets, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

for (const xid of assets) {
    testPinEndpoint(xid);
}
