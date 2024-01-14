const path = require('path');
const fs = require('fs');
const assert = require('assert');
const sharp = require('sharp');
const crypto = require('crypto');
const uuid = require('uuid');
const admin = require('./admin');
const realConfig = require('./config');
const ejs = require('ejs');

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

    return metadata;
}

function removeAsset(xid, config = realConfig) {
    const assetPath = path.join(config.assets, xid);

    fs.rmSync(assetPath, { recursive: true, force: true });

    //console.log(`Removed asset: ${assetPath}`);
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

function saveHistory(xid, record, config = realConfig) {
    record.time = new Date().toISOString();
    const recordString = JSON.stringify(record);
    const jsonlPath = path.join(config.assets, xid, 'history.jsonl');
    fs.appendFileSync(jsonlPath, recordString + '\n');
}

module.exports = {
    createAsset,
    enrichAsset,
    getAsset,
    getHistory,
    removeAsset,
    saveAsset,
    saveHistory,
};
