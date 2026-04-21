# @vibedrop/sdk

HTTP client SDK for the VibeDrop API.

```ts
import { VibedropClient, loadConfig, packDir } from "@vibedrop/sdk";

const cfg = await loadConfig();
const client = new VibedropClient(cfg);

if (!cfg.apiKey) {
  cfg.apiKey = await client.createAnonKey();
}

const zip = await packDir("./dist");
const site = await client.deploy(zip);
console.log(site.url); // https://abc123.vibedrop.site
```

See [vibedrop.cc](https://vibedrop.cc) for details.
