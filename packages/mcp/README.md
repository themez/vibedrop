# @vibedrop/mcp

MCP server for deploying static sites to VibeDrop. Works with Claude Code, Cursor, Windsurf, and any MCP-compatible client.

## Quick Setup

### Claude Code

```bash
claude mcp add vibedrop -- npx @vibedrop/mcp
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "vibedrop": {
      "command": "npx",
      "args": ["@vibedrop/mcp"]
    }
  }
}
```

### Windsurf / Other MCP clients

```json
{
  "command": "npx",
  "args": ["@vibedrop/mcp"]
}
```

## Tools

### `deploy_site`

Deploy a directory as a static website.

- `directory` (required): Absolute path to the directory containing index.html
- `slug` (optional): Custom subdomain (Pro feature)
- `title` (optional): Site title

Returns a public URL like `https://abc123.vibedrop.site`.

### `list_sites`

List all deployed sites.

### `delete_site`

Delete a deployed site by slug.

## How it works

1. First call auto-provisions an anonymous API key (stored in `~/.vibedrop/config.json`)
2. Zips the directory, uploads to VibeDrop API
3. Returns a live URL anyone can visit
4. Free tier: 7-day TTL (30 days once claimed), 25 MB max, 3 sites, small footer banner
5. Pro: permanent sites, 50 MB max, 20 sites, custom domains, no branding

## Environment Variables

- `VIBEDROP_API_URL`: Override API endpoint (default: `https://api.vibedrop.cc`)
