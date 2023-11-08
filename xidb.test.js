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
                    'assets.json': JSON.stringify({
                        owner: mockPrevOwnerId,
                        collected: [mockNftXid]
                    })
                },
                [mockNextOwnerId]: {
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

describe('saveNft', () => {
    afterEach(() => {
        // Restore the real file system after each test
        mockFs.restore();
    });

    it('saves an NFT', () => {
        // Arrange
        const mockNftXid = 'mockNftXid';
        const mockTokenXid = 'mockTokenXid';
        const mockCollectionXid = 'mockCollectionXid';
        const mockOwnerXid = 'mockOwnerXid';
        const mockCreatorXid = 'mockCreatorXid';

        const mockNftData = {
            xid: mockNftXid,
            asset: { owner: mockOwnerXid },
            nft: { token: mockTokenXid }
        };

        const prefix = `/${config.assets}`;

        const mockTokenData = {
            xid: mockTokenXid,
            asset: { owner: mockCreatorXid, collection: mockCollectionXid },
            file: { path: path.join(prefix, 'mockPreviewImage') }
        };

        const mockCollectionData = {
            xid: mockCollectionXid,
            asset: {
                title: 'mockCollection'
            },
            collection: {
                thumbnail: path.join(prefix, 'mockCollectionThumbnail')
            }
        };

        const mockOwnerData = {
            xid: mockOwnerXid,
            name: 'mockOwner',
            pfp: path.join(prefix, 'mockOwnerPfp'),
        };

        const mockCreatorData = {
            xid: mockCreatorXid,
            name: 'mockCreator',
            pfp: path.join(prefix, 'mockCreatorPfp'),
        };

        const mockAdminData = {
            default_pfp: 'mockDefaultPfp',
            default_thumbnail: 'mockDefaultThumbnail',
        };

        const mockTemplate = 'mockTemplate';

        const expectedNftData = {
            xid: mockNftXid,
            asset: {
                owner: mockOwnerData.xid,
                updated: expect.any(String),
            },
            nft: {
                token: mockTokenData.xid,
                preview: `${config.link}${mockTokenData.file.path}`,
                image: '../mockPreviewImage',
                link: `${config.link}/nft/${mockNftXid}`,
            },
            owner: {
                ...mockOwnerData,
                image: '../mockOwnerPfp',
                link: `${config.link}/profile/${mockOwnerData.xid}`,
            },
            creator: {
                ...mockCreatorData,
                image: '../mockCreatorPfp',
                link: `${config.link}/profile/${mockCreatorData.xid}`,
            },
            token: {
                ...mockTokenData,
                link: `${config.link}/asset/${mockTokenData.xid}`,
            },
            collection: {
                xid: mockCollectionData.xid,
                title: mockCollectionData.asset.title,
                thumbnail: mockCollectionData.collection.thumbnail,
                image: '../mockCollectionThumbnail',
                link: `${config.link}/collection/${mockCollectionData.xid}`,
            }
        }

        // Mock the file system
        mockFs({
            [config.data]: {
                'nft.ejs': mockTemplate,
                'meta.json': JSON.stringify(mockAdminData),
            },
            [config.assets]: {
                [mockNftXid]: { 'meta.json': JSON.stringify(mockNftData) },
                [mockTokenXid]: { 'meta.json': JSON.stringify(mockTokenData) },
                [mockCollectionXid]: { 'meta.json': JSON.stringify(mockCollectionData) },
            },
            [config.agents]: {
                [mockOwnerXid]: { 'agent.json': JSON.stringify(mockOwnerData) },
                [mockCreatorXid]: { 'agent.json': JSON.stringify(mockCreatorData) },
            }
        });

        // Act
        const nftData = xidb.saveNft(mockNftXid, config);

        // Assert
        expect(nftData).toEqual(expectedNftData);

        const nftJsonPath = path.join(config.assets, mockNftData.xid, 'nft.json');
        const nftSavedData = JSON.parse(fs.readFileSync(nftJsonPath, 'utf-8'));
        expect(nftSavedData).toEqual(expectedNftData);

        const nftHtmlPath = path.join(config.assets, mockNftData.xid, 'index.html');
        const nftHtmlData = fs.readFileSync(nftHtmlPath, 'utf-8');
        expect(nftHtmlData).toEqual(mockTemplate);
    });
});
