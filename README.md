# VibeDrop

Agent-native static site hosting. Tell your agent to deploy a folder — get a public URL in seconds.

- Website: https://vibedrop.cc
- Skill: [`skill.md`](https://vibedrop.cc/skill.md)
- CLI: [`@vibedrop/cli`](./packages/cli)
- MCP server: [`@vibedrop/mcp`](./packages/mcp)
- SDK: [`@vibedrop/sdk`](./packages/sdk)

This repository contains the open-source clients. The hosting service itself runs at [vibedrop.cc](https://vibedrop.cc).

## Quick start — paste one prompt to your agent

Drop this into Claude Code, Cursor, Windsurf, or any agent that can read a URL:

> Read https://vibedrop.cc/skill.md and follow the instructions to set up VibeDrop.

Three steps, ~30 seconds:

1. **Paste the prompt.** Any agent that can fetch URLs will work.
2. **Agent installs itself.** It reads `skill.md`, runs `npm i -g @vibedrop/cli`, and provisions an anonymous API key. No signup, no credit card.
3. **Ask for a URL.** Point at any folder with an `index.html` — a `dist/`, a loose HTML bundle, or whatever the agent just wrote.

Then say something like:

- "Put `./site` online and text me the link."
- "Build this and deploy the output to VibeDrop."
- "Deploy the landing page you just wrote."

### What counts as a deployable folder?

Anything with an `index.html` at its root:

- **Framework build output** — `dist/`, `out/`, `build/` from Vite, `next export`, Astro, SvelteKit, CRA, etc.
- **Plain HTML** — a hand-written `index.html` plus its assets, a single-file mockup, an AI-generated landing page.
- **Files your agent just wrote** — "deploy the folder you just made."
- **Chrome extension or Electron local pages** — any directory of static HTML.

VibeDrop serves static files only. If your framework needs a build step, run it first and point at the output directory.

## Alternatives

### MCP server

If you'd rather the agent call `deploy` as a native tool (instead of shelling out to the CLI), install the MCP server:

```bash
claude mcp add vibedrop -- npx @vibedrop/mcp
```

Cursor / Windsurf — add to your MCP config:

```json
{
  "mcpServers": {
    "vibedrop": { "command": "npx", "args": ["-y", "@vibedrop/mcp"] }
  }
}
```

### CLI (humans)

```bash
npx @vibedrop/cli deploy ./dist
```

### SDK (Node)

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
