import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Just the marketing homepage — the only public, crawlable page. The
// authenticated dashboard lives behind Clerk at the same URL (/) and isn't
// a separate route to list; /invite/[token] is deliberately excluded (see
// robots.ts's comment — the token is a secret, not a page to advertise).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
