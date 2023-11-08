const uuid = require('uuid');

const config = {
    name: 'testName',
    host: 'testHost',
    data: 'testData',
    link: 'http://testLink',
    assets: 'testData/assets',
    agents: 'testData/agents',
    certs: 'testData/certs',
    uploads: 'testData/uploads',
    dns_ns: uuid.v4(),
    block_link: 'http://block-link',
    txn_link: 'http://txn-link',
    ipfs_link: 'http://ipfs-link',
    newUser: 'TestUser',
    initialCredits: 999,
};

module.exports = config;
