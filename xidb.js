const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

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
    const agentFolder = path.join(config.agents, userId.toString());
    const agentJsonPath = path.join(agentFolder, 'agent.json');

    let agentData = {};

    // Check if the agent.json file exists
    if (fs.existsSync(agentJsonPath)) {
        const agentJsonContent = await fs.promises.readFile(agentJsonPath, 'utf-8');
        agentData = JSON.parse(agentJsonContent);
    } else if (doCreate) {

        const gallery = await createCollection(userId, 'gallery');

        agentData = {
            id: userId,
            name: 'anon',
            tagline: '',
            description: '',
            collections: [ gallery.asset.xid ],
        };

        await saveAgent(agentData);
    }

    return agentData;
};

const saveAgent = async (agentData) => {
    const agentFolder = path.join(config.agents, agentData.id);
    const agentJsonPath = path.join(agentFolder, 'agent.json');

    if (!fs.existsSync(agentFolder)) {
        fs.mkdirSync(agentFolder);
    }

    agentData.updated = new Date().toISOString();
    await fs.promises.writeFile(agentJsonPath, JSON.stringify(agentData, null, 2));
};

const agentGetAssets = async (userId) => {
    const agentFolder = path.join(config.agents, userId);
    const jsonPath = path.join(agentFolder, 'assets.json');

    let assetData = {};

    // Check if the agent.json file exists
    if (fs.existsSync(jsonPath)) {
        const jsonContent = await fs.promises.readFile(jsonPath, 'utf-8');
        assetData = JSON.parse(jsonContent);
    }
    else {
        assetData.owner = userId;
        assetData.created = [];
        assetData.collected = [];
    }

    return assetData;
};

const agentSaveAssets = async (assetData) => {
    const agentFolder = path.join(config.agents, assetData.owner);
    const jsonPath = path.join(agentFolder, 'assets.json');

    assetData.updated = new Date().toISOString();

    await fs.promises.writeFile(jsonPath, JSON.stringify(assetData, null, 2));
};

const agentAddAsset = async (metadata) => {
    let assetData = await agentGetAssets(metadata.asset.owner);

    if (metadata.file) {
        assetData.created.push(metadata.asset.xid);
    } else {
        assetData.collected.push(metadata.asset.xid);
    }

    await agentSaveAssets(assetData);
};

const getAgentAndCollections = async (profileId, userId) => {
    if (!profileId) {
        profileId = userId;
    }

    if (!profileId) {
        return;
    }

    let agentData = await getAgent(profileId, false);
    const assets = await agentGetAssets(profileId);

    let collections = {};

    for (const collectionId of agentData.collections) {
        let collectionData = await getAsset(collectionId);
        collectionData.collection.assets = [];
        collections[collectionId] = collectionData;
    }

    let deleted = {};
    deleted.assets = [];

    if (profileId === userId) {
        for (const assetId of assets.created) {
            let assetData = await getAsset(assetId);
    
            if (assetData.asset.collection in collections) {
                collections[assetData.asset.collection].collection.assets.push(assetData);
            } else {
                deleted.assets.push(assetData);
            }
        }
    }
    else {
        for (const assetId of assets.created) {
            let assetData = await getAsset(assetId);
    
            if (assetData.token && assetData.asset.collection in collections) {
                collections[assetData.asset.collection].collection.assets.push(assetData);
            } 
        }
    }

    for (let xid in collections) {
        const count = collections[xid].collection.assets.length;

        if (count > 0 && !collections[xid].thumbnail) {
            collections[xid].thumbnail = collections[xid].collection.assets[0].file.path;
        }
    }

    if (profileId !== userId) {
        for (let xid in collections) {
            const count = collections[xid].collection.assets.length;

            if (count === 0) {
                delete collections[xid];
            }
        }
    }

    let tokens = {};
    
    for (const assetId of assets.collected) {
        const editionData = await getAsset(assetId);
        const tokenId = editionData.nft.asset;

        if (!(tokenId in tokens)) {
            tokens[tokenId] = await getAsset(tokenId);
        }
    }

    agentData.collections = collections;
    agentData.collected = tokens;
    
    if (profileId === userId) {
        agentData.deleted = deleted;
    }

    return agentData;
};

const getCollection = async (collectionId, userId) => {
    let collection = await getAsset(collectionId);

    const agentData = await getAgentAndCollections(collection.asset.owner, userId);    
    collection = agentData.collections[collectionId];    
    
    collection.isOwnedByUser = (userId == collection.asset.owner);

    return collection;
};

const getAsset = async (xid) => {
    let metadata = null;

    try {
        const metadataPath = path.join(config.assets, xid, 'meta.json');
        const metadataContent = await fs.promises.readFile(metadataPath, 'utf-8');
        metadata = JSON.parse(metadataContent);
    } catch (error) {
    }

    return metadata;
};

