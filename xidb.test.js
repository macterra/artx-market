const uuid = require('uuid');
const bs58 = require('bs58');
const fs = require('fs');
const path = require('path');
const mockFs = require('mock-fs');

const xidb = require('./xidb');
const archiver = require('./archiver');

const testConfig = {
    data: 'testData',
    name: 'testName',
    host: 'testHost',
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
