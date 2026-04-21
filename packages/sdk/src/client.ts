import type { Config } from "./config.js";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export type SiteInfo = {
  id: string;
  slug: string;
  url: string;
  expiresAt: string | null;
  sizeBytes: number;
  fileCount: number;
  hasAd: boolean;
  hasPassword: boolean;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

export class VibedropClient {
  constructor(private cfg: Config) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (this.cfg.apiKey) headers.set("authorization", `Bearer ${this.cfg.apiKey}`);
    const res = await fetch(`${this.cfg.apiUrl}${path}`, { ...init, headers });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as any;
      throw new ApiError(
        res.status,
        body?.error?.code ?? "http_error",
        body?.error?.message ?? res.statusText,
      );
    }
    return res.json() as Promise<T>;
  }

  async createAnonKey(): Promise<string> {
    const res = await this.request<{ key: string }>("/v1/keys/anonymous", {
      method: "POST",
    });
    return res.key;
  }

  async deploy(
    zip: Uint8Array,
    opts: { slug?: string; title?: string } = {},
  ): Promise<SiteInfo> {
    const form = new FormData();
    form.append("zip", new Blob([zip], { type: "application/zip" }), "site.zip");
    if (opts.slug) form.append("slug", opts.slug);
    if (opts.title) form.append("title", opts.title);
    const res = await this.request<{ site: SiteInfo }>("/v1/sites", {
      method: "POST",
      body: form,
    });
    return res.site;
  }

  async list(): Promise<SiteInfo[]> {
    const res = await this.request<{ sites: SiteInfo[] }>("/v1/sites");
    return res.sites;
  }

  async delete(slug: string): Promise<void> {
    await this.request<{ ok: true }>(`/v1/sites/${slug}`, { method: "DELETE" });
  }

  async update(slug: string, patch: { password?: string | null; title?: string | null }): Promise<SiteInfo> {
    const res = await this.request<{ site: SiteInfo }>(`/v1/sites/${slug}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    return res.site;
  }
}
