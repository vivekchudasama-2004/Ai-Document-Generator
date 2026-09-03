import type { MetadataRoute } from "next";

// Replace with the production domain at deploy time.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://docuforge.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/login", "/signup"];
  return pages.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" ? "weekly" : "yearly",
    priority: path === "/" ? 1 : 0.5,
  }));
}
