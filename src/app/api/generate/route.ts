import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export async function POST(req: Request) {
  const formData = await req.formData();

  const file = formData.get("file");
  const valuesRaw = formData.get("values");

  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }
  if (typeof valuesRaw !== "string") {
    return Response.json({ error: "Missing values" }, { status: 400 });
  }

  let values: Record<string, string>;
  try {
    values = JSON.parse(valuesRaw);
  } catch {
    return Response.json({ error: "Invalid values JSON" }, { status: 400 });
  }

  const buf = await file.arrayBuffer();
  const zip = new PizZip(buf);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
  });

  try {
    doc.render(values);
  } catch (e: any) {
    return Response.json(
      { error: "Template rendering failed", detail: e?.message ?? String(e) },
      { status: 400 }
    );
  }

  const out = doc.getZip().generate({
    type: "uint8array",
    compression: "DEFLATE",
  });

  return new Response(out, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="generated.docx"',
    },
  });
}