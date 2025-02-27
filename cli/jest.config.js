export default {
    preset: 'ts-jest/presets/js-with-ts-esm',
    testEnvironment: 'node',
    testMatch: ['**/*.spec.ts'],
    transformIgnorePatterns: [
        '<rootDir>/node_modules/(?!@finos/calm-shared)',
        '^.+\\.js$'
    ],
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\./.*)\\.js$': '$1',
        '^(\\.\\./.*)\\.(js|ts)$': '$1',
        '^@finos/calm-shared/(.*)$': '<rootDir>/../shared/dist/$1'
    },
    transform: {
        '^.+\\.ts?$': [
            'ts-jest',
            {
                useESM: true,
            },
        ]
    },
    rootDir: '.',
    watchPathIgnorePatterns: ['<rootDir>/../shared/'],
    collectCoverage: true,
    coverageThreshold: {
        global: {
            branches: 95,
            functions: 90,
            lines: 90,
            statements: 90,
        }
    }
};
