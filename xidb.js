const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { rimrafSync } = require('rimraf')

const config = {
    host: process.env.ARTX_HOST || 'localhost',
    port: process.env.ARTX_PORT || 5000,
    archiver: process.env.ARCHIVER || 'http://localhost:5115',
    data: 'data',
    uploads: 'data/uploads',
    assets: 'data/assets',
    agents: 'data/agents',
    id: 'data/id',
    credits: 10000,
    uploadRate: process.env.STORAGE_RATE || 0.0001,
    storageRate: process.env.STORAGE_RATE || 0.001,
    editionRate: process.env.EDITION_RATE || 100,
};

// Function to add all changes, commit, and push
const commitChanges = async (commitMessage) => {
    try {
        const response = await fetch(`${config.archiver}/api/v1/commit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify({ message: commitMessage }),
        });

        if (response.ok) {
            const commit = await response.json()

            if (commit.error) {
                console.log(`Failed to commit changes: ${commit.error}`);
            }
            else if (commit.githash) {
                const hash = commit.githash.substring(0, 8);
                console.log(`Commit: ${commitMessage} (${hash})`);
            }
        }
    } catch (err) {
        console.error('Failed to commit changes:', err);
    }
};

const getAdmin = async (xid) => {
    const jsonPath = path.join(config.data, 'meta.json');

    // Check if the agent.json file exists
    if (!fs.existsSync(jsonPath)) {
        return {
            xid: uuidv4(),
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
        };
    }

    const jsonContent = await fs.promises.readFile(jsonPath, 'utf-8');
    const jsonData = JSON.parse(jsonContent);

    return jsonData;
};

const saveAdmin = async (adminData) => {

    const jsonPath = path.join(config.data, 'meta.json');
    adminData.updated = new Date().toISOString();
    // Make sure we have something to commit
    await fs.promises.writeFile(jsonPath, JSON.stringify(adminData, null, 2));

    const response1 = await fetch(`${config.archiver}/api/v1/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({ message: "Save admin" }),
    });

    const commit = await response1.json();
    adminData.githash = commit.githash;

    const response2 = await fetch(`${config.archiver}/api/v1/pin/${config.data}`);
    const ipfs = await response2.json();
    adminData.cid = ipfs.cid;

    await fs.promises.writeFile(jsonPath, JSON.stringify(adminData, null, 2));
    return adminData;
};

async function waitForReady() {
    let isReady = false;

    while (!isReady) {
        try {
            const response = await fetch(`${config.archiver}/api/v1/ready`);
            const data = await response.json();
            isReady = data.ready;

            if (!isReady) {
                console.log('Waiting for Archiver to be ready...');
                await new Promise(resolve => setTimeout(resolve, 1000)); // wait for 5 seconds before checking again
            }
        } catch (error) {
            console.error('Waiting for Archiver to respond...');
            await new Promise(resolve => setTimeout(resolve, 1000)); // wait for 5 seconds before checking again
        }
    }

    console.log('Archiver service is ready!');
}

const integrityCheck = async () => {
    await waitForReady();

    const assets = allAssets();

    for (const [i, xid] of assets.entries()) {
        const asset = await verifyAsset(xid);
        const index = (i + 1).toString().padStart(5, " ");

        if (asset.verified) {
            console.log(`${index} Asset ${xid} ✔`);
        }
        else {
            const asset = await fixAsset(xid);

            if (asset.fixed) {
                console.log(`${index} Asset ${xid} ✔ fixed ${asset.message}`);
            }
            else {
                console.log(`${index} Asset ${xid} ${asset.error}`);
            }
        }
    }

    const agents = allAgents();

    for (const [i, xid] of agents.entries()) {
        const agent = await verifyAgent(xid);
        const index = (i + 1).toString().padStart(5, " ");

        if (agent.verified) {
            console.log(`${index} Agent ${xid} ✔`);
        }
        else {
            const agent = await fixAgent(xid);

            if (agent.fixed) {
                console.log(`${index} Agent ${xid} ✔ fixed ${agent.message}`);
            }
            else {
                console.log(`${index} Agent ${xid} ${agent.error}`);
            }
        }
    }
};

