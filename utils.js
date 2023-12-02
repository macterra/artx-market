const uuid = require('uuid');
const bs58 = require('bs58');

const realConfig = require('./config');

function getMarketId(config = realConfig) {
    return uuid.v5(config.name || config.host, config.dns_ns);
}

function uuidToBase58(uuidString) {
    // Parse the UUID and convert it to bytes
    const bytes = uuid.parse(uuidString);

    // Convert the bytes to base58
    const base58 = bs58.encode(Buffer.from(bytes));

    return base58;
}

function base58ToUuid(base58String) {
    // Decode the base58 string back to bytes
    const bytes = bs58.decode(base58String);

    // Convert the bytes back to a UUID
    const uuidString = uuid.stringify(bytes);

    return uuidString;
}

function getAgentId(key, config = realConfig) {
    const namespace = getMarketId(config);
    const userId = uuid.v5(key.toString(), namespace);
    return userId;
}

module.exports = {
    base58ToUuid,
    getAgentId,
    getMarketId,
    uuidToBase58,
};
