const path = require('path');
const fs = require('fs');

const realConfig = require('./config');

function getAssets(xid, config = realConfig) {
    const agentFolder = path.join(config.agents, xid);
    const jsonPath = path.join(agentFolder, 'assets.json');

    let assets = {};

    if (fs.existsSync(jsonPath)) {
        const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
        assets = JSON.parse(jsonContent);
    }
    else {
        assets.owner = xid;
        assets.created = [];
        assets.collected = [];
        assets.collections = [];
    }

    return assets;
}

function saveAssets(assets, config = realConfig) {
    const agentFolder = path.join(config.agents, assets.owner);
    const jsonPath = path.join(agentFolder, 'assets.json');

    if (!fs.existsSync(agentFolder)) {
        fs.mkdirSync(agentFolder);
    }

    assets.updated = new Date().toISOString();

    fs.writeFileSync(jsonPath, JSON.stringify(assets, null, 2));
}

function addAsset(metadata, config = realConfig) {
    let assets = getAssets(metadata.asset.owner, config);

    if (metadata.file) {
        if (!assets.created.includes(metadata.xid)) {
            assets.created.push(metadata.xid);
        }
    }
    else if (metadata.collection) {
        if (!assets.collections.includes(metadata.xid)) {
            assets.collections.push(metadata.xid);
        }
    }
    else if (metadata.nft) {
        if (!assets.collected.includes(metadata.xid)) {
            assets.collected.push(metadata.xid);
        }
    }
    else {
        //console.log(`addAsset: unknown asset type ${metadata.xid}`);
        return;
    }

    saveAssets(assets, config);
}

function removeAsset(metadata, config = realConfig) {
    let assets = getAssets(metadata.asset.owner, config);

    if (metadata.file) {
        assets.created = assets.created.filter(xid => xid != metadata.xid);
    }
    else if (metadata.collection) {
        assets.collections = assets.collections.filter(xid => xid != metadata.xid);
    }
    else if (metadata.nft) {
        assets.collected = assets.collected.filter(xid => xid != metadata.xid);
    }
    else {
        console.log(`removeAsset: unknown asset type ${metadata.xid}`);
        return;
    }

    saveAssets(assets, config);
}

function getTxnLog(userId, config = realConfig) {
    try {
        const jsonlPath = path.join(config.agents, userId, 'txnlog.jsonl');
        const data = fs.readFileSync(jsonlPath, 'utf-8');
        const lines = data.trim().split('\n');
        const log = lines.map(line => JSON.parse(line));
        return log.reverse();
    } catch (error) {
        return [];
    }
}

module.exports = {
    addAsset,
    getAssets,
    getTxnLog,
    removeAsset,
    saveAssets,
};
