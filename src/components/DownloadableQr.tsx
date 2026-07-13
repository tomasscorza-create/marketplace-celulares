import { useEffect, useMemo, useState } from "react";

import { createQrPngDataUrl, createQrSvgText } from "../lib/qrCode";

type DownloadableQrProps = {
  className?: string;
  description?: string;
  fileBaseName: string;
  targetUrl: string;
  title: string;
};

type QrAssetState = {
  pngDataUrl: string;
  svgText: string;
};

function downloadBlob(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(objectUrl);
}

function downloadDataUrl(filename: string, dataUrl: string) {
  const link = document.createElement("a");

  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export function DownloadableQr({
  className = "",
  description,
  fileBaseName,
  targetUrl,
  title,
}: DownloadableQrProps) {
  const [qrAsset, setQrAsset] = useState<QrAssetState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);

  const pngFileName = useMemo(() => `${fileBaseName}.png`, [fileBaseName]);
  const svgFileName = useMemo(() => `${fileBaseName}.svg`, [fileBaseName]);

  useEffect(() => {
    let isCancelled = false;

    const generateQr = async () => {
      setIsGenerating(true);
      setErrorMessage(null);

      try {
        const [pngDataUrl, svgText] = await Promise.all([
          createQrPngDataUrl(targetUrl, { margin: 3, width: 1024 }),
          createQrSvgText(targetUrl, { margin: 3, width: 1024 }),
        ]);

        if (!isCancelled) {
          setQrAsset({ pngDataUrl, svgText });
        }
      } catch {
        if (!isCancelled) {
          setQrAsset(null);
          setErrorMessage("No pudimos generar este QR.");
        }
      } finally {
        if (!isCancelled) {
          setIsGenerating(false);
        }
      }
    };

    void generateQr();

    return () => {
      isCancelled = true;
    };
  }, [targetUrl]);

  return (
    <section
      className={`rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-2xl border border-stone-200 bg-white p-3 shadow-inner sm:mx-0">
          {isGenerating ? (
            <span className="text-center text-xs font-semibold uppercase tracking-widest text-stone-400">
              Generando QR
            </span>
          ) : qrAsset ? (
            <img
              alt={`QR ${title}`}
              className="h-full w-full object-contain"
              decoding="async"
              src={qrAsset.pngDataUrl}
            />
          ) : (
            <span className="text-center text-xs font-semibold uppercase tracking-widest text-brand-500">
              Error
            </span>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-ocean-400">
            QR publico
          </p>
          <h2 className="mt-2 text-xl font-semibold text-stone-900">{title}</h2>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
          ) : null}

          <p className="mt-4 break-all rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-600">
            {targetUrl}
          </p>

          {errorMessage ? (
            <p className="mt-3 rounded-2xl border border-brand-500 bg-brand-100 px-3 py-2 text-sm text-brand-500">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-stone-300"
              disabled={!qrAsset || isGenerating}
              onClick={() => {
                if (qrAsset) {
                  downloadDataUrl(pngFileName, qrAsset.pngDataUrl);
                }
              }}
              type="button"
            >
              Descargar QR
            </button>
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:border-ocean-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-300"
              disabled={!qrAsset || isGenerating}
              onClick={() => {
                if (qrAsset) {
                  downloadBlob(svgFileName, qrAsset.svgText, "image/svg+xml;charset=utf-8");
                }
              }}
              type="button"
            >
              SVG
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
