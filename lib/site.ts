import siteData from "@/content/site.json";

export type SiteContent = {
  title: string;
  subtitle: string;
  metaTitle: string;
  metaDescription: string;
};

export const site: SiteContent = siteData;
