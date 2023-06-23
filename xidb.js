const path = require('path');
const fs = require('fs');

const config = {
    host: process.env.ARTX_HOST || 'localhost',
    port: process.env.ARTX_PORT || 5000,
    url: null,
    data: 'data',
    uploads: 'data/uploads',
    assets: 'data/assets',
    agents: 'data/agents',
};

const getAgent = async (userId, doCreate) => {
    const userFolder = path.join(config.agents, userId.toString());
    const agentJsonPath = path.join(userFolder, 'agent.json');

    let agentData = {};

    // Check if the agent.json file exists
    if (fs.existsSync(agentJsonPath)) {
        const agentJsonContent = await fs.promises.readFile(agentJsonPath, 'utf-8');
        agentData = JSON.parse(agentJsonContent);
    } else if (doCreate) {
        agentData = {
            id: userId,
            name: 'anon',
            tagline: '',
            description: '',
            defaultCollection: 0,
            uploads: [],
            collections: [{ name: 'uploads', description: '' }],
        };

        ensureFolderExists(userFolder);
        await fs.promises.writeFile(agentJsonPath, JSON.stringify(agentData, null, 2));
    }

    return agentData;
};

const saveAgent = async (agentData) => {
    const userFolder = path.join(config.agents, agentData.id);
    const agentJsonPath = path.join(userFolder, 'agent.json');

    await fs.promises.writeFile(agentJsonPath, JSON.stringify(agentData, null, 2));
};

const getAssets = async (userId) => {
    const userFolder = path.join(config.agents, userId.toString());
    const jsonPath = path.join(userFolder, 'assets.json');
    let assetData = [];

    if (fs.existsSync(jsonPath)) {
        const jsonContent = await fs.promises.readFile(jsonPath, 'utf-8');
        assetData = JSON.parse(jsonContent);
    }

    return assetData;
}

const addAssetToUploads = async (userId, asset) => {
    let assetData = await getAssets(userId);

    assetData.push(asset);

    const jsonPath = path.join(config.agents, userId, 'assets.json');
    await fs.promises.writeFile(jsonPath, JSON.stringify(assetData, null, 2));
};

const getCollection = async (userId, collectionIndex) => {
    const assets = await getAssets(userId);
    const assetsInCollection = [];

    for (const assetId of assets) {
        const assetMetadata = await readAssetMetadata(assetId);
        const assetCollection = assetMetadata.asset.collection || 0;

        if (collectionIndex === assetCollection) {
            assetsInCollection.push(assetMetadata);
        }
    }

    return assetsInCollection;
}

module.exports = {
    getAgent,
    saveAgent,
    getAssets,
    addAssetToUploads,
    getCollection,
};