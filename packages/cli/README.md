# vibedrop

Deploy static sites from your agent in one command.

## Install

```bash
npx @vibedrop/cli deploy ./dist
```

First run auto-provisions an anonymous API key to `~/.vibedrop/config.json`. No signup required.

## Commands

```bash
vibedrop deploy <dir>       Deploy a directory as a static site
vibedrop list                List your deployed sites
vibedrop rm <slug>           Delete a site
vibedrop whoami              Show current API key + server
```

## Free tier

- 72-hour TTL per site
- 5 MB max per site
- 3 concurrent sites
- Small footer banner

Upgrade to Pro at [vibedrop.cc/pricing](https://vibedrop.cc/pricing) for permanent sites, 50 MB, unlimited sites, no branding, and custom domains.

## MCP server

Also available as an MCP server for Claude Code, Cursor, Windsurf:

```bash
npm install -g @vibedrop/mcp
```

See [@vibedrop/mcp](https://www.npmjs.com/package/@vibedrop/mcp).
