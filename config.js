const dotenv = require('dotenv');

dotenv.config();

const config = {
    name: process.env.ARTX_NAME,
    host: process.env.ARTX_HOST || 'localhost',
    port: process.env.ARTX_PORT ? parseInt(process.env.ARTX_PORT, 10) : 5000,
    link: process.env.ARTX_LINK || 'http://localhost:5000',
    ipfs: process.env.IPFS_HOST || 'localhost',
    archiver: process.env.ARCHIVER || 'http://localhost:5115',
    block_link: process.env.BLOCK_LINK || 'https://mempool.space/block',
    txn_link: process.env.TXN_LINK || 'https://mempool.space/tx',
    ipfs_link: process.env.IPFS_LINK || 'https://ipfs.io/ipfs',
    depositAddress: process.env.TXN_FEE_DEPOSIT,
    txnFeeRate: process.env.TXN_FEE_RATE ? parseFloat(process.env.TXN_FEE_RATE) : 0.025,
    storageRate: process.env.STORAGE_RATE ? parseFloat(process.env.STORAGE_RATE) : 0.001,
    editionRate: process.env.EDITION_RATE ? parseInt(process.env.EDITION_RATE, 10) : 100,
    uploadRate: process.env.STORAGE_RATE ? parseFloat(process.env.STORAGE_RATE) : 0.0001,
    promoteFee: process.env.PROMOTE_FEE ? parseInt(process.env.PROMOTE_FEE, 10) : 100,
    ln_host: process.env.LN_HOST,
    ln_wallet: process.env.LN_WALLET,
    ln_api_key: process.env.LN_API_KEY,
    ln_admin_key: process.env.LN_ADMIN_KEY,
    nostr_key: process.env.NOSTR_KEY,
    nostr_relays: process.env.NOSTR_RELAYS,
    nostr_announce: process.env.NOSTR_ANNOUNCE,
    data: 'data',
    uploads: 'data/uploads',
    assets: 'data/assets',
    agents: 'data/agents',
    certs: 'data/certs',
    newUser: 'GuestUser',
    initialCredits: 10000,
    dns_ns: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    notarize_frequency: process.env.NOTARIZE_FREQUENCY ? parseInt(process.env.NOTARIZE_FREQUENCY, 10) : 24,
    notarize_min_fee: process.env.NOTARIZE_MIN_FEE ? parseInt(process.env.NOTARIZE_MIN_FEE, 10) : 1,
    notarize_max_fee: process.env.NOTARIZE_MAX_FEE ? parseInt(process.env.NOTARIZE_MAX_FEE, 10) : 10,
    notarize_rbf_rate: process.env.NOTARIZE_RBF_RATE ? parseInt(process.env.NOTARIZE_RBF_RATE, 10) : 1,
    discordLink: process.env.DISCORD_LINK || 'https://discord.gg/kVEhkywupg',
    followLink: process.env.FOLLOW_LINK || 'https://twitter.com/artxmarket',
    issuesLink: process.env.ISSUES_LINK || 'https://github.com/macterra/artx-market/issues',
    helpLink: process.env.HELP_LINK || 'https://github.com/macterra/artx-market/wiki/Getting-Started',
};

module.exports = config;
