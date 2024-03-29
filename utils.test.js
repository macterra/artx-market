const uuid = require('uuid');
const bs58 = require('bs58');
const utils = require('./utils');

describe('uuidToBase58', () => {
    it('should convert a valid UUID to base58 format and back', () => {
        // Generate a sample UUID
        const sampleUUID = uuid.v4();

        // Convert UUID to base58
        const base58 = utils.uuidToBase58(sampleUUID);

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
        expect(() => utils.uuidToBase58(invalidUUID)).toThrow();
    });
});

describe('base58ToUuid', () => {
    it('should convert a valid base58 encoded uuid back to original', () => {
        // Generate a sample UUID
        const sampleUUID = uuid.v4();

        // Convert UUID to base58
        const base58 = utils.uuidToBase58(sampleUUID);
        const decodedUUID = utils.base58ToUuid(base58);

        // Test
        expect(decodedUUID).toEqual(sampleUUID);
    });

    it('should throw an error for invalid UUID', () => {
        // Invalid UUID
        const invalidBase58 = 'invalid-base58-string';

        // Test
        expect(() => utils.base58ToUuid(invalidUUID)).toThrow();
    });
});

describe('getMarketId', () => {
    it('should generate a UUIDv5 based on config.name and config.dns_ns', () => {
        const config = { name: 'testName', dns_ns: uuid.v4() };
        const expectedMarketId = uuid.v5(config.name, config.dns_ns);
        expect(utils.getMarketId(config)).toEqual(expectedMarketId);
    });

    it('should use config.host if config.name is not provided', () => {
        const config = { host: 'testHost', dns_ns: uuid.v4() };
        const expectedMarketId = uuid.v5(config.host, config.dns_ns);
        expect(utils.getMarketId(config)).toEqual(expectedMarketId);
    });
});

describe('getAgentId', () => {
    it('should return the correct agent ID', () => {
        const key = 'testKey';
        const config = { name: 'testName', dns_ns: uuid.v4() };
        const marketId = utils.getMarketId(config);
        const expectedAgentId = uuid.v5(key, marketId);
        const agentId = utils.getAgentId(key, config);

        expect(agentId).toBe(expectedAgentId);
    });
});
