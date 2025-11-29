# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

## Adding a changeset

To add a changeset, run:

```bash
pnpm changeset
```

This will prompt you to:
1. Select which packages have changed
2. Choose the semver bump type (major/minor/patch)
3. Write a summary of the changes

## Releasing

When changesets are pushed to `main`, the release workflow will:
1. Apply version bumps
2. Commit the changes
3. Publish to npm
