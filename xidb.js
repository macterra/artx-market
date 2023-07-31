const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const gitP = require('simple-git');
const { execSync } = require('node:child_process');

const config = {
    host: process.env.ARTX_HOST || 'localhost',
    port: process.env.ARTX_PORT || 5000,
    data: 'data',
    uploads: 'data/uploads',
    assets: 'data/assets',
    agents: 'data/agents',
    id: 'data/id',
};

// Create a simple-git instance
const simpleGit = gitP(config.data);

// Function to initialize the repository if it's not already a Git repository
const initRepo = async () => {
    if (!fs.existsSync(path.join(config.data, '.git'))) {
        await simpleGit.init();
        console.log('Data repository initialized');
    }
};

initRepo();

// Function to add all changes, commit, and push
const commitChanges = async (commitMessage) => {
    try {
        await simpleGit.add('.');
        await simpleGit.commit(commitMessage);
        //await simpleGit.push('origin', 'master'); // Replace 'origin' and 'master' with your remote and branch if they are different
        console.log(`Changes committed successfully: ${commitMessage}`);
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
    const stdout = execSync(`ipfs add -r -Q ${config.data}`);
    const cid = stdout.toString().trim();
    const jsonPath = path.join(config.data, 'meta.json');

    adminData.updated = new Date().toISOString();
    adminData.githash = await simpleGit.revparse('HEAD');
    adminData.cid = cid;

    await fs.promises.writeFile(jsonPath, JSON.stringify(adminData, null, 2));
    return adminData;
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

const commitAsset = async (metadata, action) => {
    await saveAsset(metadata);
    await commitChanges(`${action || 'Updated'} asset ${metadata.asset.xid}`);
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
        await agentAddAsset(metadata);
    }

    await commitChanges(`Assets (${files.length}) created by ${userId}`);
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

const createToken = async (userId, xid, editions, license, royalty) => {
    let assetData = await getAsset(xid);

    const assetFolder = path.join(config.assets, xid);
    const stdout = execSync(`ipfs add -r -Q ${assetFolder}`);
    const cid = stdout.toString().trim();

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
        cid: cid,
        url: `https://ipfs.io/ipfs/${cid}/${assetData.file.fileName}`,
        royalty: royalty,
        license: license,
        editions: editions,
        nfts: nfts,
    };

    await saveAsset(assetData);
    await commitChanges(`Minted ${editions} edition(s) of ${xid}`);
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
                royalty: 10,
            },
        }
    };

    return metadata;
};

const saveCollection = async (collection) => {
    const agentData = await getAgent(collection.asset.owner);
    const collectionId = collection.asset.xid;

    if (!agentData.collections.includes(collectionId)) {
        agentData.collections.push(collectionId);
        await saveAgent(agentData);
    }

    commitAsset(collection);
};

const removeCollection = async (collection) => {
    const agentData = await getAgent(collection.asset.owner);
    const collectionId = collection.asset.xid;

    if (agentData.collections.includes(collectionId)) {
        agentData.collections = agentData.collections.filter(xid => xid !== collectionId);
        await saveAgent(agentData);
    }

    // TBD remove collection folder?
};

module.exports = {
    getAdmin,
    saveAdmin,
    getAgentFromKey,
    getAgent,
    saveAgent,
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
};
