const uuid = require('uuid');
const bs58 = require('bs58');
const fs = require('fs');
const path = require('path');
const mockFs = require('mock-fs');

const xidb = require('./xidb');
const archiver = require('./archiver');

const testConfig = {
    name: 'testName',
    host: 'testHost',
    data: 'testData',
    assets: 'testData/assets',
    agents: 'testData/agents',
    certs: 'testData/certs',
    dns_ns: uuid.v4()
};

describe('uuidToBase58', () => {
    it('should convert a valid UUID to base58 format and back', () => {
        // Generate a sample UUID
        const sampleUUID = uuid.v4();

        // Convert UUID to base58
        const base58 = xidb.uuidToBase58(sampleUUID);

        // Decode base58 back to a UUID
        const buffer = bs58.decode(base58);
        const decodedUUID = uuid.stringify(buffer);

        // Test
        expect(decodedUUID).toEqual(sampleUUID);
    });

    it('should throw an error for invalid UUID', () => {
        // Invalid UUID
        const invalidUUID = 'invalid-uuid-string';

        // Test
        expect(() => uuidToBase58(invalidUUID)).toThrow();
    });
});

describe('getMarketId', () => {
    it('should generate a UUIDv5 based on config.name and config.dns_ns', () => {
        const config = { name: 'testName', dns_ns: uuid.v4() };
        const expectedMarketId = uuid.v5(config.name, config.dns_ns);
        expect(xidb.getMarketId(config)).toEqual(expectedMarketId);
    });

    it('should use config.host if config.name is not provided', () => {
        const config = { host: 'testHost', dns_ns: uuid.v4() };
        const expectedMarketId = uuid.v5(config.host, config.dns_ns);
        expect(xidb.getMarketId(config)).toEqual(expectedMarketId);
    });
});

describe('getAdmin', () => {
    afterEach(() => {
        mockFs.restore();
    });

    it('should return a new admin object if meta.json does not exist', () => {
        mockFs({
            [testConfig.data]: {}  // Empty directory
        });

        const xid = xidb.getMarketId(testConfig);
        const xid58 = xidb.uuidToBase58(xid);

        const expectedAdmin = {
            name: testConfig.name,
            xid: xid,
            xid58: xid58,
            created: expect.any(String),
            updated: expect.any(String),
        };

        expect(xidb.getAdmin(testConfig)).toEqual(expectedAdmin);
    });

    it('should return the content of meta.json if it exists', () => {
        const metaJson = { key: 'value' };
        mockFs({
            [testConfig.data]: {
                'meta.json': JSON.stringify(metaJson)
            }
        });

        expect(xidb.getAdmin(testConfig)).toEqual(metaJson);
    });

    it('should add the content of CID to the returned object if CID exists', () => {
        const metaJson = { key: 'value' };
        const cidContent = 'cidContent';
        mockFs({
            [testConfig.data]: {
                'meta.json': JSON.stringify(metaJson),
                'CID': cidContent
            }
        });

        expect(xidb.getAdmin(testConfig)).toEqual({ ...metaJson, cid: cidContent.trim() });
    });
});

describe('saveAdmin', () => {
    afterEach(() => {
        mockFs.restore();
    });

    it('should write admin data to meta.json and return the data', () => {
        const adminData = { key: 'value' };
        mockFs({
            [testConfig.data]: {}  // Empty directory
        });

        const expectedAdminData = {
            ...adminData,
            updated: expect.any(String)
        };

        const result = xidb.saveAdmin(adminData, testConfig);

        expect(result).toEqual(expectedAdminData);

        const writtenData = JSON.parse(fs.readFileSync(path.join(testConfig.data, 'meta.json'), 'utf-8'));
        expect(writtenData).toEqual(expectedAdminData);
    });
});

describe('registerState', () => {

    afterEach(() => {
        mockFs.restore();
    });

    it('should save the admin state, register it, and save it again', async () => {
        const adminState = { key: 'value' };
        const txid = 'test-txid';
        mockFs({
            [testConfig.data]: {}  // Empty directory
        });

        // Mock archiver.register to return the mock pending value
        jest.spyOn(archiver, 'register').mockResolvedValue(txid);

        const expectedAdminState = {
            ...adminState,
            updated: expect.any(String),
            pending: txid
        };

        const result = await xidb.registerState(adminState, testConfig);

        expect(result).toEqual(expectedAdminState);

        // Read the data that was written to meta.json and check that it matches the expected data
        const writtenData = JSON.parse(fs.readFileSync(path.join(testConfig.data, 'meta.json'), 'utf-8'));
        expect(writtenData).toEqual(expectedAdminState);
    });
});

describe('notarizeState', () => {

    afterEach(() => {
        mockFs.restore();
    });

    it('should save the admin state, register it, and save it again', async () => {
        const adminState = { key: 'value' };
        const txid = 'test-txid';
        mockFs({
            [testConfig.data]: {}  // Empty directory
        });

        // Mock archiver.register to return the mock pending value
        jest.spyOn(archiver, 'notarize').mockResolvedValue(txid);

        const expectedAdminState = {
            ...adminState,
            updated: expect.any(String),
            pending: txid
        };

        const result = await xidb.notarizeState(adminState, testConfig);

        expect(result).toEqual(expectedAdminState);

        // Read the data that was written to meta.json and check that it matches the expected data
        const writtenData = JSON.parse(fs.readFileSync(path.join(testConfig.data, 'meta.json'), 'utf-8'));
        expect(writtenData).toEqual(expectedAdminState);
    });
});

describe('certifyState', () => {

    afterEach(() => {
        mockFs.restore();
    });

    it('should certify the admin state and save it', async () => {
        const adminState = { key: 'value', pending: 'mockPending' };
        const cert = { xid: 'mockXid' };
        mockFs({
            [testConfig.data]: {},  // Empty directory
            [testConfig.certs]: {}  // Empty directory
        });

        // Mock archiver.certify to return the mock cert
        jest.spyOn(archiver, 'certify').mockResolvedValue(cert);

        const expectedAdminState = {
            ...adminState,
            latest: cert.xid,
            pending: null,
            updated: expect.any(String)
        };

        const result = await xidb.certifyState(adminState, testConfig);

        expect(result).toEqual(expectedAdminState);

        // Read the data that was written to meta.json and check that it matches the expected data
        const certFile = path.join(testConfig.certs, cert.xid, 'meta.json');
        const writtenData = JSON.parse(fs.readFileSync(certFile, 'utf-8'));
        expect(writtenData).toEqual(cert);
    });
});

describe('getWalletInfo', () => {

    it('should return walletinfo from archiver', async () => {
        const walletinfo = { key: 'value' };

        // Mock archiver.certify to return the mock walletinfo
        jest.spyOn(archiver, 'walletinfo').mockResolvedValue(walletinfo);

        const result = await xidb.getWalletInfo();

        expect(result).toEqual(walletinfo);
    });
});

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
