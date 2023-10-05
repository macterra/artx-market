const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const crypto = require('crypto');
const uuid = require('uuid');
const bs58 = require('bs58');
const { rimrafSync } = require('rimraf')
const config = require('./config');

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

function getMarketId() {
    const dns_ns = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const marketId = uuid.v5(config.name || config.host, dns_ns);

    return marketId;
}

function uuidToBase58(uuidString) {
    // Parse the UUID and convert it to bytes
    const bytes = uuid.parse(uuidString);

    // Convert the bytes to base58
    const base58 = bs58.encode(Buffer.from(bytes));

    return base58;
}

const getAdmin = (xid) => {
    const jsonPath = path.join(config.data, 'meta.json');

    // Check if the agent.json file exists
    if (!fs.existsSync(jsonPath)) {
        const newXid = getMarketId();

        return {
            name: config.name || config.host,
            xid: newXid,
            xid58: uuidToBase58(newXid),
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
        };
    }

    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const jsonData = JSON.parse(jsonContent);

    return jsonData;
};

const saveAdmin = async (adminData) => {

    const jsonPath = path.join(config.data, 'meta.json');
    adminData.updated = new Date().toISOString();
    // Make sure we have something to commit
    fs.writeFileSync(jsonPath, JSON.stringify(adminData, null, 2));

    // !!! use commitChanges here
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

    fs.writeFileSync(jsonPath, JSON.stringify(adminData, null, 2));
    return adminData;
};

const registerState = async (adminState) => {

    adminState = await saveAdmin(adminState);

    const response = await fetch(`${config.archiver}/api/v1/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({ xid: adminState.xid, cid: adminState.cid }),
    });

    const register = await response.json();
    adminState.pending = register.txid;

    const jsonPath = path.join(config.data, 'meta.json');
    fs.writeFileSync(jsonPath, JSON.stringify(adminState, null, 2));

    return adminState;
};

const notarizeState = async (adminState) => {

    adminState = await saveAdmin(adminState);

    const response = await fetch(`${config.archiver}/api/v1/notarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({ xid: adminState.xid, cid: adminState.cid }),
    });

    const notarize = await response.json();
    adminState.pending = notarize.txid;

    const jsonPath = path.join(config.data, 'meta.json');
    fs.writeFileSync(jsonPath, JSON.stringify(adminState, null, 2));

    return adminState;
};

