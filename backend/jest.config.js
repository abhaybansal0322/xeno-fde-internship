module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/index.js',
    ],
    testMatch: [
        '**/__tests__/**/*.test.js',
    ],
    verbose: true,
};
