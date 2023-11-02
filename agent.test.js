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
