// Twitter/X card image — same artwork as opengraph-image.tsx, re-exported
// under the convention Next.js/Twitter's crawler looks for specifically
// (some crawlers don't fall back to og:image), rather than duplicating it.
export { default, alt, size, contentType } from "./opengraph-image";
