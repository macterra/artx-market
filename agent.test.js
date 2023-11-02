const fs = require('fs');
const path = require('path');
const mockFs = require('mock-fs');
const agent = require('./agent');

describe('getAssets', () => {
    const config = {
        agents: 'testAgents',
    };

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
    const config = {
        agents: 'testAgents',
    };

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
    const config = {
        agents: 'testAgents',
    };

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
