#!/usr/bin/env node
import { Command } from "commander";
import kleur from "kleur";
import { resolve } from "node:path";
import { stat } from "node:fs/promises";
import {
  VibedropClient,
  ApiError,
  loadConfig,
  saveConfig,
  packDir,
} from "@vibedrop/sdk";

const program = new Command();
program
  .name("vibedrop")
  .description("Deploy static sites from your agent in seconds.")
  .version("0.2.0");

program
  .command("deploy")
  .argument("<dir>", "directory containing index.html")
  .option(
    "-s, --slug <slug>",
    "slug of an existing site you already deployed — redeploys to the same URL",
  )
  .option("-t, --title <title>", "site title")
  .option("-p, --password <password>", "password-protect the site (Pro)")
  .action(async (dir: string, opts: { slug?: string; title?: string; password?: string }) => {
    const cfg = await loadConfig();
    const client = new VibedropClient(cfg);
    if (!cfg.apiKey) {
      process.stderr.write(kleur.dim("Provisioning anonymous API key...\n"));
      cfg.apiKey = await client.createAnonKey();
      await saveConfig(cfg);
    }
    const absDir = resolve(dir);
    const s = await stat(absDir).catch(() => null);
    if (!s?.isDirectory()) fail(`not a directory: ${absDir}`);

    process.stderr.write(kleur.dim(`Packing ${absDir}...\n`));
    const zip = await packDir(absDir);
    process.stderr.write(kleur.dim(`Uploading ${(zip.length / 1024).toFixed(1)} KB...\n`));
    try {
      const authedClient = new VibedropClient(cfg);
      const { site, claimUrl } = await authedClient.deploy(zip, { slug: opts.slug, title: opts.title });
      if (opts.password !== undefined) {
        try {
          await authedClient.update(site.slug, { password: opts.password });
        } catch (e) {
          handleApiError(e);
        }
      }
      console.log();
      console.log(kleur.green().bold("✔ Deployed"));
      console.log(`  ${kleur.cyan(site.url)}`);
      if (opts.password) console.log(kleur.dim(`  Password-protected`));
      if (site.expiresAt) {
        console.log(kleur.dim(`  Expires ${site.expiresAt}`));
      }
      if (claimUrl) {
        console.log();
        console.log(kleur.yellow().bold("  Claim this site for your account (1h link):"));
        console.log(`  ${kleur.cyan(claimUrl)}`);
      }
    } catch (e) {
      handleApiError(e);
    }
  });

program
  .command("claim-url")
  .description("Mint a fresh one-time claim URL for your anonymous key (1 hour TTL).")
  .action(async () => {
    const cfg = await loadConfig();
    if (!cfg.apiKey) fail("no API key configured. Run `vibedrop deploy` first.");
    try {
      const client = new VibedropClient(cfg);
      const { url, expiresIn } = await client.claimToken();
      console.log(kleur.yellow().bold("Open this link within 1 hour to claim this key into an account:"));
      console.log(`  ${kleur.cyan(url)}`);
      console.log(kleur.dim(`  (valid for ${Math.round(expiresIn / 60)} minutes)`));
    } catch (e) {
      handleApiError(e);
    }
  });

program
  .command("list")
  .description("list your deployed sites")
  .action(async () => {
    const cfg = await loadConfig();
    if (!cfg.apiKey) fail("no API key configured. Run `vibedrop deploy` first.");
    try {
      const client = new VibedropClient(cfg);
      const sites = await client.list();
      if (sites.length === 0) {
        console.log(kleur.dim("(no sites yet)"));
        return;
      }
      for (const s of sites) {
        const exp = s.expiresAt ? kleur.dim(`expires ${s.expiresAt}`) : kleur.green("permanent");
        console.log(`${kleur.cyan(s.url)}  ${exp}`);
      }
    } catch (e) {
      handleApiError(e);
    }
  });

program
  .command("rm")
  .argument("<slug>")
  .description("delete a site")
  .action(async (slug: string) => {
    const cfg = await loadConfig();
    if (!cfg.apiKey) fail("no API key configured.");
    try {
      const client = new VibedropClient(cfg);
      await client.delete(slug);
      console.log(kleur.green(`✔ Deleted ${slug}`));
    } catch (e) {
      handleApiError(e);
    }
  });

program
  .command("whoami")
  .description("show current API key + server")
  .action(async () => {
    const cfg = await loadConfig();
    console.log(`api: ${cfg.apiUrl}`);
    console.log(`key: ${cfg.apiKey ? cfg.apiKey.slice(0, 12) + "..." : "(none)"}`);
  });

program.parseAsync().catch((e) => {
  fail(e instanceof Error ? e.message : String(e));
});

function fail(msg: string): never {
  console.error(kleur.red(`✖ ${msg}`));
  process.exit(1);
}

function handleApiError(e: unknown): never {
  if (e instanceof ApiError) fail(`[${e.code}] ${e.message}`);
  fail(e instanceof Error ? e.message : String(e));
}
