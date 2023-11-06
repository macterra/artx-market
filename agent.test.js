const fs = require('fs');
const path = require('path');
const mockFs = require('mock-fs');
const agent = require('./agent');
const config = require('./test-config');

describe('createAgent', () => {
    afterEach(() => {
        mockFs.restore();
    });

    it('initializes and saves an agent', async () => {
        // Arrange
        const mockKey = 'mockKey';

        const expectedAgentData = {
            xid: expect.any(String),
            pubkey: mockKey,
            name: config.newUser,
            tagline: '',
            description: '',
            credits: config.initialCredits,
            depositToCredits: true,
            created: expect.any(String),
            updated: expect.any(String),
        };

        // Mock the file system
        mockFs({
            [config.agents]: {}
        });

        // Act
        const agentData = await agent.createAgent(mockKey, config);

        // Assert
        expect(agentData).toEqual(expectedAgentData);
    });
});

describe('getAgent', () => {

    afterEach(() => {
        mockFs.restore();
    });

    it('should return the agent data if the agent exists', () => {
        const xid = 'testXid';
        const agentData = { name: 'Test Agent' };

        // Mock the file system
        mockFs({
            [config.agents]: {
                [xid]: {
                    'agent.json': JSON.stringify(agentData),
                },
            }
        });

        const result = agent.getAgent(xid, config);

        expect(result).toEqual(agentData);
    });

    it('should return null if the agent does not exist', () => {
        const xid = 'testXid';

        // Mock the file system
        mockFs({
            [config.agents]: {}  // Empty directory
        });

        const result = agent.getAgent(xid, config);

        expect(result).toBeNull();
    });
});

describe('saveAgent', () => {

    afterEach(() => {
        mockFs.restore();
    });

    it('should save the agent data', () => {
        const agentData = { xid: 'testXid', name: 'Test Agent' };

        // Mock the file system
        mockFs({
            [config.agents]: {}  // Empty directory
        });

        agent.saveAgent(agentData, config);

        // Read the data that was written to agent.json and check that it matches the expected data
        const agentJsonPath = path.join(config.agents, agentData.xid, 'agent.json');
        const writtenData = JSON.parse(fs.readFileSync(agentJsonPath, 'utf-8'));
        expect(writtenData).toEqual({ ...agentData, updated: expect.any(String) });
    });
});

describe('getAssets', () => {

    afterEach(() => {
        mockFs.restore();
    });

    it('should return the assets of the specified xid', () => {
        const xid = 'testXid';
        const assets = {
            owner: xid,
            created: ['asset1', 'asset2'],
            collected: ['asset3'],
            collections: ['collection1'],
        };
        mockFs({
            [config.agents]: {
                [xid]: {
                    'assets.json': JSON.stringify(assets),
                },
            }
        });

        const result = agent.getAssets(xid, config);

        expect(result).toEqual(assets);
    });

    it('should return a new assets object if the assets file does not exist', () => {
        const xid = 'testXid';
        mockFs({
            [config.agents]: {}  // Empty directory
        });

        const expectedAssets = {
            owner: xid,
            created: [],
            collected: [],
            collections: [],
        };

        const result = agent.getAssets(xid, config);

        expect(result).toEqual(expectedAssets);
    });
});

describe('saveAssets', () => {

    afterEach(() => {
        mockFs.restore();
    });

    it('should save the assets', () => {
        const assets = {
            owner: 'testXid',
            created: ['asset1', 'asset2'],
            collected: ['asset3'],
            collections: ['collection1'],
        };
        mockFs({
            [config.agents]: {}  // Empty directory
        });

        agent.saveAssets(assets, config);

        // Read the data that was written to assets.json and check that it matches the expected data
        const jsonPath = path.join(config.agents, assets.owner, 'assets.json');
        const writtenData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        expect(writtenData).toEqual({ ...assets, updated: expect.any(String) });
    });
});

