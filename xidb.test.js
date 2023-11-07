const uuid = require('uuid');
const fs = require('fs');
const path = require('path');
const mockFs = require('mock-fs');

const xidb = require('./xidb');
const config = require('./test-config');

describe('allAssets', () => {

    afterEach(() => {
        mockFs.restore();
    });

    it('should return the names of all directories in the assets directory', () => {
        const directories = ['dir1', 'dir2', 'dir3'];
        mockFs({
            [config.assets]: {
                'dir1': {},
                'dir2': {
                    'file1.txt': 'content',
                    'file2.txt': 'more content'
                },
                'dir3': {},
                'file1.txt': 'content',
            }
        });

        const result = xidb.allAssets(config);

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
            [config.agents]: {
                'dir1': {},
                'dir2': {
                    'file1.txt': 'content',
                    'file2.txt': 'more content'
                },
                'dir3': {},
                'file1.txt': 'content',
            }
        });

        const result = xidb.allAgents(config);

        expect(result).toEqual(directories);
    });
});

describe('transferAsset', () => {
    afterEach(() => {
        mockFs.restore();
    });

    it('transfers an asset from one owner to another', () => {
        // Arrange
        const mockNftXid = 'mockNftXid';
        const mockPrevOwnerId = 'mockPrevOwnerId';
        const mockNextOwnerId = 'mockNextOwnerId';
        const mockAssetData = {
            xid: mockNftXid,
            nft: { price: 100 },
            asset: { owner: mockPrevOwnerId }
        };

        const expectedAssetData = {
            xid: mockNftXid,
            nft: { price: 0 },
            asset: { owner: mockNextOwnerId, updated: expect.any(String) },
        };

        const expectedPrevAssetsData = {
            owner: mockPrevOwnerId,
            collected: [],
            updated: expect.any(String),
        };

        const expectedNextAssetsData = {
            owner: mockNextOwnerId,
            collected: [mockNftXid],
            updated: expect.any(String),
        };

        mockFs({
            [config.assets]: {
                [mockNftXid]: {
                    'meta.json': JSON.stringify(mockAssetData),
                },
            },
            [config.agents]: {
                [mockPrevOwnerId]: {
                    'agent.json': JSON.stringify({
                        xid: mockPrevOwnerId,
                        name: mockPrevOwnerId,
                        pfp: mockPrevOwnerId,
                    }),
                    'assets.json': JSON.stringify({
                        owner: mockPrevOwnerId,
                        collected: [mockNftXid]
                    })
                },
                [mockNextOwnerId]: {
                    'agent.json': JSON.stringify({
                        xid: mockNextOwnerId,
                        name: mockNextOwnerId,
                        pfp: mockNextOwnerId,
                    }),
                    'assets.json': JSON.stringify({
                        owner: mockNextOwnerId,
                        collected: []
                    })
                },
            }
        });

        // Act
        xidb.transferAsset(mockNftXid, mockNextOwnerId, config);

        // Assert
        // Read the data that was written to meta.json and check that it matches the expected data
        const assetJsonPath = path.join(config.assets, mockAssetData.xid, 'meta.json');
        const assetData = JSON.parse(fs.readFileSync(assetJsonPath, 'utf-8'));
        expect(assetData).toEqual(expectedAssetData);

        const prevAssetsJsonPath = path.join(config.agents, mockPrevOwnerId, 'assets.json');
        const prevAssets = JSON.parse(fs.readFileSync(prevAssetsJsonPath, 'utf-8'));
        expect(prevAssets).toEqual(expectedPrevAssetsData);

        const nextAssetsJsonPath = path.join(config.agents, mockNextOwnerId, 'assets.json');
        const nextAssets = JSON.parse(fs.readFileSync(nextAssetsJsonPath, 'utf-8'));
        expect(nextAssets).toEqual(expectedNextAssetsData);
    });
});
