# VibeDrop

Agent-native static site hosting. Deploy a directory as a public URL in one command — or one MCP tool call.

- Website: https://vibedrop.cc
- CLI: [`@vibedrop/cli`](./packages/cli)
- MCP server: [`@vibedrop/mcp`](./packages/mcp)
- SDK: [`@vibedrop/sdk`](./packages/sdk)

This repository contains the open-source clients. The hosting service itself is operated at [vibedrop.cc](https://vibedrop.cc).

## Quick start

Deploy a directory from the CLI:

```bash
npx @vibedrop/cli deploy ./dist
```

Add the MCP server to your agent (Claude Code, Cursor, etc.):

```json
{
  "mcpServers": {
    "vibedrop": { "command": "npx", "args": ["-y", "@vibedrop/mcp"] }
  }
}
```

Use the SDK from Node:

```ts
import { VibedropClient, packDir } from "@vibedrop/sdk";

const client = new VibedropClient({ apiKey: process.env.VIBEDROP_KEY });
const zip = await packDir("./dist");
const { site } = await client.deploy(zip);
console.log(site.url);
```

## Development

```bash
pnpm install
pnpm build
pnpm typecheck
```

## License

MIT — see [LICENSE](./LICENSE).
