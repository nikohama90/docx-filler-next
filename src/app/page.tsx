"use client";

import { useMemo, useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState<"scan" | "gen" | null>(null);

  const valuesComplete = useMemo(() => {
    const obj: Record<string, string> = {};
    for (const ph of placeholders) obj[ph] = values[ph] ?? "";
    return obj;
  }, [placeholders, values]);

  async function scan() {
    if (!file) {
      setError("Please select a .docx file before scanning.");
      return;
    }

    setError("");
    setBusy("scan");
    setPlaceholders([]);
    setValues({});

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/placeholders", {
        method: "POST",
        body: fd,
      });

      const text = await res.text();

      if (!res.ok) {
        try {
          const j = JSON.parse(text);
          throw new Error(j?.error ?? "Failed to scan template.");
        } catch {
          throw new Error("Failed to scan template.");
        }
      }

      const data = JSON.parse(text) as { placeholders: string[] };
      setPlaceholders(data.placeholders ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Unexpected error while scanning.");
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    if (!file) return;

    setError("");
    setBusy("gen");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("values", JSON.stringify(valuesComplete));

      const res = await fetch("/api/generate", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text();
        try {
          const j = JSON.parse(text);
          throw new Error(j?.detail ?? j?.error ?? "Document generation failed.");
        } catch {
          throw new Error("Document generation failed.");
        }
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "generated.docx";
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message ?? "Unexpected error during generation.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold mb-6">
        DOCX Placeholder Filler
      </h1>

      {/* Upload Card */}
      <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
        <div>
          <div className="space-y-2">
            <label className="block text-base font-semibold text-gray-900">
              Upload .docx template
            </label>

            <label
              className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-400
                        bg-gray-50 px-4 py-3 text-gray-600 hover:bg-gray-100 hover:border-gray-500 transition-colors"
            >
              <input
                type="file"
                accept=".docx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <span className="font-medium">
                {file ? file.name : "Click to select a .docx file"}
              </span>
            </label>
          </div>
        </div>

        <button
          onClick={scan}
          disabled={!file || busy !== null}
          className="rounded-lg bg-green-600 px-4 py-2 text-white font-medium 
                     hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy === "scan" ? "Scanning..." : "Scan placeholders"}
        </button>

        {file && placeholders.length > 0 && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-gray-900">
            Loaded{" "}
            <strong>{placeholders.length}</strong>{" "}
            placeholder{placeholders.length !== 1 && "s"} from{" "}
            <strong>{file.name}</strong>.
          </div>
        )}

        {file && placeholders.length === 0 && busy === null && !error && (
          <div className="text-sm text-gray-500">
            Selected file: <strong>{file.name}</strong>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3">
            <div className="font-medium text-red-700 mb-1">
              Something went wrong
            </div>
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}
      </div>

      {/* Placeholder Form */}
      {placeholders.length > 0 && (
        <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Fill values</h2>

          <div className="space-y-3 text-gray-900">
            {placeholders.map((ph) => (
              <div key={ph}>
                <label className="block text-sm font-medium">{ph}</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none "
                  value={values[ph] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [ph]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>

          <button
            onClick={generate}
            disabled={busy !== null}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy === "gen" ? "Generating..." : "Generate document"}
          </button>
        </div>
      )}
    </main>
  );
}