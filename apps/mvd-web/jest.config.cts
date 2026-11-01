module.exports = {
  displayName: '@mvd/mvd-web',
  preset:      '../../jest.preset.js',
  transform:   {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@monosmith/jest-preset/asset-transform',
    '^.+\\.[tj]sx?$':                      ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' }, loose: true }], ['@babel/preset-typescript', { allowDeclareFields: true }], ['@babel/preset-react', { runtime: 'automatic', development: true }]] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory:    'test-output/jest/coverage',
}
