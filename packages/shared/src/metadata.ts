export const PRODUCT_METADATA = {
  name: 'Git Manager',
  slug: 'git-manager',
  executableName: 'git-manager',
  bundleIdentifier: 'com.gitmanager.desktop',
  repositoryOwner: 'SpiritUrban',
  repositoryName: 'git-manager',
  repositoryUrl: 'https://github.com/SpiritUrban/git-manager',
  releasesUrl: 'https://github.com/SpiritUrban/git-manager/releases',
  latestReleaseJsonUrl: 'https://github.com/SpiritUrban/git-manager/releases/latest/download/latest.json',
  packageNamespace: '@git-manager',
  license: 'MIT',
  copyright: 'Copyright (c) 2026 Git Manager Contributors',
} as const;

export type ProductMetadata = typeof PRODUCT_METADATA;
