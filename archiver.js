const axios = require('axios');
const config = require('./config');

async function register(adminState) {
    try {
        const response = await axios.post(`${config.archiver}/api/v1/register`, {
            xid: adminState.xid,
            cid: adminState.cid
        });

        return response.data.txid;
    }
    catch (error) {
        console.error(`archiver.register error: ${error}`);
    }
}

async function notarize(adminState) {
    try {
        const response = await axios.post(`${config.archiver}/api/v1/notarize`, {
            xid: adminState.xid,
            cid: adminState.cid
        });

        return response.data.txid;
    }
    catch (error) {
        console.error(`archiver.notarize error: ${error}`);
    }
}

module.exports = {
    notarize,
    register,
};
