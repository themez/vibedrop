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
4. Free tier: 72h TTL, 5MB max, 3 sites, ad banner
5. Pro: permanent, 50MB, unlimited, no ads

## Environment Variables

- `VIBEDROP_API_URL`: Override API endpoint (default: `https://api.vibedrop.cc`)
