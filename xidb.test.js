const uuid = require('uuid');
const bs58 = require('bs58');
const { uuidToBase58 } = require('./xidb');

describe('uuidToBase58 function', () => {
    it('should convert a valid UUID to base58 format', () => {
        // Generate a sample UUID
        const sampleUUID = uuid.v4();

        // Expected base58 value
        const expectedBase58 = bs58.encode(Buffer.from(uuid.parse(sampleUUID)));

        // Test
        const result = uuidToBase58(sampleUUID);
        expect(result).toEqual(expectedBase58);
    });

    it('should throw an error for invalid UUID', () => {
        // Invalid UUID
        const invalidUUID = 'invalid-uuid-string';

        // Test
        expect(() => uuidToBase58(invalidUUID)).toThrow();
    });
});