const allAssets = () => {
    const assets = fs.readdirSync(config.assets, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    return assets;
};

const allAgents = () => {
    const agents = fs.readdirSync(config.agents, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    return agents;
};

const verifyAsset = async (xid) => {
    const assetData = await getAsset(xid);
    let error = {
        xid: xid,
        verified: false,
        error: 'invalid fields',
    };

    if (!assetData.xid) {
        return error;
    }

    if (!assetData.asset) {
        return error;
    }

    if (!assetData.asset.owner) {
        return error;
    }

    error.error = 'invalid ownership';
    const agentData = await getAgent(assetData.asset.owner);

    if (!agentData) {
        return error;
    }

    const assets = await agentGetAssets(assetData.asset.owner);

    if (assetData.collection) {
        if (!agentData.collections.includes(xid)) {
            return error;
        }
    }
    else if (assetData.nft) {
        if (!assets.collected.includes(xid)) {
            return error;
        }
    }
    else {
        if (!assets.created.includes(xid)) {
            return error;
        }
    }

    return {
        xid: xid,
        verified: true,
    }
};

const removeAsset = (xid) => {
    const assetPath = path.join(config.assets, xid);

    rimrafSync(assetPath);
    commitChanges(`Removed asset ${xid}`);

    return {
        xid: xid,
        fixed: true,
        message: 'asset removed',
    };
};

const fixAsset = async (xid) => {
    const assetData = await getAsset(xid);

    if (!assetData) {
        return removeAsset(xid);
    }

    if (!assetData.asset) {
        return removeAsset(xid);
    }

    if (!assetData.asset.owner) {
        return removeAsset(xid);
    }

    if (!assetData.xid) {
        if (!assetData.asset.xid || assetData.asset.xid !== xid) {
            return removeAsset(xid);
        }

        assetData.xid = assetData.asset.xid;
        delete assetData.asset.xid;

        await saveAsset(assetData);
        await commitChanges(`Moved xid ${assetData.xid}`);
    }

    const agentData = await getAgent(assetData.asset.owner);

    if (!agentData) {
        return removeAsset(xid);
    }

    const assets = await agentGetAssets(assetData.asset.owner);

    if (assetData.collection) {
        if (!agentData.collections.includes(xid)) {
            agentData.collections.push(xid);
            await saveAgent(agentData);
        }
    }
    else if (assetData.nft) {
        if (!assets.collected.includes(xid)) {
            agentData.collected.push(xid);
            await saveAgent(agentData);
        }
    }
    else {
        if (!assets.created.includes(xid)) {
            agentData.created.push(xid);
            await saveAgent(agentData);
        }
    }

    return {
        xid: xid,
        fixed: true,
        message: "ownership fixed",
    }
};

const verifyAgent = async (xid) => {
    const agentData = await getAgent(xid);

    if (!agentData.credits) {
        return {
            xid: xid,
            verified: false,
            error: 'missing credits',
        };
    }

    const assets = await agentGetAssets(xid);

    const ownershipError = {
        xid: xid,
        verified: false,
        error: 'invalid ownership',
    };

    const typeError = {
        xid: xid,
        verified: false,
        error: 'invalid type',
    };

    for (const collectionId of agentData.collections) {
        const collection = await getAsset(collectionId);

        if (collection.asset.owner !== xid) {
            return ownershipError;
        }

        if (!collection.collection) {
            return typeError;
        }
    }

    for (const assetId of assets.created) {
        const asset = await getAsset(assetId);

        if (asset.asset.owner !== xid) {
            return ownershipError;
        }

        if (!asset.file) {
            return typeError;
        }
    }

    for (const assetId of assets.collected) {
        const asset = await getAsset(assetId);

        if (asset.asset.owner !== xid) {
            return ownershipError;
        }

        if (!asset.nft) {
            return typeError;
        }
    }

    return {
        xid: xid,
        verified: true,
    }
};

const fixAgent = async (xid) => {
    const agentData = await getAgent(xid);
    const assets = await agentGetAssets(xid);

    for (const collectionId of agentData.collections) {
        const collection = await getAsset(collectionId);

        if (collection.asset.owner !== xid) {
            collection.asset.owner = xid;
            await saveAsset(collection);
        }
    }

    for (const assetId of assets.created) {
        const asset = await getAsset(assetId);

        if (asset.asset.owner !== xid) {
            asset.asset.owner = xid;
            await saveAsset(asset);
        }
    }

    for (const assetId of assets.collected) {
        const asset = await getAsset(assetId);

        if (asset.asset.owner !== xid) {
            asset.asset.owner = xid;
            await saveAsset(asset);
        }
    }

    if (!agentData.credits) {
        agentData.credits = config.credits;
        await saveAgent(agentData);
    }

    return {
        xid: xid,
        fixed: true,
        message: "agent fixed",
    }
};

const getAgentFromKey = async (key) => {
    const keyPath = path.join(config.id, 'pubkey.json');
    let keyData = {};

    if (fs.existsSync(keyPath)) {
        const keyJsonContent = await fs.promises.readFile(keyPath, 'utf-8');
        keyData = JSON.parse(keyJsonContent);
    }

    if (!(key in keyData)) {
        keyData[key] = uuidv4();
        await fs.promises.writeFile(keyPath, JSON.stringify(keyData, null, 2));
    }

    const agentId = keyData[key];
    let agentData = await getAgent(agentId);

    if (!agentData) {

        agentData = {
            xid: agentId,
            pubkey: key,
            name: 'anon',
            tagline: '',
            description: '',
            collections: [],
        };

        await saveAgent(agentData);

        const gallery = await createCollection(agentId, 'gallery');
        await saveCollection(gallery);
    }

    return agentData;
};

const getAgent = async (xid) => {
    const agentJsonPath = path.join(config.agents, xid, 'agent.json');

    // Check if the agent.json file exists
    if (!fs.existsSync(agentJsonPath)) {
        return null;
    }

    const agentJsonContent = await fs.promises.readFile(agentJsonPath, 'utf-8');
    const agentData = JSON.parse(agentJsonContent);

    return agentData;
};

const saveAgent = async (agentData) => {
    const agentFolder = path.join(config.agents, agentData.xid);
    const agentJsonPath = path.join(agentFolder, 'agent.json');
    let newAgent = false;

    if (!fs.existsSync(agentFolder)) {
        fs.mkdirSync(agentFolder);
        newAgent = true;
    }

    agentData.updated = new Date().toISOString();
    await fs.promises.writeFile(agentJsonPath, JSON.stringify(agentData, null, 2));

    if (newAgent) {
        await commitChanges(`Created agent ${agentData.xid}`);
    }
    else {
        await commitChanges(`Updated agent ${agentData.xid}`);
    }
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
        assetData.created.push(metadata.xid);
    } else {
        assetData.collected.push(metadata.xid);
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

    let agentData = await getAgent(profileId);
    const assets = await agentGetAssets(profileId);

    let collections = {};

    for (const collectionId of agentData.collections) {
        let collectionData = await getAsset(collectionId);
        collectionData.collection.assets = [];
        collections[collectionId] = collectionData;
    }

    const deleted = [];

    if (profileId === userId) {
        for (const assetId of assets.created) {
            let assetData = await getAsset(assetId);

            if (assetData.asset.collection in collections) {
                collections[assetData.asset.collection].collection.assets.push(assetData);
            } else {
                deleted.push(assetData);
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

        if (count > 0 && !collections[xid].collection.thumbnail) {
            collections[xid].collection.thumbnail = collections[xid].collection.assets[0].file.path;
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
            tokens[tokenId].owned = 1;
            tokens[tokenId].label = editionData.asset.title;
            tokens[tokenId].maxprice = editionData.nft.price;
        }
        else {
            tokens[tokenId].owned += 1;
            tokens[tokenId].label = `${tokens[tokenId].owned} editions`;
            tokens[tokenId].maxprice = Math.max(editionData.nft.price, tokens[tokenId].maxprice);
        }
    }

    agentData.collections = collections;

    const tokensArray = Object.values(tokens);

    agentData.minted = tokensArray.filter(token => token.asset.owner === profileId);
    agentData.collected = tokensArray.filter(token => token.asset.owner !== profileId);
    agentData.listed = tokensArray.filter(token => token.maxprice > 0);
    agentData.unlisted = tokensArray.filter(token => token.maxprice < 1);

    if (profileId === userId) {
        agentData.deleted = deleted;
    }

    return agentData;
};

const getAllAgents = async () => {
    const agentFolders = fs.readdirSync(config.agents, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    const profiles = [];

    for (const profileId of agentFolders) {
        const agentData = await getAgentAndCollections(profileId);

        if (agentData.minted && agentData.minted.length > 0) {
            profiles.push(agentData);
        }
    }

    return profiles;
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
    const current = await getAsset(metadata.xid);

    if (JSON.stringify(metadata) == JSON.stringify(current)) {
        return;
    }

    const assetFolder = path.join(config.assets, metadata.xid);
    const assetJsonPath = path.join(assetFolder, 'meta.json');

    if (!fs.existsSync(assetFolder)) {
        fs.mkdirSync(assetFolder);
    }

    metadata.asset.updated = new Date().toISOString();
    await fs.promises.writeFile(assetJsonPath, JSON.stringify(metadata, null, 2));
};

const commitAsset = async (metadata, action) => {
    await saveAsset(metadata);
    await commitChanges(`${action || 'Updated'} asset ${metadata.xid}`);
};

const isOwner = async (metadata, agentId) => {
    if (!agentId) {
        return false;
    }

    if (metadata.asset.owner === agentId) {
        return true;
    }

    if (!metadata.token) {
        return false;
    }

    for (const editionId of metadata.token.nfts) {
        const edition = await getAsset(editionId);

        if (edition.asset.owner === agentId) {
            return true;
        }
    }

    return false;
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
    let uploadSize = 0;

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
            xid: xid,
            asset: {
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

        uploadSize += file.size;

        await saveAsset(metadata);
        await agentAddAsset(metadata);
    }

    await commitChanges(`Assets (${files.length}) created by ${userId}`);

    const agentData = await getAgent(userId);
    const uploadFee = Math.round(uploadSize * config.uploadRate);
    agentData.credits -= uploadFee;
    await saveAgent(agentData);
};

const createEdition = async (owner, asset, edition, editions) => {
    const xid = uuidv4();
    const assetFolder = path.join(config.assets, xid);
    fs.mkdirSync(assetFolder);

    const metadata = {
        xid: xid,
        asset: {
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

const createToken = async (userId, xid, editions, license, royalty) => {
    let assetData = await getAsset(xid);

    const assetPath = path.join(config.assets, xid);
    const response = await fetch(`${config.archiver}/api/v1/pin/${assetPath}`);
    const ipfs = await response.json();

    const nfts = [];
    editions = parseInt(editions, 10);
    for (let i = 1; i <= editions; i++) {
        const createdId = await createEdition(userId, xid, i, editions);
        nfts.push(createdId);
    }

    //console.log(nfts);
    let assets = await agentGetAssets(userId);
    assets.collected.push(...nfts);
    agentSaveAssets(assets);

    royalty = parseFloat(royalty);

    assetData.token = {
        cid: ipfs.cid,
        url: `https://ipfs.io/ipfs/${ipfs.cid}/${assetData.file.fileName}`,
        royalty: royalty,
        license: license,
        editions: editions,
        nfts: nfts,
    };

    await saveAsset(assetData);
    await commitChanges(`Minted ${editions} edition(s) of ${xid}`);

    const storageFee = Math.round(assetData.file.size * config.storageRate);
    const editionFee = editions * config.editionRate;
    const mintFee = storageFee + editionFee;
    const agentData = await getAgent(userId);
    agentData.credits -= mintFee;
    await saveAgent(agentData);
};

const transferAsset = async (xid, nextOwnerId) => {
    let assetData = await getAsset(xid);
    const prevOwnerId = assetData.asset.owner;

    let assetsPrevOwner = await agentGetAssets(prevOwnerId);
    assetsPrevOwner.collected = assetsPrevOwner.collected.filter(item => item !== xid);
    agentSaveAssets(assetsPrevOwner);

    let assetsNextOwner = await agentGetAssets(nextOwnerId);
    assetsNextOwner.collected.push(xid);
    agentSaveAssets(assetsNextOwner);

    assetData.asset.owner = nextOwnerId;
    assetData.nft.price = 0;
    await saveAsset(assetData);

    await commitChanges(`Transferred ${xid} from ${prevOwnerId} to ${nextOwnerId}`);
};

const pinAsset = async (xid) => {
    const assetPath = path.join(config.assets, xid);
    const response = await fetch(`${config.archiver}/api/v1/pin/${assetPath}`);
    const ipfs = await response.json();
    return ipfs;
};

const createCollection = async (userId, name) => {
    const metadata = {
        xid: uuidv4(),
        asset: {
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
                royalty: 10,
            },
        }
    };

    await saveCollection(metadata);
    return metadata;
};

const saveCollection = async (collection) => {
    const agentData = await getAgent(collection.asset.owner);
    const collectionId = collection.xid;

    if (!agentData.collections.includes(collectionId)) {
        agentData.collections.push(collectionId);
        await saveAgent(agentData);
    }

    commitAsset(collection);
};

const removeCollection = async (collection) => {
    const agentData = await getAgent(collection.asset.owner);
    const collectionId = collection.xid;

    if (agentData.collections.includes(collectionId)) {
        agentData.collections = agentData.collections.filter(xid => xid !== collectionId);
        await saveAgent(agentData);
    }

    return removeAsset(collectionId);
};

module.exports = {
    getAdmin,
    saveAdmin,
    getAgentFromKey,
    getAgent,
    saveAgent,
    allAssets,
    allAgents,
    verifyAsset,
    fixAsset,
    pinAsset,
    verifyAgent,
    fixAgent,
    getAgentAndCollections,
    getAllAgents,
    getCollection,
    getAsset,
    commitAsset,
    isOwner,
    createAssets,
    transferAsset,
    createToken,
    createCollection,
    saveCollection,
    removeCollection,
    integrityCheck,
};
