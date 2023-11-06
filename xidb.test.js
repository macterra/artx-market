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
