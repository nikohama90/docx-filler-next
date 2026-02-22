import JSZip from "jszip";

const PLACEHOLDER_RE = /\{\{([A-Za-z0-9_]+)\}\}/g;

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }

  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  const targets: string[] = [];
  if (zip.file("word/document.xml")) targets.push("word/document.xml");

  for (const name of Object.keys(zip.files)) {
    if (
      (name.startsWith("word/header") || name.startsWith("word/footer")) &&
      name.endsWith(".xml")
    ) {
      targets.push(name);
    }
  }

  const found = new Set<string>();

  for (const name of targets) {
    const f = zip.file(name);
    if (!f) continue;
    const xml = await f.async("string");
    let m: RegExpExecArray | null;
    while ((m = PLACEHOLDER_RE.exec(xml)) !== null) found.add(m[1]);
  }

  return Response.json({ placeholders: [...found].sort() });
}