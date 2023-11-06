const path = require('path');
const fs = require('fs');

const utils = require('./utils');
const realConfig = require('./config');

async function createAgent(key, config = realConfig) {
    const userId = utils.getAgentId(key, config);

    agentData = {
        xid: userId,
        pubkey: key,
        name: config.newUser,
        tagline: '',
        description: '',
        credits: config.initialCredits,
        depositToCredits: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
    };

    saveAgent(agentData, config);

    return agentData;
}

function getAgent(xid, config = realConfig) {
    const agentJsonPath = path.join(config.agents, xid, 'agent.json');

    if (!fs.existsSync(agentJsonPath)) {
        return null;
    }

    const agentJsonContent = fs.readFileSync(agentJsonPath, 'utf-8');
    const agentData = JSON.parse(agentJsonContent);

    return agentData;
}

function saveAgent(agentData, config = realConfig) {
    const agentFolder = path.join(config.agents, agentData.xid);
    const agentJsonPath = path.join(agentFolder, 'agent.json');

    if (!fs.existsSync(agentFolder)) {
        fs.mkdirSync(agentFolder);
    }

    agentData.updated = new Date().toISOString();
    fs.writeFileSync(agentJsonPath, JSON.stringify(agentData, null, 2));
}

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
        //console.debug(`removeAsset: unknown asset type ${metadata.xid}`);
        return;
    }

    saveAssets(assets, config);
}

function getTxnLog(xid, config = realConfig) {
    try {
        const jsonlPath = path.join(config.agents, xid, 'txnlog.jsonl');
        const data = fs.readFileSync(jsonlPath, 'utf-8');
        const lines = data.trim().split('\n');
        const log = lines.map(line => JSON.parse(line));
        return log.reverse();
    } catch (error) {
        return [];
    }
}

function saveTxnLog(xid, record, config = realConfig) {
    record.time = new Date().toISOString();
    const recordString = JSON.stringify(record);

    const agentFolder = path.join(config.agents, xid);
    const jsonlPath = path.join(agentFolder, 'txnlog.jsonl');

    if (!fs.existsSync(agentFolder)) {
        fs.mkdirSync(agentFolder);
    }

    fs.appendFileSync(jsonlPath, recordString + '\n');
}

module.exports = {
    addAsset,
    createAgent,
    getAgent,
    getAssets,
    getTxnLog,
    removeAsset,
    saveAgent,
    saveAssets,
    saveTxnLog,
};
