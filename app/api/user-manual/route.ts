import { NextResponse } from "next/server";
import { getAllDocFiles, findDocFileBySlug, getH2Headings } from "@/lib/markdown";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  const files = await getAllDocFiles();

  if (slug) {
    const doc = await findDocFileBySlug(slug);
    if (doc) {
      const h2Headings = getH2Headings(doc.content);
      return NextResponse.json({
        files: files.map(f => ({ slug: f.slug, title: f.title, icon: f.icon })),
        content: doc.content,
        h2Headings,
      });
    }
    return NextResponse.json({ files: files.map(f => ({ slug: f.slug, title: f.title, icon: f.icon })), content: null, h2Headings: [] });
  }

  const firstDoc = files[0];
  const content = firstDoc?.content || null;
  const h2Headings = firstDoc ? getH2Headings(firstDoc.content) : [];

  return NextResponse.json({ files: files.map(f => ({ slug: f.slug, title: f.title, icon: f.icon })), content, h2Headings });
}