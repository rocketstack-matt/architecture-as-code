export default {
    preset: 'ts-jest/presets/js-with-ts-esm',
    testEnvironment: 'node',
    testMatch: ['**/*.spec.ts'],
    modulePaths: ['<rootDir>'],
    transformIgnorePatterns: [
        '^.+\\.js$'
    ],
    extensionsToTreatAsEsm: ['.ts'],
    transform: {
        '^.+\\.ts?$': [
            'ts-jest',
            {
                useESM: true,
            },
        ]
    },
    rootDir: '.',
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },
    collectCoverage: true,
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 80,
            lines: 75,
            statements: 75,
        }
    },
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/test_fixtures/'
    ]
};
