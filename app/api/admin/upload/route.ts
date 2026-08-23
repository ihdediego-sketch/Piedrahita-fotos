import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const PHOTOS_DIR = path.join(process.cwd(), "public", "photos");

const ALLOWED = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg", ".gif"]);

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development")
    return new NextResponse(null, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  const id = String(form.get("id") ?? "");

  if (!(file instanceof File))
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  if (!/^[a-z0-9-]+$/.test(id))
    return NextResponse.json({ error: "id inválido" }, { status: 400 });

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED.has(ext))
    return NextResponse.json(
      { error: `Formato no permitido: ${ext}` },
      { status: 400 }
    );

  const filename = `${id}${ext}`;
  await fs.mkdir(PHOTOS_DIR, { recursive: true });
  await fs.writeFile(
    path.join(PHOTOS_DIR, filename),
    Buffer.from(await file.arrayBuffer())
  );

  return NextResponse.json({ image: `/photos/${filename}` });
}
