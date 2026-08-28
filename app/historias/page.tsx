import { getPublishedStories, getSiteContent, getViewer } from "@/lib/data";
import HistoriasView from "./HistoriasView";
import "@/components/admin/admin.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Piedrahíta — Historias" };

export default async function HistoriasPage() {
  const [stories, site, viewer] = await Promise.all([
    getPublishedStories(),
    getSiteContent(),
    getViewer(),
  ]);

  return <HistoriasView stories={stories} site={site} viewer={viewer} />;
}
