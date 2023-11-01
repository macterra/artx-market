const uuid = require('uuid');
const bs58 = require('bs58');
const xidb = require('./xidb');

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
        const ns = uuid.v4();
        const config = { name: 'testName', dns_ns: ns };
        const expectedMarketId = uuid.v5(config.name, config.dns_ns);
        expect(xidb.getMarketId(config)).toEqual(expectedMarketId);
    });

    it('should use config.host if config.name is not provided', () => {
        const ns = uuid.v4();
        const config = { host: 'testHost', dns_ns: ns };
        const expectedMarketId = uuid.v5(config.host, config.dns_ns);
        expect(xidb.getMarketId(config)).toEqual(expectedMarketId);
    });
});
