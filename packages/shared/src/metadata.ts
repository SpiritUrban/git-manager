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
  author: 'Vitaliy Dyachuk',
  /** Personal hub: about the author plus their other products and services. */
  authorUrl: 'https://spiriturban.github.io/',
  authorGithubUrl: 'https://github.com/SpiritUrban',
  copyright: 'Copyright (c) 2026 Vitaliy Dyachuk',
} as const;

export type ProductMetadata = typeof PRODUCT_METADATA;
