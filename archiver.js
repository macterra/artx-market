const axios = require('axios');
const config = require('./config');

async function register(xid, cid) {
    try {
        const response = await axios.post(`${config.archiver}/api/v1/register`, { xid: xid, cid: cid });
        return response.data.txid;
    }
    catch (error) {
        console.error(`register error: ${error}`);
    }
}

async function notarize(xid, cid) {
    try {
        const response = await axios.post(`${config.archiver}/api/v1/notarize`, { xid: xid, cid: cid });
        return response.data.txid;
    }
    catch (error) {
        console.error(`notarize error: ${error}`);
    }
}

module.exports = {
    notarize,
    register,
};
