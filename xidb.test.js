const uuid = require('uuid');
const fs = require('fs');
const path = require('path');
const mockFs = require('mock-fs');

const xidb = require('./xidb');
const archiver = require('./archiver');
const utils = require('./utils');

const testConfig = {
    name: 'testName',
    host: 'testHost',
    data: 'testData',
    assets: 'testData/assets',
    agents: 'testData/agents',
    certs: 'testData/certs',
    dns_ns: uuid.v4(),
    block_link: 'http://block-link',
    txn_link: 'http://txn-link',
    ipfs_link: 'http://ipfs-link',
};

describe('allAssets', () => {

    afterEach(() => {
        mockFs.restore();
    });

    it('should return the names of all directories in the assets directory', () => {
        const directories = ['dir1', 'dir2', 'dir3'];
        mockFs({
            [testConfig.assets]: {
                'dir1': {},
                'dir2': {
                    'file1.txt': 'content',
                    'file2.txt': 'more content'
                },
                'dir3': {},
                'file1.txt': 'content',
            }
        });

        const result = xidb.allAssets(testConfig);

        expect(result).toEqual(directories);
    });
});

describe('allAgents', () => {

    afterEach(() => {
        mockFs.restore();
    });

    it('should return the names of all directories in the agents directory', () => {
        const directories = ['dir1', 'dir2', 'dir3'];
        mockFs({
            [testConfig.agents]: {
                'dir1': {},
                'dir2': {
                    'file1.txt': 'content',
                    'file2.txt': 'more content'
                },
                'dir3': {},
                'file1.txt': 'content',
            }
        });

        const result = xidb.allAgents(testConfig);

        expect(result).toEqual(directories);
    });
});

describe('getAsset', () => {

    afterEach(() => {
        mockFs.restore();
    });

    it('should return the metadata of the specified asset', () => {
        const xid = 'testXid';
        const metadata = { key: 'value' };
        mockFs({
            [testConfig.assets]: {
                [xid]: {
                    'meta.json': JSON.stringify(metadata),
                },
            }
        });

        const result = xidb.getAsset(xid, testConfig);

        expect(result).toEqual(metadata);
    });

    it('should return null if the specified asset does not exist', () => {
        mockFs({
            [testConfig.assets]: {}  // Empty directory
        });

        const result = xidb.getAsset('nonexistentXid', testConfig);

        expect(result).toBeNull();
    });
});

describe('getHistory', () => {

    afterEach(() => {
        mockFs.restore();
    });

    it('should return the history of the specified asset', () => {
        const xid = 'testXid';
        const history = [
            { event: 'event1' },
            { event: 'event2' },
            { event: 'event3' }
        ];
        const historyJsonl = history.map(JSON.stringify).join('\n');
        mockFs({
            [testConfig.assets]: {
                [xid]: {
                    'history.jsonl': historyJsonl,
                },
            }
        });

        const result = xidb.getHistory(xid, testConfig);

        expect(result).toEqual(history.reverse());
    });

    it('should return an empty array if the history file does not exist', () => {
        mockFs({
            [testConfig.assets]: {}  // Empty directory
        });

        const result = xidb.getHistory('nonexistentXid', testConfig);

        expect(result).toEqual([]);
    });
});

describe('saveAsset', () => {

    afterEach(() => {
        mockFs.restore();
    });

    it('should save the asset metadata if it is different from the current metadata', () => {
        const metadata = {
            xid: 'testXid',
            asset: { owner: 'owner1' },
        };

        // Mock the file system
        mockFs({
            [testConfig.assets]: {}  // Empty directory
        });

        xidb.saveAsset(metadata, testConfig);

        const expectedMetadata = {
            xid: 'testXid',
            asset: {
                owner: 'owner1',
                updated: expect.any(String)
            },
        };

        // Read the data that was written to meta.json and check that it matches the expected data
        const assetJsonPath = path.join(testConfig.assets, metadata.xid, 'meta.json');
        const writtenData = JSON.parse(fs.readFileSync(assetJsonPath, 'utf-8'));
        expect(writtenData).toEqual(expectedMetadata);
    });
});

describe('getCert', () => {

    afterEach(() => {
        mockFs.restore();
    });

    it('should return the certificate of the specified xid', () => {
        const xid = 'testXid';
        const cert = {
            auth: {
                blockhash: 'testBlockhash',
                tx: { txid: 'testTxid' },
                cid: 'testCid',
            },
        };
        const certJson = JSON.stringify(cert);
        mockFs({
            [testConfig.certs]: {
                [xid]: {
                    'meta.json': certJson,
                },
            },
        });

        const expectedCert = {
            ...cert,
            block_link: `${testConfig.block_link}/${cert.auth.blockhash}`,
            txn_link: `${testConfig.txn_link}/${cert.auth.tx.txid}`,
            ipfs_link: `${testConfig.ipfs_link}/${cert.auth.cid}`,
        };

        const result = xidb.getCert(xid, testConfig);

        expect(result).toEqual(expectedCert);
    });
});

describe('enrichAsset', () => {

    afterEach(() => {
        mockFs.restore();
    });

    it('should enrich the asset metadata', () => {
        const metadata = {
            xid: 'testXid',
            asset: { owner: 'owner1' },
            token: { nfts: ['nft1', 'nft2'] },
        };
        const history = [{ event: 'event1' }];
        const nft = { asset: { owner: 'owner2' } };

        // Mock the file system
        mockFs({
            [testConfig.assets]: {
                [metadata.xid]: {
                    'history.jsonl': history.map(JSON.stringify).join('\n')
                },
                'nft1': {
                    'meta.json': JSON.stringify(nft),
                },
                'nft2': {
                    'meta.json': JSON.stringify(nft),
                }
            }
        });

        const expectedMetadata = {
            ...metadata,
            history,
            owners: 2,
            sold: true,
        };

        xidb.enrichAsset(metadata, testConfig);

        expect(metadata).toEqual(expectedMetadata);
    });

    it('should detect single owner', () => {
        const metadata = {
            xid: 'testXid',
            asset: { owner: 'owner1' },
            token: { nfts: ['nft1', 'nft2'] },
        };
        const history = [{ event: 'event1' }];
        const nft = { asset: { owner: 'owner1' } };

        // Mock the file system
        mockFs({
            [testConfig.assets]: {
                [metadata.xid]: {
                    'history.jsonl': history.map(JSON.stringify).join('\n')
                },
                'nft1': {
                    'meta.json': JSON.stringify(nft),
                },
                'nft2': {
                    'meta.json': JSON.stringify(nft),
                }
            }
        });

        const expectedMetadata = {
            ...metadata,
            history,
            owners: 1,
            sold: false,
        };

        xidb.enrichAsset(metadata, testConfig);

        expect(metadata).toEqual(expectedMetadata);
    });

    it('should not modify the metadata if it does not have a token', () => {
        const metadata = {
            xid: 'testXid',
            asset: { owner: 'owner1' },
        };

        mockFs({});  // Empty file system

        const expectedMetadata = { ...metadata };

        xidb.enrichAsset(metadata, testConfig);

        expect(metadata).toEqual(expectedMetadata);
    });
});
