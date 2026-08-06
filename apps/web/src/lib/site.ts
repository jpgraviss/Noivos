// Single source of truth for the live URL, referenced by layout.tsx's
// metadata, robots.ts, and sitemap.ts — previously duplicated as a local
// const in layout.tsx only. Found via Vercel MCP tools 2026-08-05; not a
// custom domain (there isn't one yet — see the Vercel SSO finding in
// PROJECT_MEMORY.md's 2026-08-05 audit entry).
export const SITE_URL = "https://noivos-pb6p.vercel.app";
