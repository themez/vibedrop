# vibedrop (open-source clients)

Workspace for `@vibedrop/sdk`, `@vibedrop/cli`, `@vibedrop/mcp`. Server lives in the sibling `vibedrop-server` repo (private).

## Publishing

**Always use `pnpm publish` (or `pnpm pack` + `npm publish <tarball>`). Never plain `npm publish`.**

`npm publish` does not rewrite the `workspace:*` protocol — the published tarball ships with literal `"@vibedrop/sdk": "workspace:*"`, which makes `npm install` / `npx` fail with `EUNSUPPORTEDPROTOCOL` for every end user.

`pnpm publish` rewrites `workspace:*` to the concrete version at pack time. Verify before pushing the publish:

```
pnpm pack --pack-destination /tmp/check
tar -xOzf /tmp/check/<pkg>.tgz package/package.json | grep @vibedrop
```

Each `@vibedrop/*` dep should show a concrete version (e.g. `"0.1.2"`), never `workspace:*`.

If npm 2FA blocks `pnpm publish` (no `--auth-type` support), fall back to `pnpm pack` + `npm publish <tarball> --auth-type=web`.

Publish order: sdk → cli + mcp (cli/mcp depend on sdk).

## Background

In April 2026 the first public releases (sdk 0.1.1, cli 0.1.1, mcp 0.1.2) shipped with the `workspace:*` bug because they were published via `npm publish`. The fix was sdk 0.1.2 / cli 0.1.2 / mcp 0.1.3, with the broken versions deprecated on the registry and the orphan `@vibedrop/shared` package unpublished.
