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

async function certify(txid) {
    try {
        const response = await axios.post(`${config.archiver}/api/v1/certify`, { txid: txid });
        return response.data;
    }
    catch (error) {
        console.error(`certify error: ${error}`);
    }
}

async function walletinfo() {
    try {
        const response = await axios.get(`${config.archiver}/api/v1/walletinfo`);
        return response.data;
    }
    catch (error) {
        console.error(`walletinfo error: ${error}`);
    }
}

async function ready() {
    try {
        const response = await axios.get(`${config.archiver}/api/v1/ready`);
        return response.data.ready;
    }
    catch (error) {
        console.error(`walletinfo error: ${error}`);
    }
}

module.exports = {
    certify,
    notarize,
    ready,
    register,
    walletinfo,
};
