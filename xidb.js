const path = require('path');
const fs = require('fs');
const assert = require('assert');
const uuid = require('uuid');
const ejs = require('ejs');
const realConfig = require('./config');
const asset = require('./asset');
const agent = require('./agent');
const admin = require('./admin');
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
        const assetData = asset.getAsset(xid);
        const owner = assetData?.asset?.owner;

        if (owner && agents[owner]) {
            if (assetData.collection) {
                agents[owner].collections.push(xid);
            }
            else if (assetData.nft) {
                agents[owner].collected.push(xid);
            }
            else if (assetData.file) {
                agents[owner].created.push(xid);
            }
        }
    }

    for (const [xid, assets] of Object.entries(agents)) {
        //console.log(`assets for ${xid}: ${JSON.stringify(assets, null, 2)}`);
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
        asset.removeAsset(xid);

        return {
            xid: xid,
            fixed: true,
            message: 'asset removed',
        };
    };

    const assetData = asset.getAsset(xid);

    if (!assetData) {
        return removeInvalidAsset(xid);
    }

    if (!assetData.asset) {
        return removeInvalidAsset(xid);
    }

    if (!assetData.asset.owner) {
        return removeInvalidAsset(xid);
    }

    if (!assetData.xid) {
        return removeInvalidAsset(xid);
    }

    if (!uuid.validate(assetData.xid)) {
        return removeInvalidAsset(xid);
    }

    if (assetData.token) {
        const missingNftIds = [];

        for (const nftId of assetData.token.nfts) {
            const edition = asset.getAsset(nftId);
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

    if (assetData.nft) {
        const templatePath = path.join(realConfig.data, 'nft.ejs');
        const templateStats = fs.statSync(templatePath);
        const templateUpdateTime = new Date(templateStats.mtime).getTime();
        const nftData = getNft(assetData.xid);
        const nftUpdateTime = new Date(nftData.asset.updated).getTime();

        if (templateUpdateTime > nftUpdateTime) {
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
            let collectionData = asset.getAsset(collectionId);
            collectionData.collection.assets = [];
            collections[collectionId] = collectionData;
        }
    }

    const deleted = [];
    const minted = [];

    if (profileId === userId) {
        for (const assetId of assets.created) {
            let assetData = asset.getAsset(assetId);
            asset.enrichAsset(assetData);

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
            let assetData = asset.getAsset(assetId);
            asset.enrichAsset(assetData);

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

    // Set thumbnails for collections missing thumbnails
    for (let xid in collections) {
        if (!collections[xid].collection.thumbnail) {
            const count = collections[xid].collection.assets.length;

            if (count > 0) {
                // Make the thumbnail the first asset
                collections[xid].collection.thumbnail = collections[xid].collection.assets[0].file.path;
            }
            else {
                // Otherwise make it the system default
                const adminData = admin.getAdmin();
                collections[xid].collection.thumbnail = adminData.default_thumbnail;
            }
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
        const editionData = asset.getAsset(assetId);
        const tokenId = editionData.nft.token;

        if (!(tokenId in editions)) {
            editions[tokenId] = asset.getAsset(tokenId);
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

    if (!agentData.pfp) {
        const adminData = admin.getAdmin();
        agentData.pfp = adminData.default_pfp;
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

function getCollection(collectionId, userId, config = realConfig) {
    let collection = asset.getAsset(collectionId);
    const agentData = getAgentAndCollections(collection.asset.owner, userId);
    collection = agentData.collections[collectionId];

    if (collection?.collection) {
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
    }

    return collection;
}

function getNft(xid, config = realConfig) {
    const jsonPath = path.join(config.assets, xid, 'nft.json');

    if (!fs.existsSync(jsonPath)) {
        return;
    }

    const metadataContent = fs.readFileSync(jsonPath, 'utf-8');
    const metadata = JSON.parse(metadataContent);

    metadata.token = asset.getAsset(metadata.token.xid, config);
    asset.enrichAsset(metadata.token, config); // Retrieve latest history

    const adminData = admin.getAdmin(config);
    const certId = adminData.latest;

    if (certId) {
        const cert = admin.getCert(certId, config);
        const authTime = new Date(cert.auth.time);
        const updated = new Date(metadata.asset.updated);

        if (authTime > updated) {
            metadata.cert = cert;
        }
    }

    return metadata;
}

function getAgentMinimal(xid, config = realConfig) {
    const agentData = agent.getAgent(xid, config);

    return {
        'xid': agentData.xid,
        'name': agentData.name,
        'pfp': agentData.pfp,
    }
}

function saveNft(xid, config = realConfig) {
    const assetData = asset.getAsset(xid, config);
    const tokenId = assetData.nft.token;
    const tokenData = asset.getAsset(tokenId, config);
    const collectionId = tokenData.asset.collection;
    const collectionData = asset.getAsset(collectionId, config);
    const adminData = admin.getAdmin(config);

    assetData.owner = getAgentMinimal(assetData.asset.owner, config);
    assetData.creator = getAgentMinimal(tokenData.asset.owner, config);
    assetData.token = tokenData;

    assetData.collection = {
        'xid': collectionData.xid,
        'title': collectionData.asset.title,
        'thumbnail': collectionData.collection.thumbnail,
    };

    assetData.nft.preview = `${config.link}${assetData.token.file.path}`;

    const prefix = `/${config.assets}`;

    assetData.nft.image = assetData.token.file.path.replace(prefix, "..");

    if (assetData.owner.pfp) {
        assetData.owner.image = assetData.owner.pfp.replace(prefix, "..");
    }
    else {
        assetData.owner.image = adminData.default_pfp.replace(prefix, "..");
    }

    if (assetData.creator.pfp) {
        assetData.creator.image = assetData.creator.pfp.replace(prefix, "..");
    }
    else {
        assetData.creator.image = adminData.default_pfp.replace(prefix, "..");
    }

    if (assetData.collection.thumbnail) {
        assetData.collection.image = assetData.collection.thumbnail.replace(prefix, "..");
    }
    else {
        assetData.collection.image = assetData.nft.image;
    }

    assetData.nft.link = `${config.link}/nft/${assetData.xid}`;
    assetData.token.link = `${config.link}/asset/${assetData.token.xid}`;
    assetData.collection.link = `${config.link}/collection/${assetData.collection.xid}`;
    assetData.owner.link = `${config.link}/profile/${assetData.owner.xid}`;
    assetData.creator.link = `${config.link}/profile/${assetData.creator.xid}`;

    const templatePath = path.join(config.data, 'nft.ejs');
    const template = fs.readFileSync(templatePath, 'utf8');
    const html = ejs.render(template, assetData);
    const htmlPath = path.join(config.assets, xid, 'index.html');
    fs.writeFileSync(htmlPath, html);

    assetData.asset.updated = new Date().toISOString();
    const jsonPath = path.join(config.assets, xid, 'nft.json');
    fs.writeFileSync(jsonPath, JSON.stringify(assetData, null, 2));

    return assetData;
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
        const edition = asset.getAsset(editionId);

        if (edition.asset.owner === agentId) {
            return true;
        }
    }

    return false;
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
                const assetData = await asset.createAsset(file, title, userId, collectionId);
                agent.addAsset(assetData);
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
    const tokenData = asset.getAsset(tokenId);

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
    let assetData = asset.getAsset(xid);

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

    asset.saveAsset(assetData);

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
    let assetData = asset.getAsset(xid);

    const editions = assetData.token.editions;

    for (const nftId of assetData.token.nfts) {
        const nft = asset.getAsset(nftId);
        agent.removeAsset(nft);
        asset.removeAsset(nftId);
    }

    delete assetData.token;
    asset.saveAsset(assetData);

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

function transferAsset(xid, nextOwnerId, config = realConfig) {
    const assetData = asset.getAsset(xid, config);
    assert.ok(assetData.nft);
    agent.removeAsset(assetData, config);
    assetData.asset.owner = nextOwnerId;
    assetData.nft.price = 0;
    agent.addAsset(assetData, config);
    asset.saveAsset(assetData, config);
}

async function purchaseAsset(xid, buyerId, invoice) {
    const assetData = asset.getAsset(xid);

    assert.ok(assetData.nft);
    assert.ok(invoice.payment_hash);

    const payment = await lnbits.checkPayment(invoice.payment_hash);

    if (payment?.paid) {
        transferAsset(xid, buyerId);
        saveNft(xid);
        return { ok: true, message: 'asset transferred', payment: payment };
    }
    else {
        return { ok: false, message: 'invoice not paid' };
    }
}

async function payoutSale(xid, buyerId, sellerId, invoice) {
    const assetData = asset.getAsset(xid);
    const buyer = agent.getAgent(buyerId);
    const seller = agent.getAgent(sellerId);
    const price = invoice.amount;

    assert.ok(assetData.nft);
    assert.ok(price > 0);

    const tokenData = asset.getAsset(assetData.nft.token);
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
                agent.addCredits(creator.xid, royalty);
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
        agent.addCredits(seller.xid, payout);
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

    asset.saveHistory(assetData.nft.token, record);
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
    asset.saveAsset(collection);
}

function removeCollection(collection) {
    assert.ok(collection.collection);

    agent.removeAsset(collection);
    asset.removeAsset(collection.xid);
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
            const nft = asset.getAsset(listing.asset);

            if (!nft) {
                continue;
            }

            if (nft.asset.owner !== listing.agent) {
                continue;
            }

            if (nft.nft.price !== listing.price) {
                continue;
            }

            const token = asset.getAsset(nft.nft.token);

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
    allAgents,
    allAssets,
    createAssets,
    createCollection,
    getAgentAndCollections,
    getAllAgents,
    getCollection,
    getListings,
    getNft,
    integrityCheck,
    isOwner,
    mintToken,
    payoutSale,
    purchaseAsset,
    removeCollection,
    saveCollection,
    saveNft,
    transferAsset,
    unmintToken,
};
