const uuid = require('uuid');
const fs = require('fs');
const path = require('path');
const mockFs = require('mock-fs');

const xidb = require('./xidb');
const utils = require('./utils');
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

describe('saveAssetPage', () => {
    it('returns an asset page', () => {
        const metadata = {
            xid: 'testXid',
            asset: {
                title: 'mockTitle',
            },
            file: {
                fileName: '_.png',
            }
        };

        const mockTemplate = `
        <!DOCTYPE html>
        <html>
            <head>
                <title><%= asset.title %></title>
            </head>
            <body>
                <a href="<%= asset.link %>"><%= asset.title %></a>
                <img src="<%= asset.image %>" />
            </body>
        </html>`;

        const expectedHtml = `
        <!DOCTYPE html>
        <html>
            <head>
                <title>${metadata.asset.title}</title>
            </head>
            <body>
                <a href="${config.link}/asset/${metadata.xid}">${metadata.asset.title}</a>
                <img src="${config.link}/data/assets/${metadata.xid}/${metadata.file.fileName}" />
            </body>
        </html>`;

        // Mock the file system
        mockFs({
            [config.data]: {
                'asset.ejs': mockTemplate,
            },
            [config.assets]: {
                [metadata.xid]: {
                    'meta.json': JSON.stringify(metadata),
                },
            }
        });

        const html = xidb.getAssetPage(metadata.xid, config);

        expect(html).toEqual(expectedHtml);
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
        const mockTimestamp = new Date().toISOString();

        const mockNftData = {
            xid: mockNftXid,
            asset: { owner: mockOwnerXid, created: mockTimestamp, updated: mockTimestamp },
            nft: { token: mockTokenXid, title: 'mockNftTitle' }
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

        const mockTemplate = `
        <!DOCTYPE html>
        <html>
            <head>
                <title><%= nft.title %></title>
            </head>
            <body>
                <h1><%= nft.title %></h1>
                <p>Owner: <%= owner.name %></p>
                <p>Creator: <%= creator.name %></p>
            </body>
        </html>`;

        const expectedHtml = `
        <!DOCTYPE html>
        <html>
            <head>
                <title>${mockNftData.nft.title}</title>
            </head>
            <body>
                <h1>${mockNftData.nft.title}</h1>
                <p>Owner: ${mockOwnerData.name}</p>
                <p>Creator: ${mockCreatorData.name}</p>
            </body>
        </html>`;

        const expectedNftData = {
            xid: mockNftXid,
            asset: {
                owner: mockOwnerData.xid,
                created: expect.any(String),
                updated: expect.any(String),
            },
            nft: {
                token: mockTokenData.xid,
                title: mockNftData.nft.title,
                preview: `${config.link}${mockTokenData.file.path}`,
                image: '../mockPreviewImage',
                link: `${config.link}/nft/${mockNftXid}`,
                minted: expect.any(String),
                collected: expect.any(String),
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
        expect(nftHtmlData).toEqual(expectedHtml);
    });
});

describe('getNft', () => {
    const mockNftXid = 'mockNftXid';
    const mockTokenXid = 'mockTokenXid';
    const mockCertXid = 'mockCertXid';
    const mockNftData = { token: { xid: mockTokenXid }, asset: { updated: '2023-05-01T00:00:00Z' } };
    const mockTokenData = { xid: mockTokenXid };
    const mockAdminData = { latest: mockCertXid };
    const mockCertData1 = { auth: { time: '2023-06-02T00:00:00Z', blockhash: 'mockBlockhash', tx: { txid: 'mockTxid' }, cid: 'mockCid' } };
    const mockCertData2 = { auth: { time: '2023-04-02T00:00:00Z', blockhash: 'mockBlockhash', tx: { txid: 'mockTxid' }, cid: 'mockCid' } };

    afterEach(() => {
        // Restore the real file system after each test
        mockFs.restore();
    });

    it('returns the metadata with the cert if the cert auth time is later than the asset updated time', () => {

        // Mock the file system
        mockFs({
            [config.data]: {
                'meta.json': JSON.stringify(mockAdminData),
            },
            [config.certs]: {
                [mockCertXid]: {
                    'meta.json': JSON.stringify(mockCertData1),
                },
            },
            [config.assets]: {
                [mockTokenXid]: {
                    'meta.json': JSON.stringify(mockTokenData),
                },
                [mockNftXid]: {
                    'nft.json': JSON.stringify(mockNftData),
                },
            },
        });

        const expectedNftData = {
            ...mockNftData,
            cert: {
                ...mockCertData1,
                block_link: `${config.block_link}/mockBlockhash`,
                ipfs_link: `${config.ipfs_link}/mockCid`,
                txn_link: `${config.txn_link}/mockTxid`,
            }
        };

        const nftData = xidb.getNft(mockNftXid, config);

        // Assert
        expect(nftData).toEqual(expectedNftData);
    });

    it('returns the metadata without the cert if the cert auth time is earlier than the asset updated time', () => {

        // Mock the file system
        mockFs({
            [config.data]: {
                'meta.json': JSON.stringify(mockAdminData),
            },
            [config.certs]: {
                [mockCertXid]: {
                    'meta.json': JSON.stringify(mockCertData2),
                },
            },
            [config.assets]: {
                [mockTokenXid]: {
                    'meta.json': JSON.stringify(mockTokenData),
                },
                [mockNftXid]: {
                    'nft.json': JSON.stringify(mockNftData),
                },
            },
        });

        const nftData = xidb.getNft(mockNftXid, config);

        // Assert
        expect(nftData).toEqual(mockNftData);
    });

    // Add more tests for different scenarios...
});

describe('mergeAgents', () => {

    afterEach(() => {
        mockFs.restore();
    });

    it('throws an error on invalid agent id', () => {
        expect(() => xidb.mergeAgents('unknownId', config)).toThrow();
    });

    it('throws an error when merge unauthorized', () => {

        const mockAgentId = uuid.v4();
        const mergeId = utils.uuidToBase58(mockAgentId);

        const sourceAgentId = uuid.v4();
        const targetAgentId = uuid.v4();

        const mockAgentData = {
            xid: mockAgentId,
        };

        const sourceAgentData = {
            xid: sourceAgentId,
            mergeTargetId: mergeId,
        };

        const targetAgentData = {
            xid: targetAgentId,
            mergeSourceId: mergeId,
        };

        // Mock the file system
        mockFs({
            [config.agents]: {
                [mockAgentId]: { 'agent.json': JSON.stringify(mockAgentData) },
                [targetAgentId]: { 'agent.json': JSON.stringify(targetAgentData) },
                [sourceAgentId]: { 'agent.json': JSON.stringify(sourceAgentData) },
            }
        });

        expect(() => xidb.mergeAgents(mockAgentId, config)).toThrow();
        expect(() => xidb.mergeAgents(targetAgentId, config)).toThrow();
        expect(() => xidb.mergeAgents(sourceAgentId, config)).toThrow();
    });

    it('merges profiles when source initiates', () => {
        const sourceAgentId = uuid.v4();
        const targetAgentId = uuid.v4();

        const sourceAgentData = {
            xid: sourceAgentId,
            mergeTargetId: utils.uuidToBase58(targetAgentId),
        };

        const targetAgentData = {
            xid: targetAgentId,
            mergeSourceId: utils.uuidToBase58(sourceAgentId),
        };

        const sourceAssetId = uuid.v4();
        const targetAssetId = uuid.v4();

        const sourceAssetData = {
            xid: sourceAssetId,
            asset: { owner: sourceAgentId },
        };

        const targetAssetData = {
            xid: targetAssetId,
            asset: { owner: targetAgentId },
        };

        // Mock the file system
        mockFs({
            [config.agents]: {
                [targetAgentId]: { 'agent.json': JSON.stringify(targetAgentData) },
                [sourceAgentId]: { 'agent.json': JSON.stringify(sourceAgentData) },
            },
            [config.assets]: {
                [targetAssetId]: { 'meta.json': JSON.stringify(targetAssetData) },
                [sourceAssetId]: { 'meta.json': JSON.stringify(sourceAssetData) },
            },
        });

        const results = xidb.mergeAgents(sourceAgentId, config);

        expect(results.ok).toBe(true);
        expect(results.logout).toBe(true);

        const assetJsonPath = path.join(config.assets, sourceAssetId, 'meta.json');
        const assetData = JSON.parse(fs.readFileSync(assetJsonPath, 'utf-8'));
        expect(assetData.asset.owner).toEqual(targetAgentId);

        const agentJsonPath = path.join(config.agents, sourceAgentId, 'agent.json');
        const agentData = JSON.parse(fs.readFileSync(agentJsonPath, 'utf-8'));
        expect(agentData.merged).toEqual(targetAgentId);
    });

    it('merges profiles when target initiates', () => {
        const sourceAgentId = uuid.v4();
        const targetAgentId = uuid.v4();

        const sourceAgentData = {
            xid: sourceAgentId,
            mergeTargetId: utils.uuidToBase58(targetAgentId),
        };

        const targetAgentData = {
            xid: targetAgentId,
            mergeSourceId: utils.uuidToBase58(sourceAgentId),
        };

        const sourceAssetId = uuid.v4();
        const targetAssetId = uuid.v4();

        const sourceAssetData = {
            xid: sourceAssetId,
            asset: { owner: sourceAgentId },
        };

        const targetAssetData = {
            xid: targetAssetId,
            asset: { owner: targetAgentId },
        };

        // Mock the file system
        mockFs({
            [config.agents]: {
                [targetAgentId]: { 'agent.json': JSON.stringify(targetAgentData) },
                [sourceAgentId]: { 'agent.json': JSON.stringify(sourceAgentData) },
            },
            [config.assets]: {
                [targetAssetId]: { 'meta.json': JSON.stringify(targetAssetData) },
                [sourceAssetId]: { 'meta.json': JSON.stringify(sourceAssetData) },
            },
        });

        const results = xidb.mergeAgents(targetAgentId, config);

        expect(results.ok).toBe(true);
        expect(results.logout).toBe(false);

        const assetJsonPath = path.join(config.assets, sourceAssetId, 'meta.json');
        const assetData = JSON.parse(fs.readFileSync(assetJsonPath, 'utf-8'));
        expect(assetData.asset.owner).toEqual(targetAgentId);

        const agentJsonPath = path.join(config.agents, sourceAgentId, 'agent.json');
        const agentData = JSON.parse(fs.readFileSync(agentJsonPath, 'utf-8'));
        expect(agentData.merged).toEqual(targetAgentId);
    });
});
