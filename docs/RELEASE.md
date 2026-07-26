# Release process

This file has been superseded. Release instructions now live in one place each, so that they
cannot drift apart:

- **[RELEASING.md](../RELEASING.md)** — cutting a new version of this project: the three
  commands, what the pipeline does on its own, how to verify it worked, and what to do when a
  release run fails.
- **[DEPLOYMENT_PLAYBOOK.md](../DEPLOYMENT_PLAYBOOK.md)** — setting the same pipeline up from
  scratch in another project, including the GitHub settings that cannot be configured from code,
  and generating the updater signing keys.
- **[UNSIGNED_BUILDS.md](UNSIGNED_BUILDS.md)** — why installers trigger SmartScreen and
  Gatekeeper, and how updater signing differs from platform code signing.

> [!NOTE]
> The previous version of this file stated that `pages.yml` runs when a release is published.
> It cannot: the release is created by `GITHUB_TOKEN`, and GitHub deliberately does not start
> workflows from events raised by that token. The site is deployed by a dependent job inside the
> release run instead.
