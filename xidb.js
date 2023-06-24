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

const readAssetMetadata = async (xid) => {
    const metadataPath = path.join(config.assets, xid, 'meta.json');
    const metadataContent = await fs.promises.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataContent);
    return metadata;
};

const writeAssetMetadata = async (metadata) => {
    const assetFolder = path.join(config.assets, metadata.asset.xid);
    const assetJsonPath = path.join(assetFolder, 'meta.json');
    if (!fs.existsSync(assetFolder)) {
        fs.mkdirSync(assetFolder);
    }
    await fs.promises.writeFile(assetJsonPath, JSON.stringify(metadata, null, 2));
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

function gitHash(fileBuffer) {
    const hasher = crypto.createHash('sha1');
    hasher.update('blob ' + fileBuffer.length + '\0');
    hasher.update(fileBuffer);
    return hasher.digest('hex');
}

const createAssets = async (userId, files, collectionIndex) => {
    let collectionCount = 0;
    const agentData = await getAgent(userId);
    const defaultTitle = agentData.collections[collectionIndex].defaultTitle;

    if (defaultTitle) {
        const collection = await getCollection(userId, collectionIndex);
        collectionCount = collection.length;
    }

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
                collection: collectionIndex,
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

        await writeAssetMetadata(metadata);
        await addAssetToUploads(userId, xid);
    }
};

const createNFT = async (owner, asset, edition, editions) => {
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
    let assetData = await readAssetMetadata(xid);

    const nfts = [];
    for (let i = 1; i <= editions; i++) {
        const createdId = await createNFT(userId, xid, i, editions);
        nfts.push(createdId);
    }

    console.log(nfts);

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

    await writeAssetMetadata(assetData);
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

    await writeAssetMetadata(metadata);
    return metadata;
};

const collectionAddAsset = async (xid, assetId) => {
    let collection = readAssetMetadata(xid);
    let asset = readAssetMetadata(assetId);

    if (collection.asset.owner == asset.asset.owner) {
        if (!collection.collection.assets.includes(assetId)) {
            collection.collection.assets.push(assetId);
            await writeAssetMetadata(collection);
            return true;
        }
    }

    return false;
};

const collectionRemoveAsset = async (xid, assetId) => {
    let collection = readAssetMetadata(xid);
    let asset = readAssetMetadata(assetId);

    if (asset.mint) {
        return false;
    }

    const assetIndex = collection.collection.assets.indexOf(assetId);
    if (assetIndex !== -1) {
        collection.collection.assets.splice(assetIndex, 1);
        await writeAssetMetadata(collection);
        return true;
    }

    return false;
};

module.exports = {
    getAgent,
    saveAgent,
    readAssetMetadata,
    writeAssetMetadata,
    getAssets,
    addAssetToUploads,
    getCollection,
    createAssets,
    createToken,
    createCollection,
    collectionAddAsset,
    collectionRemoveAsset,
};