const saveAsset = async (metadata) => {
    const current = await getAsset(metadata.asset.xid);

    if (JSON.stringify(metadata) == JSON.stringify(current)) {
        return;
    }

    const assetFolder = path.join(config.assets, metadata.asset.xid);
    const assetJsonPath = path.join(assetFolder, 'meta.json');

    if (!fs.existsSync(assetFolder)) {
        fs.mkdirSync(assetFolder);
    }

    metadata.asset.updated = new Date().toISOString();
    await fs.promises.writeFile(assetJsonPath, JSON.stringify(metadata, null, 2));
};

function gitHash(fileBuffer) {
    const hasher = crypto.createHash('sha1');
    hasher.update('blob ' + fileBuffer.length + '\0');
    hasher.update(fileBuffer);
    return hasher.digest('hex');
}

const createAssets = async (userId, files, collectionId) => {
    const collectionData = await getAsset(collectionId);
    const defaultTitle = collectionData.collection.default.title;
    let collectionCount = collectionData.collection.assets.length;

    for (const file of files) {
        const xid = uuidv4();

        // Calculate the Git hash
        const fileBuffer = fs.readFileSync(file.path);
        const fileHash = gitHash(fileBuffer);

        // Create the subfolder
        const assetFolder = path.join(config.assets, xid);
        if (!fs.existsSync(assetFolder)) {
            fs.mkdirSync(assetFolder);
        }

        // Move the file to the subfolder and rename it to "_"
        const assetName = '_' + path.extname(file.originalname);
        const newPath = path.join(assetFolder, assetName);
        fs.renameSync(file.path, newPath);

        // Get image metadata using sharp
        const imageMetadata = await sharp(newPath).metadata();

        let title = 'untitled';

        if (defaultTitle) {
            collectionCount += 1;
            title = defaultTitle.replace("%N%", collectionCount);
        }

        // Create the metadata object
        const metadata = {
            asset: {
                xid: xid,
                owner: userId,
                title: title,
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                collection: collectionId,
            },
            file: {
                fileName: assetName,
                originalName: file.originalname,
                size: file.size,
                hash: fileHash,
                path: `/${config.assets}/${xid}/${assetName}`,
            },
            image: {
                width: imageMetadata.width,
                height: imageMetadata.height,
                depth: imageMetadata.depth,
                format: imageMetadata.format,
            }
        };

        await saveAsset(metadata);
        //await collectionAddAsset(collectionData.asset.xid, metadata.asset.xid);
        await agentAddAsset(metadata);
    }
};

const createEdition = async (owner, asset, edition, editions) => {
    const xid = uuidv4();
    const assetFolder = path.join(config.assets, xid);
    fs.mkdirSync(assetFolder);

    const metadata = {
        asset: {
            xid: xid,
            owner: owner,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            type: 'nft',
            title: `${edition} of ${editions}`
        },
        nft: {
            asset: asset,
            edition: edition,
            editions: editions,
            price: 0,
        }
    };

    // Write the metadata to meta.json
    const metadataPath = path.join(assetFolder, 'meta.json');
    await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    return xid;
};

const createToken = async (userId, xid, editions) => {
    let assetData = await getAsset(xid);

    const nfts = [];
    for (let i = 1; i <= editions; i++) {
        const createdId = await createEdition(userId, xid, i, editions);
        nfts.push(createdId);
    }

    console.log(nfts);
    let assets = await agentGetAssets(userId);
    assets.collected.push(...nfts);
    agentSaveAssets(assets);

    const mintEvent = {
        type: 'mint',
        agent: userId,
        time: new Date().toISOString(),
    };

    assetData.token = {
        asset: xid, // TBD: add to IPFS here, get cid for NFTs
        royalty: 0.1,
        license: "CC BY-SA",
        editions: editions,
        nfts: nfts,
        history: [mintEvent],
    };

    await saveAsset(assetData);
};

const createCollection = async (userId, name) => {
    const metadata = {
        asset: {
            xid: uuidv4(),
            owner: userId,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            title: name,
        },
        collection: {
            assets: [],
            hidden: false,
            default: {
                title: `${name} #%N%`,
                license: "CC BY-SA",
                editions: 1,
            },
        }
    };

    await saveAsset(metadata);
    return metadata;
};

const collectionAddAsset = async (xid, assetId) => {
    let collection = await getAsset(xid);
    let asset = await getAsset(assetId);

    if (collection.asset.owner == asset.asset.owner) {
        if (!collection.collection.assets.includes(assetId)) {
            collection.collection.assets.push(assetId);
            await saveAsset(collection);
            return true;
        }
    }

    return false;
};

const collectionRemoveAsset = async (xid, assetId) => {
    let collection = await getAsset(xid);
    let asset = await getAsset(assetId);

    if (asset.mint) {
        return false;
    }

    const assetIndex = collection.collection.assets.indexOf(assetId);
    if (assetIndex !== -1) {
        collection.collection.assets.splice(assetIndex, 1);
        await saveAsset(collection);
        return true;
    }

    return false;
};

module.exports = {
    getAgent,
    saveAgent,
    getAgentAndCollections,
    getCollection,
    getAsset,
    saveAsset,
    createAssets,
    createToken,
    createCollection,
    collectionAddAsset,
    collectionRemoveAsset,
};
