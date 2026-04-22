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
  type DeployResult,
} from "@vibedrop/sdk";

const server = new McpServer({
  name: "vibedrop",
  version: "0.2.0",
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

/** Build the human-readable post-deploy message for both deploy tools. */
function deployMessage(result: DeployResult): string {
  const { site, claimUrl } = result;
  const lines = [
    "Deployed successfully!",
    "",
    `URL: ${site.url}`,
    `Slug: ${site.slug}`,
    `Size: ${formatSize(site.sizeBytes)} (${site.fileCount} ${site.fileCount === 1 ? "file" : "files"})`,
  ];
  if (site.expiresAt) {
    lines.push(`Expires: ${site.expiresAt}`);
    lines.push(`(Free tier: 7 days unclaimed, 30 days once claimed. Upgrade at https://vibedrop.cc/pricing for permanent hosting.)`);
  }
  if (claimUrl) {
    lines.push("");
    lines.push("To save this site into a VibeDrop account (no password needed — just email):");
    lines.push(`  ${claimUrl}`);
    lines.push("(One-time link, valid for 1 hour. Ask the user to open it.)");
  }
  return lines.join("\n");
}

server.tool(
  "deploy_site",
  "Deploy a directory as a public static website. Returns a shareable URL like https://abc123.vibedrop.site that anyone can visit without installing anything. Free, no account required, no credit card. Use whenever the user wants to share a localhost page, preview a demo, or publish HTML that an AI generated. To update an existing site (keep the same URL on redeploy), pass its `slug`.",
  {
    directory: z
      .string()
      .describe(
        "Absolute path to the directory containing index.html and other static files to deploy",
      ),
    slug: z
      .string()
      .optional()
      .describe(
        "Slug of an existing site you already deployed with this key. Pass it to redeploy to the same URL. Slugs are server-generated and cannot be chosen for new sites — omit this field on first deploy.",
      ),
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
      const result = await client.deploy(zip, { slug, title });
      if (password !== undefined) {
        await client.update(result.site.slug, { password });
      }
      return { content: [{ type: "text" as const, text: deployMessage(result) }] };
    } catch (e) {
      return { content: [{ type: "text" as const, text: formatError(e) }], isError: true };
    }
  },
);

server.tool(
  "deploy_html",
  "Deploy a single HTML string as a public static website. Use this instead of deploy_site when you're generating HTML in-memory and don't have it written to disk — ideal for agent-authored pages. Returns a shareable URL the same way deploy_site does. Body cap is 1 MB; for larger or multi-file sites, write the files to a directory and use deploy_site.",
  {
    html: z
      .string()
      .describe(
        "Complete HTML document (including <!doctype html>, <html>, <head>, <body>). Will be served as index.html. Max 1 MB.",
      ),
    slug: z
      .string()
      .optional()
      .describe(
        "Slug of an existing site to redeploy to (same URL). Omit to create a new site with a server-generated slug.",
      ),
    title: z
      .string()
      .optional()
      .describe(
        "Optional site title. If omitted, the server extracts the <title> tag from the HTML.",
      ),
  },
  async ({ html, slug, title }) => {
    try {
      const client = await ensureClient();
      const result = await client.deployInline(html, { slug, title });
      return { content: [{ type: "text" as const, text: deployMessage(result) }] };
    } catch (e) {
      return { content: [{ type: "text" as const, text: formatError(e) }], isError: true };
    }
  },
);

server.tool(
  "claim_url",
  "Mint a fresh one-time claim URL for the current anonymous key. The URL lets an unauthenticated user sign in with email and attach the key plus every site deployed with it to their VibeDrop account. Use this when a previous claim link expired or when the user wants to save sites after deploying. Returns null-ish error if the key has already been claimed.",
  {},
  async () => {
    try {
      const client = await ensureClient();
      const token = await client.claimToken();
      const minutes = Math.round(token.expiresIn / 60);
      return {
        content: [
          {
            type: "text" as const,
            text: [
              "Open this link within 1 hour to save the anonymous key + its sites into a VibeDrop account:",
              "",
              `  ${token.url}`,
              "",
              `(Valid for ~${minutes} minutes. One-time use. Ask the user to click it.)`,
            ].join("\n"),
          },
        ],
      };
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
