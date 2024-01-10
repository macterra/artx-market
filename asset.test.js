const uuid = require('uuid');
const fs = require('fs');
const path = require('path');
const mockFs = require('mock-fs');

const asset = require('./asset');
const config = require('./test-config');

jest.mock('uuid');

jest.mock('sharp', () => jest.fn(() => ({
    metadata: jest.fn(() => Promise.resolve({
        width: 800,
        height: 600,
        depth: 24,
        format: 'jpeg'
    }))
})));

describe('createAsset', () => {

    afterEach(() => {
        mockFs.restore();
    });

    it('should create an asset', async () => {
        const file = {
            path: `${config.uploads}/test.jpg`,
            originalname: 'test.jpg',
            size: 1000
        };
        const title = 'Test Title';
        const userId = 'testUser';
        const collectionId = 'testCollection';

        // Mock the file system
        mockFs({
            [config.data]: {
                'asset.ejs': '',
            },
            [config.uploads]: {
                'test.jpg': 'test',
            },
            [config.agents]: {
                'testUser': {}
            },
            [config.assets]: {}  // Empty directory
        });

        // Mock uuid
        uuid.v4.mockReturnValueOnce('testUuid');

        const result = await asset.createAsset(file, title, userId, collectionId, config);

        expect(result).toEqual(expect.objectContaining({
            xid: 'testUuid',
            asset: {
                owner: userId,
                title: title,
                collection: collectionId,
                created: expect.any(String),
                updated: expect.any(String),
            },
            file: {
                fileName: expect.any(String),
                size: file.size,
                hash: expect.any(String),
                path: expect.any(String),
            },
            image: {
                width: 800,
                height: 600,
                depth: 24,
                format: 'jpeg',
            }
        }));

        // Verify that the asset is correctly written to meta.json
        const metaJsonPath = path.join(config.assets, result.xid, 'meta.json');
        const metaJsonContent = JSON.parse(fs.readFileSync(metaJsonPath, 'utf-8'));
        expect(metaJsonContent).toEqual(result);
    });
});

describe('removeAsset', () => {

    afterEach(() => {
        mockFs.restore();
    });

    it('should remove the asset', () => {
        const xid = 'testXid';

        // Mock the file system
        mockFs({
            [config.assets]: {
                [xid]: {
                    'file.txt': 'test',
                },
            },
        });

        asset.removeAsset(xid, config);

        const assetPath = path.join(config.assets, xid);

        // Check that the asset folder has been removed
        expect(fs.existsSync(assetPath)).toBe(false);
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
            [config.data]: {
                'asset.ejs': '',
            },
            [config.assets]: {}  // Empty directory
        });

        asset.saveAsset(metadata, config);

        const expectedMetadata = {
            xid: 'testXid',
            asset: {
                owner: 'owner1',
                updated: expect.any(String)
            },
        };

        // Read the data that was written to meta.json and check that it matches the expected data
        const assetJsonPath = path.join(config.assets, metadata.xid, 'meta.json');
        const writtenData = JSON.parse(fs.readFileSync(assetJsonPath, 'utf-8'));
        expect(writtenData).toEqual(expectedMetadata);
    });

    it('should save the asset static index.html', () => {

        const metadata = {
            xid: 'testXid',
            asset: {
                title: 'mockTitle',
                owner: 'mockOwner',
                collection: 'mockCollection',
             },
        };

        const mockTemplate = `
        <!DOCTYPE html>
        <html>
            <head>
                <title><%= asset.title %></title>
            </head>
            <body>
                <h1><%= asset.title %></h1>
                <p>Owner: <%= asset.owner %></p>
                <p>Collection: <%= asset.collection %></p>
            </body>
        </html>`;

        const expectedHtml = `
        <!DOCTYPE html>
        <html>
            <head>
                <title>${metadata.asset.title}</title>
            </head>
            <body>
                <h1>${metadata.asset.title}</h1>
                <p>Owner: ${metadata.asset.owner}</p>
                <p>Collection: ${metadata.asset.collection}</p>
            </body>
        </html>`;

        // Mock the file system
        mockFs({
            [config.data]: {
                'asset.ejs': mockTemplate,
            },
            [config.assets]: {}  // Empty directory
        });

        asset.saveAsset(metadata, config);

        const expectedMetadata = {
            xid: 'testXid',
            asset: {
                owner: 'owner1',
                updated: expect.any(String)
            },
        };

        // Read the data that was written to meta.json and check that it matches the expected data
        const assetIndexPath = path.join(config.assets, metadata.xid, 'index.html');
        const writtenData = fs.readFileSync(assetIndexPath, 'utf-8');
        expect(writtenData).toEqual(expectedHtml);
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
            [config.assets]: {
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

        asset.enrichAsset(metadata, config);

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
            [config.assets]: {
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

        asset.enrichAsset(metadata, config);

        expect(metadata).toEqual(expectedMetadata);
    });

    it('should not modify the metadata if it does not have a token', () => {
        const metadata = {
            xid: 'testXid',
            asset: { owner: 'owner1' },
        };

        mockFs({});  // Empty file system

        const expectedMetadata = { ...metadata };

        asset.enrichAsset(metadata, config);

        expect(metadata).toEqual(expectedMetadata);
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
            [config.assets]: {
                [xid]: {
                    'meta.json': JSON.stringify(metadata),
                },
            }
        });

        const result = asset.getAsset(xid, config);

        expect(result).toEqual(metadata);
    });

    it('should return null if the specified asset does not exist', () => {
        mockFs({
            [config.assets]: {}  // Empty directory
        });

        const result = asset.getAsset('nonexistentXid', config);

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
            [config.assets]: {
                [xid]: {
                    'history.jsonl': historyJsonl,
                },
            }
        });

        const result = asset.getHistory(xid, config);

        expect(result).toEqual(history.reverse());
    });

    it('should return an empty array if the history file does not exist', () => {
        mockFs({
            [config.assets]: {}  // Empty directory
        });

        const result = asset.getHistory('nonexistentXid', config);

        expect(result).toEqual([]);
    });
});
