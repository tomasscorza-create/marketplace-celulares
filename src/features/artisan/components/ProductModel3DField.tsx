import type { ProductMediaItem } from "../../../types/productMedia";

type Props = {
  onFileChange: (file: File | null) => void;
  onRemove: () => void;
  productMedia: ProductMediaItem[];
  selectedFile: File | null;
};

export function ProductModel3DField({ onFileChange, onRemove, productMedia, selectedFile }: Props) {
  const currentModel = productMedia.find((item) => item.type === "model_3d") ?? null;
  const hasModel = Boolean(selectedFile || currentModel);

  return (
    <section className="grid gap-3 rounded-[1.75rem] border border-stone-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-stone-900">Modelo 3D</p>
          <p className="text-sm leading-6 text-stone-500">
            Acepta archivos .glb o .gltf livianos para la vista interactiva del catálogo.
          </p>
        </div>

        {hasModel ? (
          <button
            className="rounded-full border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:border-brand-200 hover:bg-brand-50"
            onClick={onRemove}
            type="button"
          >
            Quitar
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-stone-800">
            {selectedFile?.name ?? currentModel?.description ?? currentModel?.url ?? "Sin modelo 3D cargado"}
          </p>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            {selectedFile
              ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB - se sube al guardar`
              : currentModel
                ? "Modelo activo guardado en el producto."
                : "Formato recomendado: .glb, hasta 8 MB en esta fase."}
          </p>
        </div>

        <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-ocean-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-ocean-700">
          Cargar 3D
          <input
            accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
            className="sr-only"
            onChange={(event) => {
              onFileChange(event.target.files?.[0] ?? null);
              event.currentTarget.value = "";
            }}
            type="file"
          />
        </label>
      </div>
    </section>
  );
}
