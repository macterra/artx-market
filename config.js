const dotenv = require('dotenv');

dotenv.config();

const config = {
    host: process.env.ARTX_HOST || 'localhost',
    port: process.env.ARTX_PORT || 5000,
    ipfs: process.env.IPFS_HOST || 'localhost',
    archiver: process.env.ARCHIVER || 'http://localhost:5115',
    depositAddress: process.env.TXN_FEE_DEPOSIT,
    txnFeeRate: process.env.TXN_FEE_RATE || 0.025,
    storageRate: process.env.STORAGE_RATE || 0.001,
    editionRate: process.env.EDITION_RATE || 100,
    uploadRate: process.env.STORAGE_RATE || 0.0001,
    data: 'data',
    uploads: 'data/uploads',
    assets: 'data/assets',
    agents: 'data/agents',
    certs: 'data/certs',
    id: 'data/id',
    defaultPfp: 'data/defaultPfp.png',
    initialCredits: 10000,
};

module.exports = config;