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

function getAgentId(key, config = realConfig) {
    const namespace = getMarketId(config);
    const userId = uuid.v5(key.toString(), namespace);
    return userId;
}

module.exports = {
    getAgentId,
    getMarketId,
    uuidToBase58,
};
