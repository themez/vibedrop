#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { resolve } from "node:path";
import { stat } from "node:fs/promises";
import {
  VibedropClient,
  ApiError,
  loadConfig,
  saveConfig,
  packDir,
} from "@vibedrop/sdk";

const server = new McpServer({
  name: "vibedrop",
  version: "0.1.0",
});

async function ensureClient() {
  const cfg = await loadConfig();
  const client = new VibedropClient(cfg);
  if (!cfg.apiKey) {
    cfg.apiKey = await client.createAnonKey();
    await saveConfig(cfg);
  }
  return new VibedropClient(cfg);
}

server.tool(
  "deploy_site",
  "Deploy a directory as a public static website. Returns a shareable URL like https://abc123.vibedrop.site that anyone can visit without installing anything. Free, no account required, no credit card. Use whenever the user wants to share a localhost page, preview a demo, or publish HTML that an AI generated. Re-run to update an existing site by passing the same slug.",
  {
    directory: z
      .string()
      .describe(
        "Absolute path to the directory containing index.html and other static files to deploy",
      ),
    slug: z
      .string()
      .optional()
      .describe("Custom subdomain (e.g. 'my-app' → my-app.vibedrop.site). Pro feature."),
    title: z
      .string()
      .optional()
      .describe("Title for the deployed site"),
    password: z
      .string()
      .optional()
      .describe("Password-protect the site (Pro feature). Visitors will need this password to view it."),
  },
  async ({ directory, slug, title, password }) => {
    try {
      const absDir = resolve(directory);
      const s = await stat(absDir).catch(() => null);
      if (!s?.isDirectory()) {
        return { content: [{ type: "text" as const, text: `Error: ${absDir} is not a directory` }] };
      }

      const client = await ensureClient();
      const zip = await packDir(absDir);
      const site = await client.deploy(zip, { slug, title });
      if (password !== undefined) {
        await client.update(site.slug, { password });
      }

      const lines = [
        `Deployed successfully!`,
        ``,
        `URL: ${site.url}`,
        `Slug: ${site.slug}`,
        `Size: ${formatSize(site.sizeBytes)} (${site.fileCount} ${site.fileCount === 1 ? "file" : "files"})`,
      ];
      if (site.expiresAt) {
        lines.push(`Expires: ${site.expiresAt}`);
        lines.push(`(Free tier: 72h. Upgrade at https://vibedrop.cc/pricing for permanent hosting)`);
      }
      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    } catch (e) {
      return { content: [{ type: "text" as const, text: formatError(e) }], isError: true };
    }
  },
);

server.tool(
  "list_sites",
  "List all sites deployed to VibeDrop with this machine's API key.",
  {},
  async () => {
    try {
      const client = await ensureClient();
      const sites = await client.list();
      if (sites.length === 0) {
        return { content: [{ type: "text" as const, text: "No sites deployed yet." }] };
      }
      const lines = sites.map((s) => {
        const exp = s.expiresAt ? `expires ${s.expiresAt}` : "permanent";
        return `${s.url}  (${formatSize(s.sizeBytes)}, ${exp})`;
      });
      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    } catch (e) {
      return { content: [{ type: "text" as const, text: formatError(e) }], isError: true };
    }
  },
);

server.tool(
  "delete_site",
  "Delete a deployed site from VibeDrop.",
  {
    slug: z.string().describe("The slug (subdomain) of the site to delete"),
  },
  async ({ slug }) => {
    try {
      const client = await ensureClient();
      await client.delete(slug);
      return { content: [{ type: "text" as const, text: `Deleted ${slug}.vibedrop.site` }] };
    } catch (e) {
      return { content: [{ type: "text" as const, text: formatError(e) }], isError: true };
    }
  },
);

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatError(e: unknown): string {
  if (e instanceof ApiError) return `API error [${e.code}]: ${e.message}`;
  if (e instanceof Error) return `Error: ${e.message}`;
  return `Error: ${String(e)}`;
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error("MCP server failed to start:", e);
  process.exit(1);
});