const certifyState = async (adminState) => {

    if (adminState.pending) {
        const response = await fetch(`${config.archiver}/api/v1/certify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify({ txid: adminState.pending }),
        });

        const cert = await response.json();

        if (cert.xid) {
            const certPath = path.join(config.certs, cert.xid);
            fs.mkdirSync(certPath, { recursive: true });
            const certFile = path.join(certPath, 'meta.json');
            fs.writeFileSync(certFile, JSON.stringify(cert, null, 2));

            adminState.latest = cert.xid;
            adminState.pending = null;

            const jsonPath = path.join(config.data, 'meta.json');
            fs.writeFileSync(jsonPath, JSON.stringify(adminState, null, 2));

            await commitChanges(`new certificate ${cert.xid}`);
        }
    }

    return adminState;
};

const getWalletInfo = async () => {
    const response = await fetch(`${config.archiver}/api/v1/walletinfo`);
    const walletinfo = await response.json();
    return walletinfo;
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
        const res = repairAsset(xid);
        const index = (i + 1).toString().padStart(5, " ");

        if (res.fixed) {
            console.log(`${index} Asset ${xid} ✔ ${res.message}`);
        }
        else {
            console.log(`${index} Asset ${xid} ✘ ${res.message}`);
        }
    }

    const agents = allAgents();

    for (const [i, xid] of agents.entries()) {
        const res = repairAgent(xid);
        const index = (i + 1).toString().padStart(5, " ");

        if (res.fixed) {
            console.log(`${index} Agent ${xid} ✔ ${res.message}`);
        }
        else {
            console.log(`${index} Agent ${xid} ✘ ${res.message}`);
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

const removeAsset = (xid) => {
    const assetPath = path.join(config.assets, xid);

    rimrafSync(assetPath);

    return {
        xid: xid,
        fixed: true,
        message: 'asset removed',
    };
};

const repairAsset = (xid) => {
    const assetData = getAsset(xid);

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
        return removeAsset(xid);
    }

    if (!uuid.validate(assetData.xid)) {
        return {
            xid: xid,
            fixed: false,
            message: "bad xid",
        }
    }

    if (assetData.token) {
        const missingNftIds = [];

        for (const nftId of assetData.token.nfts) {
            const edition = getAsset(nftId);
            if (!edition) {
                missingNftIds.push(nftId);
            }
        }

        if (missingNftIds.length > 0) {
            return {
                xid: xid,
                fixed: false,
                message: `missing nft assets: ${missingNftIds}`,
            }
        }
    }

    const agentData = getAgent(assetData.asset.owner);

    if (!agentData) {
        return removeAsset(xid);
    }

    const assets = agentGetAssets(assetData.asset.owner);
    let ownershipFixed = false;

    if (assetData.collection) {
        if (!agentData.collections.includes(xid)) {
            agentData.collections.push(xid);
            saveAgent(agentData);
            ownershipFixed = true;
        }
    }
    else if (assetData.nft) {
        if (!assets.collected.includes(xid)) {
            agentData.collected.push(xid);
            saveAgent(agentData);
            ownershipFixed = true;
        }
    }
    else {
        if (!assets.created.includes(xid)) {
            agentData.created.push(xid);
            saveAgent(agentData);
            ownershipFixed = true;
        }
    }

    if (ownershipFixed) {
        return {
            xid: xid,
            fixed: true,
            message: "ownership fixed",
        }
    }

    return {
        xid: xid,
        fixed: true,
        message: "",
    }
};

const repairAgent = (xid) => {
    const agentData = getAgent(xid);
    const assets = agentGetAssets(xid);
    let ownershipFixed = false;

    for (const collectionId of agentData.collections) {
        const collection = getAsset(collectionId);

        if (collection.asset.owner !== xid) {
            collection.asset.owner = xid;
            saveAsset(collection);
        }
    }

    for (const assetId of assets.created) {
        const asset = getAsset(assetId);

        if (asset.asset.owner !== xid) {
            asset.asset.owner = xid;
            saveAsset(asset);
        }
    }

    for (const assetId of assets.collected) {
        const asset = getAsset(assetId);

        if (asset.asset.owner !== xid) {
            asset.asset.owner = xid;
            saveAsset(asset);
        }
    }

    if (ownershipFixed) {
        return {
            xid: xid,
            fixed: true,
            message: "ownership fixed",
        }
    }

    return {
        xid: xid,
        fixed: true,
        message: "",
    }
};

function getFileObject(filePath) {
    try {
        const contents = fs.readFileSync(filePath);
        return {
            path: filePath,
            originalname: path.basename(filePath),
            encoding: '7bit', // This is a default value. Actual encoding may vary.
            mimetype: 'application/octet-stream', // This is a default value. Actual MIME type may vary.
            size: contents.length,
            buffer: contents
        };
    } catch (error) {
        console.error('Error reading file:', error);
        return null;
    }
}

function agentId(key) {
    const namespace = getMarketId();
    const userId = uuid.v5(key.toString(), namespace);
    return userId;
}

const createAgent = async (key) => {
    const userId = agentId(key);

    agentData = {
        xid: userId,
        pubkey: key,
        name: 'anon',
        tagline: '',
        description: '',
        collections: [],
        credits: config.initialCredits,
    };

    saveAgent(agentData);

    const gallery = createCollection(userId, 'gallery');
    saveCollection(gallery);
    agentData = getAgent(userId);

    if (fs.existsSync(config.defaultPfp)) {
        const pfpName = path.basename(config.defaultPfp);
        const pfpPath = path.join(config.uploads, pfpName);
        fs.copyFileSync(config.defaultPfp, pfpPath);
        const file = getFileObject(pfpPath);
        const assetData = await createAsset(file, "default pfp", userId, gallery.xid);
        agentData.pfp = assetData.file.path;
        saveAgent(agentData);
    }

    return agentData;
};

const getAgentFromKey = (key) => {
    const xid = agentId(key);
    const agentData = getAgent(xid);
    return agentData;
};

const getAgent = (xid) => {
    const agentJsonPath = path.join(config.agents, xid, 'agent.json');

    // Check if the agent.json file exists
    if (!fs.existsSync(agentJsonPath)) {
        return null;
    }

    const agentJsonContent = fs.readFileSync(agentJsonPath, 'utf-8');
    const agentData = JSON.parse(agentJsonContent);

    return agentData;
};

const saveAgent = (agentData) => {
    const agentFolder = path.join(config.agents, agentData.xid);
    const agentJsonPath = path.join(agentFolder, 'agent.json');

    if (!fs.existsSync(agentFolder)) {
        fs.mkdirSync(agentFolder);
    }

    agentData.updated = new Date().toISOString();
    fs.writeFileSync(agentJsonPath, JSON.stringify(agentData, null, 2));
};

const addCredits = (userId, amount) => {
    const agentData = getAgent(userId);

    if (agentData) {
        agentData.credits += amount;

        const record = {
            "type": "add-credits",
            "agent": userId,
            "amount": amount,
        };
        saveAuditLog(record);
        saveAgent(agentData);
        return agentData;
    }
};

const buyCredits = (userId, charge) => {
    const agentData = getAgent(userId);

    if (agentData) {
        if (charge && charge.paid && charge.amount) {
            agentData.credits += charge.amount;

            const record = {
                "type": "buy-credits",
                "agent": userId,
                "amount": charge.amount,
                "charge": charge,
            };
            saveAuditLog(record);
            saveAgent(agentData);
            return agentData;
        }
    }
};

const agentGetAssets = (userId) => {
    const agentFolder = path.join(config.agents, userId);
    const jsonPath = path.join(agentFolder, 'assets.json');

    let assetData = {};

    // Check if the agent.json file exists
    if (fs.existsSync(jsonPath)) {
        const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
        assetData = JSON.parse(jsonContent);
    }
    else {
        assetData.owner = userId;
        assetData.created = [];
        assetData.collected = [];
    }

    return assetData;
};

const agentSaveAssets = (assetData) => {
    const agentFolder = path.join(config.agents, assetData.owner);
    const jsonPath = path.join(agentFolder, 'assets.json');

    assetData.updated = new Date().toISOString();

    fs.writeFileSync(jsonPath, JSON.stringify(assetData, null, 2));
};

const agentAddAsset = (metadata) => {
    let assetData = agentGetAssets(metadata.asset.owner);

    if (metadata.file) {
        assetData.created.push(metadata.xid);
    } else {
        assetData.collected.push(metadata.xid);
    }

    agentSaveAssets(assetData);
};

const getAgentTxnLog = (userId) => {
    try {
        const jsonlPath = path.join(config.agents, userId, 'txnlog.jsonl');
        const data = fs.readFileSync(jsonlPath, 'utf-8');
        const lines = data.trim().split('\n');
        const log = lines.map(line => JSON.parse(line));
        return log.reverse();
    } catch (error) {
        return [];
    }
};

const getAgentAndCollections = (profileId, userId) => {
    if (!profileId) {
        profileId = userId;
    }

    if (!profileId) {
        return;
    }

    let agentData = getAgent(profileId);
    const assets = agentGetAssets(profileId);

    let collections = {};

    if (agentData.collections) {
        for (const collectionId of agentData.collections) {
            let collectionData = getAsset(collectionId);
            collectionData.collection.assets = [];
            collections[collectionId] = collectionData;
        }
    }

    const deleted = [];

    if (profileId === userId) {
        for (const assetId of assets.created) {
            let assetData = getAsset(assetId);

            if (assetData.asset.collection in collections) {
                collections[assetData.asset.collection].collection.assets.push(assetData);
            } else {
                deleted.push(assetData);
            }
        }
    }
    else {
        for (const assetId of assets.created) {
            let assetData = getAsset(assetId);

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
        const editionData = getAsset(assetId);
        const tokenId = editionData.nft.asset;

        if (!(tokenId in tokens)) {
            tokens[tokenId] = getAsset(tokenId);
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
        const agentData = getAgentAndCollections(profileId);

        if (agentData.minted && agentData.minted.length > 0) {
            profiles.push(agentData);
        }
    }

    return profiles;
};

const getCollection = (collectionId, userId) => {
    let collection = getAsset(collectionId);

    const agentData = getAgentAndCollections(collection.asset.owner, userId);
    collection = agentData.collections[collectionId];

    collection.isOwnedByUser = (userId == collection.asset.owner);

    return collection;
};

const getCert = (xid) => {
    const certPath = path.join(config.certs, xid, 'meta.json');
    const certContent = fs.readFileSync(certPath, 'utf-8');
    const cert = JSON.parse(certContent);
    return cert;
};

const getHistory = (xid) => {
    try {
        const historyPath = path.join(config.assets, xid, 'history.jsonl');
        const data = fs.readFileSync(historyPath, 'utf-8');
        const lines = data.trim().split('\n');
        const history = lines.map(line => JSON.parse(line));
        return history.reverse();
    } catch (error) {
        return [];
    }
};

const getNft = (xid) => {
    const metadata = getAsset(xid);

    metadata.owner = getAgent(metadata.asset.owner);

    const tokenId = metadata.nft?.asset;

    if (tokenId) {
        const tokenData = getAsset(tokenId);
        metadata.nft.asset = tokenData;
    }

    const adminData = getAdmin();
    const cert = adminData.latest;

    if (cert) {
        metadata.cert = getCert(cert);
    }

    return metadata;
};

const getAsset = (xid) => {
    let metadata = null;

    try {
        const metadataPath = path.join(config.assets, xid, 'meta.json');
        const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
        metadata = JSON.parse(metadataContent);
        metadata.history = getHistory(xid);
    } catch (error) {
    }

    return metadata;
};

const saveAsset = (metadata) => {
    const current = getAsset(metadata.xid);

    if (JSON.stringify(metadata) == JSON.stringify(current)) {
        return;
    }

    const assetFolder = path.join(config.assets, metadata.xid);
    const assetJsonPath = path.join(assetFolder, 'meta.json');

    if (!fs.existsSync(assetFolder)) {
        fs.mkdirSync(assetFolder);
    }

    metadata.asset.updated = new Date().toISOString();
    fs.writeFileSync(assetJsonPath, JSON.stringify(metadata, null, 2));
};

const getAuditLog = () => {
    try {
        const jsonlPath = path.join(config.data, 'auditlog.jsonl');
        const data = fs.readFileSync(jsonlPath, 'utf-8');
        const lines = data.trim().split('\n');
        const log = lines.map(line => JSON.parse(line));
        return log.reverse();
    } catch (error) {
        return [];
    }
};

const saveAuditLog = (record) => {
    record.time = new Date().toISOString();
    const recordString = JSON.stringify(record);
    const jsonlPath = path.join(config.data, 'auditlog.jsonl');
    fs.appendFileSync(jsonlPath, recordString + '\n');
};

const saveTxnLog = (xid, record) => {
    record.time = new Date().toISOString();
    const recordString = JSON.stringify(record);
    const jsonlPath = path.join(config.agents, xid, 'txnlog.jsonl');
    fs.appendFileSync(jsonlPath, recordString + '\n');
};

const saveHistory = (xid, record) => {
    record.time = new Date().toISOString();
    const recordString = JSON.stringify(record);
    const jsonlPath = path.join(config.assets, xid, 'history.jsonl');
    fs.appendFileSync(jsonlPath, recordString + '\n');
};

const commitAsset = async (metadata, action) => {
    saveAsset(metadata);
    await commitChanges(`${action || 'Updated'} asset ${metadata.xid}`);
};

const isOwner = (metadata, agentId) => {
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
        const edition = getAsset(editionId);

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

// createAsset has to be async to get image metadata from sharp
const createAsset = async (file, title, userId, collectionId) => {
    const xid = uuid.v4();

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

    saveAsset(metadata);
    agentAddAsset(metadata);

    return metadata;
};

const createAssets = async (userId, files, collectionId) => {
    const agentData = getAgent(userId);
    const collectionData = getCollection(collectionId, userId);
    const defaultTitle = collectionData.collection.default.title;

    let collectionCount = collectionData.collection.assets.length;
    let bytesUploaded = 0;
    let filesUploaded = 0;
    let filesSkipped = 0;
    let creditsDebited = 0;

    for (const file of files) {
        const uploadFee = Math.round(file.size * config.uploadRate);

        if (agentData.credits < uploadFee) {
            fs.unlinkSync(file.path);
            filesSkipped += 1;
            continue;
        }

        agentData.credits -= uploadFee;
        creditsDebited += uploadFee;

        let title = 'untitled';

        if (defaultTitle) {
            collectionCount += 1;
            title = defaultTitle.replace("%N%", collectionCount);
        }

        const assetData = await createAsset(file, title, userId, collectionId);
        bytesUploaded += file.size;
        filesUploaded += 1;
    }

    if (filesUploaded > 0) {
        saveAgent(agentData);
    }

    return {
        'ok': true,
        'filesUploaded': filesUploaded,
        'filesSkipped': filesSkipped,
        'bytesUploaded': bytesUploaded,
        'creditsDebited': creditsDebited,
    }
};

const createEdition = (owner, asset, edition, editions) => {
    const xid = uuid.v4();
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
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    return xid;
};

// createToken has to be async to get the IPFS cid
const createToken = async (userId, xid, editions, license, royalty) => {
    let assetData = getAsset(xid);

    const assetPath = path.join(config.assets, xid);
    const response = await fetch(`${config.archiver}/api/v1/pin/${assetPath}`);
    const ipfs = await response.json();

    const nfts = [];
    editions = parseInt(editions, 10);
    for (let i = 1; i <= editions; i++) {
        const createdId = createEdition(userId, xid, i, editions);
        nfts.push(createdId);
    }

    //console.log(nfts);
    let assets = agentGetAssets(userId);
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

    saveAsset(assetData);

    // Charge mint fee from agent credits
    const storageFee = Math.round(assetData.file.size * config.storageRate);
    const editionFee = editions * config.editionRate;
    const mintFee = storageFee + editionFee;
    const agentData = getAgent(userId);
    agentData.credits -= mintFee;
    saveAgent(agentData);

    return {
        "xid": xid,
        "cid": ipfs.cid,
        "editions": editions,
        "storageFee": storageFee,
        "editionFee": editionFee,
        "mintFee": mintFee,
    };
};

const transferAsset = (xid, nextOwnerId) => {
    let assetData = getAsset(xid);
    const prevOwnerId = assetData.asset.owner;

    let assetsPrevOwner = agentGetAssets(prevOwnerId);
    assetsPrevOwner.collected = assetsPrevOwner.collected.filter(item => item !== xid);
    agentSaveAssets(assetsPrevOwner);

    let assetsNextOwner = agentGetAssets(nextOwnerId);
    assetsNextOwner.collected.push(xid);
    agentSaveAssets(assetsNextOwner);

    assetData.asset.owner = nextOwnerId;
    assetData.nft.price = 0;
    saveAsset(assetData);
};

const pinAsset = async (xid) => {
    const assetPath = path.join(config.assets, xid);
    const response = await fetch(`${config.archiver}/api/v1/pin/${assetPath}`);
    const ipfs = await response.json();
    return ipfs;
};

const createCollection = (userId, name) => {
    const metadata = {
        xid: uuid.v4(),
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

    saveCollection(metadata);
    return metadata;
};

const saveCollection = (collection) => {
    const agentData = getAgent(collection.asset.owner);
    const collectionId = collection.xid;

    if (!agentData.collections.includes(collectionId)) {
        agentData.collections.push(collectionId);
        saveAgent(agentData);
    }

    saveAsset(collection);
};

const removeCollection = (collection) => {
    const agentData = getAgent(collection.asset.owner);
    const collectionId = collection.xid;

    if (agentData.collections.includes(collectionId)) {
        agentData.collections = agentData.collections.filter(xid => xid !== collectionId);
        saveAgent(agentData);
    }

    return removeAsset(collectionId);
};

module.exports = {
    addCredits,
    allAgents,
    allAssets,
    buyCredits,
    certifyState,
    commitAsset,
    commitChanges,
    createAgent,
    createAssets,
    createCollection,
    createToken,
    getAdmin,
    getAgent,
    getAgentAndCollections,
    getAgentFromKey,
    getAgentTxnLog,
    getAllAgents,
    getAsset,
    getAuditLog,
    getCert,
    getCollection,
    getNft,
    getWalletInfo,
    integrityCheck,
    isOwner,
    notarizeState,
    pinAsset,
    registerState,
    removeCollection,
    saveAdmin,
    saveAgent,
    saveAuditLog,
    saveCollection,
    saveHistory,
    saveTxnLog,
    transferAsset,
};
