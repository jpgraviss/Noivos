import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// /invite/[token] is disallowed on purpose — the invite_token in that path
// IS the access secret (per packages/database/README.md's accept-invite
// flow), the same trust model as a password-reset link. It should never be
// crawled or cached by a search engine, not even to appear "not indexed."
// /api/ is disallowed too — every route there requires Clerk auth anyway,
// so there's nothing for a crawler to usefully fetch, only crawl budget to
// waste.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/invite/", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
