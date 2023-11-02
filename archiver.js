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

// Function to add all changes, commit, and push
async function commitChanges(event) {
    try {
        const commitMessage = JSON.stringify(event);
        const response = await axios.post(`${config.archiver}/api/v1/commit`, { message: commitMessage });
        const commit = response.data;

        if (commit.error) {
            console.error(`Failed to commit changes: ${commit.error}`);
        }
        else if (commit.githash) {
            const hash = commit.githash.substring(0, 8);
            console.log(`Commit: ${commitMessage} (${hash})`);
            pushChanges();
            return commit.githash;
        }
    }
    catch (error) {
        console.error('Failed to commit changes:', error.data.error);
    }
}

async function pushChanges() {
    try {
        const response = await axios.get(`${config.archiver}/api/v1/push`);
        const push = response.data;

        if (push.error) {
            console.error(`Failed to push changes: ${push.error}`);
        }
    }
    catch (error) {
        console.error('Failed to push changes:', error);
    }
}

async function getLogs() {
    try {
        const response = await axios.get(`${config.archiver}/api/v1/logs`);
        const data = response.data;

        if (data.error) {
            console.error(`Failed to get logs: ${data.error}`);
        }
        else {
            return data.logs;
        }
    }
    catch (error) {
        console.error(`Failed to get logs: ${error}`);
    }
}

module.exports = {
    certify,
    commitChanges,
    getLogs,
    notarize,
    ready,
    register,
    walletinfo,
};