describe('addAsset', () => {

    afterEach(() => {
        mockFs.restore();
    });

    it('should add the asset to the appropriate list', () => {
        const assets = {
            owner: 'testXid',
            created: [],
            collected: [],
            collections: [],
        };

        const fileAsset = {
            xid: 'xid1',
            asset: { owner: assets.owner },
            file: {},
        };

        const nftAsset = {
            xid: 'xid2',
            asset: { owner: assets.owner },
            nft: {},
        };

        const collectionAsset = {
            xid: 'xid3',
            asset: { owner: assets.owner },
            collection: {},
        };

        // Mock the file system
        mockFs({
            [config.agents]: {
                [assets.owner]: {
                    'assets.json': JSON.stringify(assets),
                },
            }
        });

        agent.addAsset(fileAsset, config);
        agent.addAsset(nftAsset, config);
        agent.addAsset(collectionAsset, config);

        // Read the data that was written to assets.json and check that it contains the new asset
        const jsonPath = path.join(config.agents, assets.owner, 'assets.json');
        const writtenData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        expect(writtenData.created).toContain(fileAsset.xid);
        expect(writtenData.collected).toContain(nftAsset.xid);
        expect(writtenData.collections).toContain(collectionAsset.xid);

        // Add them again and ensure no duplicates
        agent.addAsset(fileAsset, config);
        agent.addAsset(nftAsset, config);
        agent.addAsset(collectionAsset, config);

        const dupeCheck = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        expect(dupeCheck.created).toEqual([fileAsset.xid]);
        expect(dupeCheck.collected).toEqual([nftAsset.xid]);
        expect(dupeCheck.collections).toEqual([collectionAsset.xid]);
    });

    it('should not add the asset if its type is unknown', () => {
        const assets = {
            owner: 'testXid',
            created: [],
            collected: [],
            collections: [],
        };
        const metadata = {
            xid: 'testAsset',
            asset: { owner: assets.owner },
        };

        // Mock the file system
        mockFs({
            [config.agents]: {
                [assets.owner]: {
                    'assets.json': JSON.stringify(assets),
                },
            }
        });

        agent.addAsset(metadata, config);

        // Read the data that was written to assets.json and check that it does not contain the new asset
        const jsonPath = path.join(config.agents, assets.owner, 'assets.json');
        const writtenData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        expect(writtenData.created).not.toContain(metadata.xid);
        expect(writtenData.collected).not.toContain(metadata.xid);
        expect(writtenData.collections).not.toContain(metadata.xid);
    });
});

describe('removeAsset', () => {

    afterEach(() => {
        mockFs.restore();
    });

    it('should remove the asset from the appropriate list', () => {

        const assets = {
            owner: 'testXid',
            created: [],
            collected: [],
            collections: [],
        };

        const fileAsset = {
            xid: 'xid1',
            asset: { owner: assets.owner },
            file: {},
        };

        const nftAsset = {
            xid: 'xid2',
            asset: { owner: assets.owner },
            nft: {},
        };

        const collectionAsset = {
            xid: 'xid3',
            asset: { owner: assets.owner },
            collection: {},
        };

        assets.created = [fileAsset.xid];
        assets.collected = [nftAsset.xid];
        assets.collections = [collectionAsset.xid];

        // Mock the file system
        mockFs({
            [config.agents]: {
                [assets.owner]: {
                    'assets.json': JSON.stringify(assets),
                },
            }
        });

        agent.removeAsset(fileAsset, config);
        agent.removeAsset(nftAsset, config);
        agent.removeAsset(collectionAsset, config);

        // Read the data that was written to assets.json and check that it does not contain the removed asset
        const jsonPath = path.join(config.agents, assets.owner, 'assets.json');
        const writtenData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        expect(writtenData.created).not.toContain(fileAsset.xid);
        expect(writtenData.collected).not.toContain(nftAsset.xid);
        expect(writtenData.collections).not.toContain(collectionAsset.xid);
    });

    it('should not modify the assets if the asset type is unknown', () => {
        const assets = {
            owner: 'testXid',
            created: ['testAsset'],
            collected: [],
            collections: [],
        };
        const metadata = {
            xid: 'testAsset',
            asset: { owner: assets.owner },
        };

        // Mock the file system
        mockFs({
            [config.agents]: {
                [assets.owner]: {
                    'assets.json': JSON.stringify(assets),
                },
            }
        });

        agent.removeAsset(metadata, config);

        // Read the data that was written to assets.json and check that it still contains the asset
        const jsonPath = path.join(config.agents, assets.owner, 'assets.json');
        const writtenData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        expect(writtenData.created).toContain(metadata.xid);
    });
});

describe('getTxnLog', () => {

    afterEach(() => {
        mockFs.restore();
    });

    it('should return the transaction log for the specified user', () => {
        const userId = 'testUser';
        const log = [
            { event: 'event1' },
            { event: 'event2' },
        ];

        // Mock the file system
        mockFs({
            [config.agents]: {
                [userId]: {
                    'txnlog.jsonl': log.map(JSON.stringify).join('\n'),
                },
            }
        });

        const result = agent.getTxnLog(userId, config);

        expect(result).toEqual(log.reverse());
    });

    it('should return an empty array if the transaction log does not exist', () => {
        const userId = 'testUser';

        // Mock the file system
        mockFs({
            [config.agents]: {}  // Empty directory
        });

        const result = agent.getTxnLog(userId, config);

        expect(result).toEqual([]);
    });
});

describe('saveTxnLog', () => {
    const config = {
        agents: 'testAgents',
    };

    afterEach(() => {
        mockFs.restore();
    });

    it('should append the record to the transaction log', () => {
        const xid = 'testXid';
        const record = { event: 'event1' };

        // Mock the file system
        mockFs({
            [config.agents]: {
                [xid]: {
                    'txnlog.jsonl': '',
                },
            }
        });

        agent.saveTxnLog(xid, record, config);

        // Read the data that was written to txnlog.jsonl and check that it matches the expected data
        const jsonlPath = path.join(config.agents, xid, 'txnlog.jsonl');
        const writtenData = fs.readFileSync(jsonlPath, 'utf-8');
        const writtenRecord = JSON.parse(writtenData.trim());
        expect(writtenRecord).toEqual({ ...record, time: expect.any(String) });
    });
});
