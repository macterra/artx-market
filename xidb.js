const path = require('path');
const fs = require('fs');
const assert = require('assert');
const sharp = require('sharp');
const crypto = require('crypto');
const uuid = require('uuid');
const bs58 = require('bs58');
const ejs = require('ejs');
const { rimrafSync } = require('rimraf')
const config = require('./config');
const satspay = require('./satspay');

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
                pushChanges();
                return commit.githash;
            }
        }
    } catch (err) {
        console.error('Failed to commit changes:', err);
    }
};

const pushChanges = async () => {
    try {
        const response = await fetch(`${config.archiver}/api/v1/push`);

        if (response.ok) {
            const push = await response.json()

            if (push.error) {
                console.log(`Failed to push changes: ${push.error}`);
            }
        }
    } catch (err) {
        console.error('Failed to push changes:', err);
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

    const cidPath = path.join(config.data, "CID");

    if (fs.existsSync(cidPath)) {
        jsonData.cid = fs.readFileSync(cidPath, 'utf-8').trim();
    }

    return jsonData;
};

const saveAdmin = async (adminData) => {

    const jsonPath = path.join(config.data, 'meta.json');
    adminData.updated = new Date().toISOString();
    // Make sure we have something to commitq
    fs.writeFileSync(jsonPath, JSON.stringify(adminData, null, 2));

    adminData.githash = await commitChanges("Save admin");

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

async function waitForArchiver() {
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

async function waitForLightning() {
    let isReady = false;

    while (!isReady) {
        try {
            isReady = await satspay.checkServer();

            if (!isReady) {
                console.log('Waiting for LNbits to be ready...');
                await new Promise(resolve => setTimeout(resolve, 1000)); // wait for 5 seconds before checking again
            }
        } catch (error) {
            console.error('Waiting for LNbits to respond...');
            await new Promise(resolve => setTimeout(resolve, 1000)); // wait for 5 seconds before checking again
        }
    }

    console.log('LNbits service is ready!');
}

const integrityCheck = async () => {
    await waitForArchiver();
    await waitForLightning();

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

    await commitChanges("All assets and agents updated and/or repaired");
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

    console.log(`Deleted ${assetPath}`);

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

    // Revise history to remove everything before unmints
    const history = getHistory(xid); // history is in reverse order!

    if (history) {
        let lastUnmintIndex = -1;

        for (let i = 0; i < history.length; i++) {
            if (history[i].type === 'unmint') {
                lastUnmintIndex = i;
                break;
            }
        }

        if (lastUnmintIndex !== -1) {
            const jsonlPath = path.join(config.assets, xid, 'history.jsonl');
            fs.rmSync(jsonlPath);

            for (let i = lastUnmintIndex - 1; i >= 0; i--) {
                const recordString = JSON.stringify(history[i]);
                fs.appendFileSync(jsonlPath, recordString + '\n');
            }

            return {
                xid: xid,
                fixed: true,
                message: `removed unmints from history`,
            }
        }
    }

    // if (assetData.nft) {
    //     saveNft(xid);

    //     return {
    //         xid: xid,
    //         fixed: true,
    //         message: `saved NFT`,
    //     }
    // }

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
        const token = getAsset(assetData.nft.asset);

        if (!token.token) {
            return removeAsset(xid);
        }

        if (!token.token.nfts.includes(xid)) {
            return removeAsset(xid);
        }

        if (!assets.collected.includes(xid)) {
            assets.collected.push(xid);
            agentSaveAssets(assets);
            ownershipFixed = true;
        }
    }
    else {
        if (!assets.created.includes(xid)) {
            assets.created.push(xid);
            agentSaveAssets(assets);
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

        if (!collection) {
            agentData.collections = agentData.collections.filter(xid => xid !== collectionId);
            saveAgent(agentData);
            ownershipFixed = true;
        }
    }

    for (const assetId of assets.created) {
        const asset = getAsset(assetId);

        if (!asset) {
            assets.created = assets.created.filter(xid => xid !== assetId);
            agentSaveAssets(assets);
            ownershipFixed = true;
        }
    }

    for (const assetId of assets.collected) {
        const asset = getAsset(assetId);

        if (!asset) {
            assets.collected = assets.collected.filter(xid => xid !== assetId);
            agentSaveAssets(assets);
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
        name: config.newUser,
        tagline: '',
        description: '',
        collections: [],
        credits: config.initialCredits,
        depositToCredits: true,
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

const buyCredits = async (userId, invoice) => {
    const agentData = getAgent(userId);

    if (agentData && invoice) {
        console.log(`buyCredits: ${JSON.stringify(invoice, null, 4)}`);

        const payment = await satspay.checkPayment(invoice.payment_hash);

        if (payment.paid) {
            const amount = Math.round(payment.details.amount / 1000);

            agentData.credits += amount;
            invoice.payment = payment;

            const record = {
                "type": "buy-credits",
                "agent": userId,
                "amount": amount,
                "invoice": invoice,
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

const agentRemoveAsset = (metadata) => {
    let assetData = agentGetAssets(metadata.asset.owner);

    if (metadata.nft) {
        assetData.collected = assetData.collected.filter(xid => xid != metadata.xid);
    }
    else {
        console.log(`agentRemoveAsset ${metadata.xid} not an edition`);
        return;
    }

    agentSaveAssets(assetData);
    return removeAsset(metadata.xid);
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
    const minted = [];

    if (profileId === userId) {
        for (const assetId of assets.created) {
            let assetData = getAsset(assetId);

            if (assetData.asset.collection in collections) {
                collections[assetData.asset.collection].collection.assets.push(assetData);

                if (assetData.token) {
                    collections[assetData.asset.collection].published = true;
                    agentData.published = true;

                    if (assetData.sold) {
                        collections[assetData.asset.collection].sold = true;
                        agentData.pro = true;
                    }
                }
            } else {
                deleted.push(assetData);
            }

            if (assetData.token) {
                minted.push(assetData);
            }
        }
    }
    else {
        // Only show tokens (minted assets) to other users
        for (const assetId of assets.created) {
            let assetData = getAsset(assetId);

            if (assetData.token) {
                minted.push(assetData);

                if (assetData.asset.collection in collections) {
                    collections[assetData.asset.collection].collection.assets.push(assetData);
                    collections[assetData.asset.collection].published = true;
                    agentData.published = true;

                    if (assetData.sold) {
                        collections[assetData.asset.collection].sold = true;
                        agentData.pro = true;
                    }
                }
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

    let editions = {};

    for (const assetId of assets.collected) {
        const editionData = getAsset(assetId);
        const tokenId = editionData.nft.asset;

        if (!(tokenId in editions)) {
            editions[tokenId] = getAsset(tokenId);
            editions[tokenId].owned = 1;
            editions[tokenId].label = editionData.asset.title;
            editions[tokenId].maxprice = editionData.nft.price;
        }
        else {
            editions[tokenId].owned += 1;
            editions[tokenId].label = `${editions[tokenId].owned} editions`;
            editions[tokenId].maxprice = Math.max(editionData.nft.price, editions[tokenId].maxprice);
        }
    }

    agentData.collections = collections;

    const tokensArray = Object.values(editions);

    agentData.minted = minted;
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
    collection.costToMintAll = 0;

    if (collection.isOwnedByUser) {
        const editionsCost = collection.collection.default.editions * config.editionRate;

        for (const asset of collection.collection.assets) {
            if (!asset.token) {
                const storageCost = Math.round(asset.file.size * config.storageRate);
                collection.costToMintAll += editionsCost + storageCost;
            }
        }
    }

    return collection;
};

const getCert = (xid) => {
    const certPath = path.join(config.certs, xid, 'meta.json');
    const certContent = fs.readFileSync(certPath, 'utf-8');
    const cert = JSON.parse(certContent);

    cert.block_link = `${config.block_link}/${cert.auth.blockhash}`;
    cert.txn_link = `${config.txn_link}/${cert.auth.tx.txid}`;
    cert.ipfs_link = `${config.ipfs_link}/${cert.auth.cid}`;

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

function getAgentMinimal(xid) {
    const agent = getAgent(xid);

    return {
        'xid': agent.xid,
        'name': agent.name,
        'pfp': agent.pfp,
    }
}

const saveNft = (xid) => {
    const metadata = getAsset(xid);
    const tokenId = metadata.nft.asset;
    const tokenData = getAsset(tokenId);
    const collectionId = tokenData.asset.collection;
    const collectionData = getAsset(collectionId);

    metadata.owner = getAgentMinimal(metadata.asset.owner);
    metadata.creator = getAgentMinimal(tokenData.asset.owner);
    metadata.token = tokenData;

    metadata.collection = {
        'xid': collectionData.xid,
        'title': collectionData.asset.title,
        'thumbnail': collectionData.collection.thumbnail,
    };

    metadata.nft.preview = `${config.link}${metadata.token.file.path}`;
    metadata.nft.image = metadata.token.file.path.replace("/data/assets", "..");
    metadata.owner.image = metadata.owner.pfp.replace("/data/assets", "..");
    metadata.creator.image = metadata.creator.pfp.replace("/data/assets", "..");

    if (metadata.collection.thumbnail) {
        metadata.collection.image = metadata.collection.thumbnail.replace("/data/assets", "..");
    }
    else {
        metadata.collection.image = metadata.nft.image;
    }

    metadata.nft.link = `${config.link}/nft/${metadata.xid}`;
    metadata.token.link = `${config.link}/asset/${metadata.token.xid}`;
    metadata.collection.link = `${config.link}/collection/${metadata.collection.xid}`;
    metadata.owner.link = `${config.link}/profile/${metadata.owner.xid}`;
    metadata.creator.link = `${config.link}/profile/${metadata.creator.xid}`;

    const templatePath = path.join(config.data, 'nft.ejs');
    const template = fs.readFileSync(templatePath, 'utf8');
    const html = ejs.render(template, metadata);
    const htmlPath = path.join(config.assets, xid, 'index.html');
    fs.writeFileSync(htmlPath, html);

    metadata.asset.updated = new Date().toISOString();
    const jsonPath = path.join(config.assets, xid, 'nft.json');
    fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2));

    return metadata;
};

const getNft = (xid) => {
    const jsonPath = path.join(config.assets, xid, 'nft.json');

    if (!fs.existsSync(jsonPath)) {
        return saveNft(xid);
    }

    const metadataContent = fs.readFileSync(jsonPath, 'utf-8');
    const metadata = JSON.parse(metadataContent);

    // Retrieve latest history
    metadata.token = getAsset(metadata.token.xid);

    const adminData = getAdmin();
    const certId = adminData.latest;

    if (certId) {
        const cert = getCert(certId);
        const authTime = new Date(cert.auth.time);
        const updated = new Date(metadata.asset.updated);

        if (authTime > updated) {
            metadata.cert = cert;
        }
    }

    return metadata;
};

const getAsset = (xid) => {
    let metadata = null;

    try {
        const metadataPath = path.join(config.assets, xid, 'meta.json');
        const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
        metadata = JSON.parse(metadataContent);

        if (metadata.token) {
            metadata.history = getHistory(xid);

            const owners = new Set([metadata.asset.owner]);

            for (const nftId of metadata.token.nfts) {
                const nft = getAsset(nftId);
                owners.add(nft.asset.owner);
            }

            metadata.owners = owners.size;
            metadata.sold = owners.size > 1;
        }
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
            title = defaultTitle.replace("{N}", collectionCount);
            title = title.replace("%N%", collectionCount); // deprecated
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

    saveNft(xid);

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

const unmintToken = async (userId, xid) => {
    let assetData = getAsset(xid);

    const editions = assetData.token.editions;

    for (const nftId of assetData.token.nfts) {
        const nft = getAsset(nftId);
        agentRemoveAsset(nft);
    }

    delete assetData.token;
    saveAsset(assetData);

    const jsonlPath = path.join(config.assets, xid, 'history.jsonl');
    fs.rmSync(jsonlPath);

    // Refund mint fee to agent credits
    const storageFee = Math.round(assetData.file.size * config.storageRate);
    const editionFee = editions * config.editionRate;
    const refund = storageFee + editionFee;
    const agentData = getAgent(userId);
    agentData.credits += refund;
    saveAgent(agentData);

    return {
        xid: xid,
        editions: editions,
        refund: refund,
    };
};

const transferAsset = (xid, nextOwnerId) => {
    const assetData = getAsset(xid);

    assert.ok(assetData.nft);

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
    saveNft(xid);
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
                title: `${name} #{N}`,
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
    saveNft,
    saveTxnLog,
    transferAsset,
    unmintToken,
};
