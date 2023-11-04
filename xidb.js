const path = require('path');
const fs = require('fs');
const assert = require('assert');
const sharp = require('sharp');
const crypto = require('crypto');
const uuid = require('uuid');
const ejs = require('ejs');
const realConfig = require('./config');
const agent = require('./agent');
const admin = require('./admin');
const utils = require('./utils');
const archiver = require('./archiver');
const lnbits = require('./lnbits');

async function waitForArchiver() {
    let isReady = false;

    while (!isReady) {
        isReady = await archiver.ready();

        if (!isReady) {
            console.log('Waiting for Archiver to be ready...');
            // wait for 1 second before checking again
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    console.log('Archiver service is ready!');
}

async function waitForLightning() {
    let isReady = false;

    while (!isReady) {
        try {
            isReady = await lnbits.checkServer();

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

async function integrityCheck() {
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

    rebuildAssets();
}

function rebuildAssets() {
    const agents = {}

    for (const xid of allAgents()) {
        console.log(`agent ${xid}`);
        agents[xid] = {
            owner: xid,
            created: [],
            collected: [],
            collections: [],
        };
    }

    for (const xid of allAssets()) {
        const asset = getAsset(xid);
        const owner = asset?.asset?.owner;

        if (owner && agents[owner]) {
            if (asset.collection) {
                agents[owner].collections.push(xid);
            }
            else if (asset.nft) {
                agents[owner].collected.push(xid);
            }
            else if (asset.file) {
                agents[owner].created.push(xid);
            }
        }
    }

    for (const [xid, assets] of Object.entries(agents)) {
        console.log(`assets for ${xid}: ${JSON.stringify(assets, null, 2)}`);
        agent.saveAssets(assets);
    }
}

function allAssets(config = realConfig) {
    const assets = fs.readdirSync(config.assets, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    return assets;
}

function allAgents(config = realConfig) {
    const agents = fs.readdirSync(config.agents, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    return agents;
}

function repairAsset(xid) {

    const removeInvalidAsset = (xid) => {
        removeAsset(xid);

        return {
            xid: xid,
            fixed: true,
            message: 'asset removed',
        };
    };

    const metadata = getAsset(xid);

    if (!metadata) {
        return removeInvalidAsset(xid);
    }

    if (!metadata.asset) {
        return removeInvalidAsset(xid);
    }

    if (!metadata.asset.owner) {
        return removeInvalidAsset(xid);
    }

    if (!metadata.xid) {
        return removeInvalidAsset(xid);
    }

    if (!uuid.validate(metadata.xid)) {
        return removeInvalidAsset(xid);
    }

    if (metadata.token) {
        const missingNftIds = [];

        for (const nftId of metadata.token.nfts) {
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

    if (metadata.nft) {

        if (metadata.nft.asset) {

            metadata.nft.token = metadata.nft.asset;
            delete metadata.nft.asset;

            const token = getAsset(metadata.nft.token);
            metadata.nft.title = `${token.asset.title} (${metadata.asset.title})`;

            saveAsset(metadata);
            saveNft(xid);

            return {
                xid: xid,
                fixed: true,
                message: `migrated NFT`,
            }
        }
    }

    return {
        xid: xid,
        fixed: true,
        message: "",
    }
}

function repairAgent(xid) {
    const agentData = agent.getAgent(xid);

    if (agentData.collections) {
        delete agentData.collections;
        agent.saveAgent(agentData);

        return {
            xid: xid,
            fixed: true,
            message: "collections removed",
        }
    }

    return {
        xid: xid,
        fixed: true,
        message: "",
    }
}

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

async function createAgent(key) {
    const userId = utils.getAgentId(key);

    agentData = {
        xid: userId,
        pubkey: key,
        name: realConfig.newUser,
        tagline: '',
        description: '',
        collections: [],
        credits: realConfig.initialCredits,
        depositToCredits: true,
    };

    agent.saveAgent(agentData);

    const gallery = createCollection(userId, 'gallery');
    saveCollection(gallery);
    agentData = agent.getAgent(userId);

    if (fs.existsSync(realConfig.defaultPfp)) {
        const pfpName = path.basename(realConfig.defaultPfp);
        const pfpPath = path.join(realConfig.uploads, pfpName);
        fs.copyFileSync(realConfig.defaultPfp, pfpPath);
        const file = getFileObject(pfpPath);
        const assetData = await createAsset(file, "default pfp", userId, gallery.xid);
        agentData.pfp = assetData.file.path;
        agent.saveAgent(agentData);
    }

    return agentData;
}

function getAgentFromKey(key) {
    const xid = utils.getAgentId(key);
    const agentData = agent.getAgent(xid);
    return agentData;
}

function addCredits(userId, amount) {
    const agentData = agent.getAgent(userId);

    if (agentData) {
        agentData.credits += amount;

        const record = {
            type: "add-credits",
            agent: userId,
            agentName: agentData.name,
            amount: amount,
        };
        admin.saveAuditLog(record);
        agent.saveAgent(agentData);
        return agentData;
    }
}

async function buyCredits(userId, invoice) {
    const agentData = agent.getAgent(userId);

    if (agentData && invoice?.payment_hash) {
        console.log(`buyCredits: ${JSON.stringify(invoice, null, 4)}`);

        const payment = await lnbits.checkPayment(invoice.payment_hash);

        if (payment?.paid) {
            const amount = Math.round(payment.details.amount / 1000);

            agentData.credits += amount;
            invoice.payment = payment;

            const record = {
                type: "buy-credits",
                agent: agentData.xid,
                agentName: agentData.name,
                amount: amount,
                invoice: invoice,
            };
            admin.saveAuditLog(record);
            agent.saveAgent(agentData);
            return agentData;
        }
        else {
            console.log(`buyCredits: payment check failed`);
        }
    }
}

function getAgentAndCollections(profileId, userId) {
    if (!profileId) {
        profileId = userId;
    }

    if (!profileId) {
        return;
    }

    let agentData = agent.getAgent(profileId);
    const assets = agent.getAssets(profileId);

    let collections = {};

    if (assets.collections) {
        for (const collectionId of assets.collections) {
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
            enrichAsset(assetData);

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
            enrichAsset(assetData);

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
        const tokenId = editionData.nft.token;

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
}

async function getAllAgents() {
    const agentFolders = fs.readdirSync(realConfig.agents, { withFileTypes: true })
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
}

function getCollection(collectionId, userId) {
    let collection = getAsset(collectionId);

    const agentData = getAgentAndCollections(collection.asset.owner, userId);
    collection = agentData.collections[collectionId];

    if (collection?.collection) {
        collection.isOwnedByUser = (userId == collection.asset.owner);
        collection.costToMintAll = 0;

        if (collection.isOwnedByUser) {
            const editionsCost = collection.collection.default.editions * realConfig.editionRate;

            for (const asset of collection.collection.assets) {
                if (!asset.token) {
                    const storageCost = Math.round(asset.file.size * realConfig.storageRate);
                    collection.costToMintAll += editionsCost + storageCost;
                }
            }
        }
    }

    return collection;
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

function getHistory(xid, config = realConfig) {
    try {
        const historyPath = path.join(config.assets, xid, 'history.jsonl');
        const data = fs.readFileSync(historyPath, 'utf-8');
        const lines = data.trim().split('\n');
        const history = lines.map(line => JSON.parse(line));
        return history.reverse();
    } catch (error) {
        return [];
    }
}

function getAgentMinimal(xid) {
    const agentData = agent.getAgent(xid);

    return {
        'xid': agentData.xid,
        'name': agentData.name,
        'pfp': agentData.pfp,
    }
}

function saveNft(xid) {
    const metadata = getAsset(xid);
    const tokenId = metadata.nft.token;
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

    metadata.nft.preview = `${realConfig.link}${metadata.token.file.path}`;
    metadata.nft.image = metadata.token.file.path.replace("/data/assets", "..");
    metadata.owner.image = metadata.owner.pfp.replace("/data/assets", "..");
    metadata.creator.image = metadata.creator.pfp.replace("/data/assets", "..");

    if (metadata.collection.thumbnail) {
        metadata.collection.image = metadata.collection.thumbnail.replace("/data/assets", "..");
    }
    else {
        metadata.collection.image = metadata.nft.image;
    }

    metadata.nft.link = `${realConfig.link}/nft/${metadata.xid}`;
    metadata.token.link = `${realConfig.link}/asset/${metadata.token.xid}`;
    metadata.collection.link = `${realConfig.link}/collection/${metadata.collection.xid}`;
    metadata.owner.link = `${realConfig.link}/profile/${metadata.owner.xid}`;
    metadata.creator.link = `${realConfig.link}/profile/${metadata.creator.xid}`;

    const templatePath = path.join(realConfig.data, 'nft.ejs');
    const template = fs.readFileSync(templatePath, 'utf8');
    const html = ejs.render(template, metadata);
    const htmlPath = path.join(realConfig.assets, xid, 'index.html');
    fs.writeFileSync(htmlPath, html);

    metadata.asset.updated = new Date().toISOString();
    const jsonPath = path.join(realConfig.assets, xid, 'nft.json');
    fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2));

    return metadata;
}

function getNft(xid) {
    const jsonPath = path.join(realConfig.assets, xid, 'nft.json');

    if (!fs.existsSync(jsonPath)) {
        return;
    }

    const metadataContent = fs.readFileSync(jsonPath, 'utf-8');
    const metadata = JSON.parse(metadataContent);

    metadata.token = getAsset(metadata.token.xid);
    enrichAsset(metadata.token); // Retrieve latest history

    const adminData = admin.getAdmin();
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
}

function getAsset(xid, config = realConfig) {
    let metadata = null;

    try {
        const metadataPath = path.join(config.assets, xid, 'meta.json');
        const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
        metadata = JSON.parse(metadataContent);
    }
    catch (error) { }

    return metadata;
}

function enrichAsset(metadata, config = realConfig) {
    if (metadata.token) {
        metadata.history = getHistory(metadata.xid, config);

        const owners = new Set([metadata.asset.owner]);

        for (const nftId of metadata.token.nfts) {
            const nft = getAsset(nftId, config);
            owners.add(nft.asset.owner);
        }

        metadata.owners = owners.size;
        metadata.sold = owners.size > 1;
    }
}

function saveAsset(metadata, config = realConfig) {
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
}

function saveHistory(xid, record) {
    record.time = new Date().toISOString();
    const recordString = JSON.stringify(record);
    const jsonlPath = path.join(realConfig.assets, xid, 'history.jsonl');
    fs.appendFileSync(jsonlPath, recordString + '\n');
}

function isOwner(metadata, agentId) {
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
}

function gitHash(fileBuffer) {
    const hasher = crypto.createHash('sha1');
    hasher.update('blob ' + fileBuffer.length + '\0');
    hasher.update(fileBuffer);
    return hasher.digest('hex');
}

// createAsset has to be async to get image metadata from sharp
async function createAsset(file, title, userId, collectionId, config = realConfig) {
    // Get image metadata using sharp first so that it throws exception if not image
    const sharpObj = sharp(file.path);
    const imageMetadata = await sharpObj.metadata();
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

    saveAsset(metadata, config);
    agent.addAsset(metadata, config);

    return metadata;
}

function removeAsset(xid, config = realConfig) {
    const assetPath = path.join(config.assets, xid);

    fs.rmSync(assetPath, { recursive: true, force: true });

    //console.log(`Removed asset: ${assetPath}`);
}

async function createAssets(userId, files, collectionId) {
    const agentData = agent.getAgent(userId);
    const collectionData = getCollection(collectionId, userId);
    const defaultTitle = collectionData.collection.default.title;

    let collectionCount = collectionData.collection.assets.length;
    let bytesUploaded = 0;
    let filesUploaded = 0;
    let filesSkipped = 0;
    let filesErrored = 0;
    let creditsDebited = 0;

    if (files) {
        for (const file of files) {
            const uploadFee = Math.round(file.size * realConfig.uploadRate);

            if (agentData.credits < uploadFee) {
                fs.rmSync(file.path);
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

            try {
                await createAsset(file, title, userId, collectionId);
                bytesUploaded += file.size;
                filesUploaded += 1;
            }
            catch (error) {
                console.log(`createAssets: error on ${file.path}: ${error}`);
                filesErrored += 1;
                fs.rmSync(file.path);
            }
        }

        if (filesUploaded > 0) {
            agent.saveAgent(agentData);
        }
    }

    return {
        ok: true,
        filesUploaded: filesUploaded,
        filesSkipped: filesSkipped,
        filesErrored: filesErrored,
        bytesUploaded: bytesUploaded,
        creditsDebited: creditsDebited,
    }
}

function createEdition(owner, tokenId, edition, editions) {
    const xid = uuid.v4();
    const assetFolder = path.join(realConfig.assets, xid);
    fs.mkdirSync(assetFolder);

    const title = `${edition} of ${editions}`;
    const tokenData = getAsset(tokenId);

    const metadata = {
        xid: xid,
        asset: {
            owner: owner,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            type: 'nft',
            title: title,
        },
        nft: {
            token: tokenId,
            title: `${tokenData.asset.title} (${title})`,
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
}

// mintToken has to be async to get the IPFS cid
async function mintToken(userId, xid, editions, license, royalty) {
    let assetData = getAsset(xid);

    const ipfs = await archiver.pinAsset(xid);

    if (!ipfs?.cid) {
        console.error(`mintToken error: ipfs pin failed for ${xid}`);
        return;
    }

    const nfts = [];
    editions = parseInt(editions, 10);
    for (let i = 1; i <= editions; i++) {
        const createdId = createEdition(userId, xid, i, editions);
        nfts.push(createdId);
    }

    //console.log(nfts);
    let assets = agent.getAssets(userId);
    assets.collected.push(...nfts);
    agent.saveAssets(assets);

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
    const storageFee = Math.round(assetData.file.size * realConfig.storageRate);
    const editionFee = editions * realConfig.editionRate;
    const mintFee = storageFee + editionFee;
    const agentData = agent.getAgent(userId);
    agentData.credits -= mintFee;
    agent.saveAgent(agentData);

    return {
        xid: xid,
        cid: ipfs.cid,
        editions: editions,
        storageFee: storageFee,
        editionFee: editionFee,
        mintFee: mintFee,
    };
}

async function unmintToken(userId, xid) {
    let assetData = getAsset(xid);

    const editions = assetData.token.editions;

    for (const nftId of assetData.token.nfts) {
        const nft = getAsset(nftId);
        agent.removeAsset(nft);
        removeAsset(nftId);
    }

    delete assetData.token;
    saveAsset(assetData);

    const jsonlPath = path.join(realConfig.assets, xid, 'history.jsonl');
    fs.rmSync(jsonlPath);

    // Refund mint fee to agent credits
    const storageFee = Math.round(assetData.file.size * realConfig.storageRate);
    const editionFee = editions * realConfig.editionRate;
    const refund = storageFee + editionFee;
    const agentData = agent.getAgent(userId);
    agentData.credits += refund;
    agent.saveAgent(agentData);

    return {
        xid: xid,
        editions: editions,
        refund: refund,
    };
}

function transferAsset(xid, nextOwnerId) {
    const assetData = getAsset(xid);

    assert.ok(assetData.nft);

    const prevOwnerId = assetData.asset.owner;

    let assetsPrevOwner = agent.getAssets(prevOwnerId);
    assetsPrevOwner.collected = assetsPrevOwner.collected.filter(item => item !== xid);
    agent.saveAssets(assetsPrevOwner);

    let assetsNextOwner = agent.getAssets(nextOwnerId);
    assetsNextOwner.collected.push(xid);
    agent.saveAssets(assetsNextOwner);

    assetData.asset.owner = nextOwnerId;
    assetData.nft.price = 0;
    saveAsset(assetData);
    saveNft(xid);
}

async function purchaseAsset(xid, buyerId, invoice) {
    const assetData = getAsset(xid);

    assert.ok(assetData.nft);
    assert.ok(invoice.payment_hash);

    const payment = await lnbits.checkPayment(invoice.payment_hash);

    if (payment?.paid) {
        transferAsset(xid, buyerId);
        return { ok: true, message: 'asset transferred', payment: payment };
    }
    else {
        return { ok: false, message: 'invoice not paid' };
    }
}

async function payoutSale(xid, buyerId, invoice) {
    const assetData = getAsset(xid);
    const buyer = agent.getAgent(buyerId);
    const sellerId = assetData.asset.owner;
    const seller = agent.getAgent(sellerId);
    const price = invoice.amount;

    assert.ok(assetData.nft);
    assert.ok(price > 0);

    const tokenData = getAsset(assetData.nft.token);
    const assetName = assetData.nft.title;
    console.log(`audit: ${buyer.name} buying ${assetName} for ${price} from ${seller.name}`);

    let audit = {
        type: "sale",
        agent: buyerId,
        agentName: buyer.name,
        asset: xid,
        assetName: assetName,
        invoice: invoice,
    };

    const royaltyRate = tokenData.token?.royalty || 0;
    let royalty = 0;
    let royaltyPaid = false;
    const creatorId = tokenData.asset.owner;

    let royaltyTxn = {
        type: "royalty",
        edition: xid,
        buyer: buyerId,
        seller: sellerId,
    };

    if (creatorId !== seller.xid) {
        const creator = agent.getAgent(creatorId);
        royalty = Math.round(price * royaltyRate);

        if (royalty > 0) {
            if (creator.deposit && !creator.depositToCredits) {
                try {
                    await lnbits.sendPayment(creator.deposit, royalty, `royalty for asset ${assetName}`);
                    console.log(`audit: royalty ${royalty} to ${creator.deposit}`);
                    audit.royalty = {
                        address: creator.deposit,
                        amount: royalty,
                    };
                    royaltyPaid = true;
                    royaltyTxn.address = creator.deposit;
                    royaltyTxn.sats = royalty;
                }
                catch (error) {
                    console.log(`payment error: ${error}`);
                }
            }

            if (!royaltyPaid) {
                addCredits(creator.xid, royalty);
                console.log(`audit: royalty ${royalty} credits to ${creator.xid}`);
                audit.royalty = {
                    address: creator.xid,
                    amount: royalty,
                };
                royaltyTxn.address = creatorId;
                royaltyTxn.credits = royalty;
                royaltyPaid = true;
            }
        }
    }

    const txnFee = Math.round(realConfig.txnFeeRate * price);
    const payout = price - royalty - txnFee;
    let payoutPaid = false;
    let payoutSats = 0;
    let payoutCredits = 0;

    if (seller.deposit && !seller.depositToCredits) {
        try {
            await lnbits.sendPayment(seller.deposit, payout, `sale of asset ${assetName}`);
            console.log(`audit: payout ${payout} to ${seller.deposit}`);
            audit.payout = {
                address: seller.deposit,
                amount: payout,
            };
            payoutPaid = true;
            payoutSats = payout;
        }
        catch (error) {
            console.log(`payment error: ${error}`);
        }
    }

    if (!payoutPaid) {
        addCredits(seller.xid, payout);
        console.log(`audit: payout ${payout} credits to ${seller.xid}`);
        audit.payout = {
            address: seller.xid,
            amount: payout,
        };
        payoutPaid = true;
        payoutCredits = payout;
    }

    if (txnFee > 0) {
        if (realConfig.depositAddress) {
            try {
                await lnbits.sendPayment(realConfig.depositAddress, txnFee, `txn fee for asset ${assetName}`);
                console.log(`audit: txn fee ${txnFee} to ${realConfig.depositAddress}`);
                audit.txnfee = {
                    address: realConfig.depositAddress,
                    amount: txnFee,
                };
            }
            catch (error) {
                console.log(`payment error: ${error}`);
            }
        }
        else {
            console.log(`audit: txn fee ${txnFee} kept in wallet`);
        }
    }
    else {
        console.log(`audit: 0 txn fee`);
    }

    const record = {
        type: "sale",
        buyer: buyerId,
        seller: sellerId,
        edition: xid,
        price: price,
    };

    const sellTxn = {
        type: "sell",
        buyer: buyerId,
        edition: xid,
        sats: payoutSats || null,
        credits: payoutCredits || null,
    };

    const buyTxn = {
        type: "buy",
        seller: sellerId,
        edition: xid,
        sats: price,
    };

    saveHistory(assetData.nft.token, record);
    agent.saveTxnLog(sellerId, sellTxn);
    agent.saveTxnLog(buyerId, buyTxn);

    if (royaltyPaid) {
        agent.saveTxnLog(creatorId, royaltyTxn);
    }

    admin.saveAuditLog(audit);

    return record;
}

function createCollection(userId, name) {
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
}

function saveCollection(collection) {
    assert.ok(collection.collection);

    agent.addAsset(collection);

    // assets are collected at runtime because metadata.asset.collection is the source of truth
    collection.collection.assets = [];
    saveAsset(collection);
}

function removeCollection(collection) {
    assert.ok(collection.collection);

    agent.removeAsset(collection);
    removeAsset(collection.xid);
}

async function getListings(max = 8) {
    const logs = await archiver.getLogs();
    let listings = logs.filter(log => log.type === 'list');
    let selected = [];
    let seen = {};
    let listingsByToken = {};

    for (let listing of listings) {

        if (seen[listing.asset]) {
            continue;
        }

        seen[listing.asset] = true;

        if (listing.price === 0) {
            continue;
        }

        try {
            const nft = getAsset(listing.asset);

            if (!nft) {
                continue;
            }

            if (nft.asset.owner !== listing.agent) {
                continue;
            }

            if (nft.nft.price !== listing.price) {
                continue;
            }

            const token = getAsset(nft.nft.token);

            if (!token) {
                continue;
            }

            if (!listingsByToken[nft.nft.token]) {
                listing.title = nft.nft.title;
                listing.image = token.file.path;
                listing.min = nft.nft.price;
                listing.max = nft.nft.price;
                listing.editions = 1;
                listing.token = nft.nft.token;

                selected.push(listing);
                listingsByToken[nft.nft.token] = listing;
            }
            else {
                let tokenListing = listingsByToken[nft.nft.token];
                tokenListing.title = token.asset.title;
                tokenListing.editions += 1;
                tokenListing.min = Math.min(tokenListing.min, listing.price);
                tokenListing.max = Math.max(tokenListing.max, listing.price);
            }
        }
        catch (error) {
            console.log(`getListings error: ${error}`);
        }
    }

    return selected.slice(0, max);
}

module.exports = {
    addCredits,
    allAgents,
    allAssets,
    buyCredits,
    createAgent,
    createAsset,
    createAssets,
    createCollection,
    enrichAsset,
    getAgentAndCollections,
    getAgentFromKey,
    getAllAgents,
    getAsset,
    getCert,
    getCollection,
    getHistory,
    getListings,
    getNft,
    integrityCheck,
    isOwner,
    mintToken,
    payoutSale,
    purchaseAsset,
    removeAsset,
    removeCollection,
    saveAsset,
    saveCollection,
    saveHistory,
    saveNft,
    transferAsset,
    unmintToken,
};
