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

/**
 * Deploy response. `claimUrl` is a one-time link (~1 hour TTL) that lets an
 * unauthenticated user attach this anonymous key and its sites to a VibeDrop
 * account in one click. `null` when the calling key is already claimed.
 */
export type DeployResult = {
  site: SiteInfo;
  claimUrl: string | null;
};

/** Result of POST /v1/keys/claim-token. */
export type ClaimToken = {
  token: string;
  url: string;
  expiresIn: number;
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

  /**
   * Deploy a zipped directory. `slug` is optional and, when provided, must
   * match a site the calling key already owns — it makes the deploy update
   * that site instead of creating a new one. You cannot pick an arbitrary new
   * slug; new sites always get a server-generated slug.
   */
  async deploy(
    zip: Uint8Array,
    opts: { slug?: string; title?: string } = {},
  ): Promise<DeployResult> {
    const form = new FormData();
    form.append("zip", new Blob([zip], { type: "application/zip" }), "site.zip");
    if (opts.slug) form.append("slug", opts.slug);
    if (opts.title) form.append("title", opts.title);
    const res = await this.request<{ site: SiteInfo; claimUrl: string | null }>(
      "/v1/sites",
      { method: "POST", body: form },
    );
    return { site: res.site, claimUrl: res.claimUrl };
  }

  /**
   * Deploy a single HTML string without a filesystem. Intended for MCP and
   * other agent callers that generate HTML in-memory. Body cap is 1 MB; use
   * {@link deploy} with a zipped directory for larger sites.
   *
   * As with {@link deploy}, `slug` is update-only — must point at an existing
   * site owned by the caller.
   */
  async deployInline(
    html: string,
    opts: { slug?: string; title?: string } = {},
  ): Promise<DeployResult> {
    const res = await this.request<{ site: SiteInfo; claimUrl: string | null }>(
      "/v1/sites/inline",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          html,
          ...(opts.slug ? { slug: opts.slug } : {}),
          ...(opts.title ? { title: opts.title } : {}),
        }),
      },
    );
    return { site: res.site, claimUrl: res.claimUrl };
  }

  /**
   * Mint a fresh one-time claim URL for the calling Bearer key. Throws
   * `ApiError` with code `already_claimed` if the key is already linked to a
   * user. Useful when the {@link deploy} response's `claimUrl` has expired.
   */
  async claimToken(): Promise<ClaimToken> {
    return this.request<ClaimToken>("/v1/keys/claim-token", { method: "POST" });
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
