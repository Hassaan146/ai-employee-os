"use client";

/**
 * Documents — live against backend/app/api/documents.py.
 *
 * Upload, list, search over extracted text, and delete. OCR runs server-side,
 * so a freshly uploaded file may sit in `uploaded`/`processing` before its text
 * becomes searchable; the UI shows that state rather than pretending the
 * document is ready.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Skeleton,
  cn,
} from "@/components/ui/primitives";
import { IconRefresh } from "@/components/ui/icons";
import { ErrorNotice } from "@/components/ErrorNotice";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  deleteDocument,
  listDocuments,
  parseDocument,
  searchDocuments,
  uploadDocument,
} from "@/lib/api/operations";
import { fileSize, shortDate } from "@/lib/format";
import { DOCUMENT_TYPES, type StoredDocument } from "@/lib/types";

const STATUS_TONE: Record<string, "ok" | "info" | "warn" | "danger" | "neutral"> = {
  uploaded: "info",
  processing: "warn",
  ocr_complete: "ok",
  failed: "danger",
};

export function DocumentsView() {
  const [docs, setDocs] = useState<StoredDocument[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState("other");
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState<StoredDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDocs(await listDocuments());
    } catch (err) {
      setError(err);
      setDocs([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const created = await uploadDocument(file, uploadType);
      setDocs((prev) => (prev ? [created, ...prev] : [created]));
    } catch (err) {
      setError(err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function runSearch() {
    if (!query.trim()) {
      setSearchResult(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await searchDocuments(query.trim());
      setSearchResult(JSON.stringify(res, null, 2));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  /** Trigger server-side text extraction for a document that has not been parsed. */
  async function parse(doc: StoredDocument) {
    setBusy(true);
    setError(null);
    try {
      await parseDocument(doc.id);
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function remove(doc: StoredDocument) {
    setBusy(true);
    try {
      await deleteDocument(doc.id);
      setDocs((prev) => prev?.filter((d) => d.id !== doc.id) ?? prev);
      setConfirming(null);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const shown = (docs ?? []).filter(
    (d) => typeFilter === "all" || d.document_type === typeFilter,
  );

  return (
    <>
      <PageHeader
        title="Documents"
        description="Company files with OCR text extraction and search."
        action={
          <Button onClick={() => void load()} disabled={busy}>
            <IconRefresh className={cn("size-3.5", busy && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {error ? <ErrorNotice error={error} onRetry={() => void load()} /> : null}

      <Card>
        <CardHeader
          title="Upload a document"
          description="PDF, image, or office file. Text is extracted server-side."
        />
        <CardBody className="flex flex-wrap items-end gap-3">
          <div className="w-48">
            <Field label="Document type" htmlFor="doc-type">
              <Select
                id="doc-type"
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="min-w-56 flex-1">
            <Field label="File" htmlFor="doc-file">
              <input
                ref={fileRef}
                id="doc-file"
                type="file"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUpload(f);
                }}
                className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-ink-muted file:mr-3 file:rounded file:border-0 file:bg-accent file:px-3 file:py-1 file:text-[11px] file:font-medium file:text-accent-ink hover:file:bg-accent-dim"
              />
            </Field>
          </div>
          {uploading ? (
            <p className="pb-2 text-[11px] text-accent" role="status" aria-live="polite">
              Uploading…
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Search"
          description="Full-text search across extracted document text."
        />
        <CardBody className="space-y-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label="Query" htmlFor="doc-search">
                <Input
                  id="doc-search"
                  value={query}
                  placeholder="e.g. termination clause"
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void runSearch();
                  }}
                />
              </Field>
            </div>
            <Button variant="primary" onClick={() => void runSearch()} disabled={busy}>
              Search
            </Button>
          </div>
          {searchResult ? (
            <pre className="max-h-64 overflow-auto rounded-lg border border-line-soft bg-canvas px-3 py-2.5 font-mono text-[10px] leading-relaxed text-ink-muted">
              {searchResult}
            </pre>
          ) : null}
        </CardBody>
      </Card>

      <div className="w-48">
        <Field label="Type" htmlFor="doc-filter">
          <Select
            id="doc-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All types</option>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Card>
        <CardHeader
          title="All documents"
          description={docs ? `${shown.length} shown` : "Loading…"}
          action={<Badge tone="ok">Live</Badge>}
        />

        {docs === null ? (
          <CardBody className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </CardBody>
        ) : shown.length === 0 ? (
          <EmptyState
            title={docs.length === 0 ? "No documents yet" : "No matches"}
            description="Upload a file above to make it searchable."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-xs">
              <thead>
                <tr className="border-b border-line-soft text-[10px] uppercase tracking-wider text-ink-faint">
                  <th scope="col" className="px-5 py-3 font-medium">File</th>
                  <th scope="col" className="px-5 py-3 font-medium">Type</th>
                  <th scope="col" className="px-5 py-3 font-medium">Size</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3 font-medium">Uploaded</th>
                  <th scope="col" className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {shown.map((d) => (
                  <tr key={d.id} className="transition hover:bg-surface-2/40">
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink">{d.file_name}</p>
                      {d.ai_summary ? (
                        <p className="line-clamp-1 text-[10px] text-ink-faint">
                          {d.ai_summary}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 capitalize text-ink-muted">
                      {d.document_type.replace("_", " ")}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-ink-muted">
                      {fileSize(d.file_size_bytes)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <Badge tone={STATUS_TONE[d.status] ?? "neutral"}>
                          {d.status.replace("_", " ")}
                        </Badge>
                        {d.is_searchable ? <Badge tone="accent">Searchable</Badge> : null}
                      </div>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-ink-muted">
                      {shortDate(d.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          onClick={() => void parse(d)}
                          disabled={busy}
                          title="Run text extraction on this document"
                        >
                          Parse
                        </Button>
                        <Button variant="danger" onClick={() => setConfirming(d)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {confirming ? (
        <ConfirmDialog
          title="Delete this document?"
          body={`"${confirming.file_name}" and its extracted text will be permanently removed. This cannot be undone.`}
          busy={busy}
          onConfirm={() => void remove(confirming)}
          onCancel={() => setConfirming(null)}
        />
      ) : null}
    </>
  );
}
