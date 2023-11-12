const path = require('path');
const fs = require('fs');
const realConfig = require('./config');
const utils = require('./utils');
const archiver = require('./archiver');

function getAdmin(config = realConfig) {
    const jsonPath = path.join(config.data, 'meta.json');

    // Check if the agent.json file exists
    if (!fs.existsSync(jsonPath)) {
        const newXid = utils.getMarketId(config);

        return {
            name: config.name || config.host,
            xid: newXid,
            xid58: utils.uuidToBase58(newXid),
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
        };
    }

    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const jsonData = JSON.parse(jsonContent);
    const cidPath = path.join(config.data, "CID");

    if (fs.existsSync(cidPath)) {
        jsonData.cid = fs.readFileSync(cidPath, 'utf-8').trim();
    }

    return jsonData;
}

function saveAdmin(adminData, config = realConfig) {

    const jsonPath = path.join(config.data, 'meta.json');
    adminData.updated = new Date().toISOString();
    fs.writeFileSync(jsonPath, JSON.stringify(adminData, null, 2));

    return adminData;
}

async function registerState(adminState, config = realConfig) {

    adminState = saveAdmin(adminState, config);
    adminState.pending = await archiver.register(adminState.xid, adminState.cid);
    adminState = saveAdmin(adminState, config);

    return adminState;
}

async function notarizeState(adminState, maxFee = 10, config = realConfig) {

    adminState = saveAdmin(adminState, config);
    adminState.pending = await archiver.notarize(adminState.xid, adminState.cid, maxFee);
    adminState = saveAdmin(adminState, config);

    return adminState;
}

async function certifyState(adminState, config = realConfig) {

    if (adminState.pending) {
        const cert = await archiver.certify(adminState.pending);

        if (cert?.xid) {
            const certPath = path.join(config.certs, cert.xid);
            fs.mkdirSync(certPath, { recursive: true });
            const certFile = path.join(certPath, 'meta.json');
            fs.writeFileSync(certFile, JSON.stringify(cert, null, 2));

            adminState.latest = cert.xid;
            adminState.pending = null;

            adminState = saveAdmin(adminState, config);
        }
    }

    return adminState;
}

async function getWalletInfo() {
    const walletinfo = await archiver.walletinfo();
    return walletinfo;
}

function getAuditLog(config = realConfig) {
    try {
        const jsonlPath = path.join(config.data, 'auditlog.jsonl');
        const data = fs.readFileSync(jsonlPath, 'utf-8');
        const lines = data.trim().split('\n');
        const log = lines.map(line => JSON.parse(line));
        return log.reverse();
    } catch (error) {
        return [];
    }
}

function saveAuditLog(record, config = realConfig) {
    record.time = new Date().toISOString();
    const recordString = JSON.stringify(record);
    const jsonlPath = path.join(config.data, 'auditlog.jsonl');
    fs.appendFileSync(jsonlPath, recordString + '\n');
}

function getCert(xid, config = realConfig) {
    const certPath = path.join(config.certs, xid, 'meta.json');
    const certContent = fs.readFileSync(certPath, 'utf-8');
    const cert = JSON.parse(certContent);

    cert.block_link = `${config.block_link}/${cert.auth.blockhash}`;
    cert.txn_link = `${config.txn_link}/${cert.auth.tx.txid}`;
    cert.ipfs_link = `${config.ipfs_link}/${cert.auth.cid}`;

    return cert;
}

module.exports = {
    certifyState,
    getAdmin,
    getAuditLog,
    getCert,
    getWalletInfo,
    notarizeState,
    registerState,
    saveAdmin,
    saveAuditLog,
};
