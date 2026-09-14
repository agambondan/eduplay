import nextConfig from 'eslint-config-next';

export default [
  ...nextConfig,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/purity': 'off',
      '@next/next/no-img-element': 'warn',
    },
  },
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'public/**', 'scripts/**'],
  },
];
