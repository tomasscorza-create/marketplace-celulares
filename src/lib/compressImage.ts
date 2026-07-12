export type ImageCropAspect = "square" | "portrait";

export type ImageCropSettings = {
  aspect?: ImageCropAspect;
  frameHeight?: number;
  frameWidth?: number;
  offsetX: number;
  offsetY: number;
  zoom: number;
};

type CompressImageOptions = {
  crop?: ImageCropSettings;
  maxBytes?: number;
  maxDimension?: number;
  quality?: number;
};

type CropPreset = {
  outputHeight: number;
  outputWidth: number;
  ratioHeight: number;
  ratioWidth: number;
};

const cropPresets: Record<ImageCropAspect, CropPreset> = {
  square: {
    outputHeight: 720,
    outputWidth: 720,
    ratioHeight: 1,
    ratioWidth: 1,
  },
  portrait: {
    outputHeight: 1200,
    outputWidth: 960,
    ratioHeight: 5,
    ratioWidth: 4,
  },
};

function getSourceUrl(source: File | string) {
  if (typeof source === "string") {
    return {
      release: () => {},
      url: source,
    };
  }

  try {
    const objectUrl = URL.createObjectURL(source);

    return {
      release: () => {
        URL.revokeObjectURL(objectUrl);
      },
      url: objectUrl,
    };
  } catch {
    throw new Error("No pudimos leer la imagen seleccionada.");
  }
}

export function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    if (/^https?:\/\//i.test(dataUrl)) {
      image.crossOrigin = "anonymous";
    }

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No pudimos procesar la imagen seleccionada."));
    image.src = dataUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
            return;
          }

          reject(new Error("No pudimos generar una version comprimida de la imagen."));
        },
        "image/webp",
        quality,
      );
    } catch {
      reject(
        new Error(
          "No pudimos exportar esa imagen. Proba recargar la pagina o cambiar la foto.",
        ),
      );
    }
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getCropPreset(aspect: ImageCropAspect = "square") {
  return cropPresets[aspect];
}

export function getCropFrameDimensions(
  aspect: ImageCropAspect = "square",
  maxWidth: number,
) {
  const preset = getCropPreset(aspect);
  const width = maxWidth;
  const height = Math.round((maxWidth * preset.ratioHeight) / preset.ratioWidth);

  return {
    height,
    width,
  };
}

export function getCropLayout(
  dimensions: { height: number; width: number } | null,
  crop: ImageCropSettings,
  frameWidth: number,
  frameHeight: number,
) {
  if (!dimensions) {
    return {
      drawHeight: frameHeight,
      drawWidth: frameWidth,
      left: 0,
      maxOffsetX: 0,
      maxOffsetY: 0,
      top: 0,
    };
  }

  const baseScale = Math.max(frameWidth / dimensions.width, frameHeight / dimensions.height);
  const drawWidth = dimensions.width * baseScale * crop.zoom;
  const drawHeight = dimensions.height * baseScale * crop.zoom;
  const maxOffsetX = Math.max(0, (drawWidth - frameWidth) / 2);
  const maxOffsetY = Math.max(0, (drawHeight - frameHeight) / 2);
  const offsetX = clamp(crop.offsetX, -maxOffsetX, maxOffsetX);
  const offsetY = clamp(crop.offsetY, -maxOffsetY, maxOffsetY);

  return {
    drawHeight,
    drawWidth,
    left: (frameWidth - drawWidth) / 2 + offsetX,
    maxOffsetX,
    maxOffsetY,
    top: (frameHeight - drawHeight) / 2 + offsetY,
  };
}

export function getScaledCropStyle(
  cropLayout: ReturnType<typeof getCropLayout>,
  sourceFrame: { height: number; width: number },
  targetFrame: { height: number; width: number },
) {
  return {
    height: `${cropLayout.drawHeight * (targetFrame.height / sourceFrame.height)}px`,
    left: `${cropLayout.left * (targetFrame.width / sourceFrame.width)}px`,
    top: `${cropLayout.top * (targetFrame.height / sourceFrame.height)}px`,
    width: `${cropLayout.drawWidth * (targetFrame.width / sourceFrame.width)}px`,
  };
}

function drawCrop(
  image: HTMLImageElement,
  crop: ImageCropSettings | undefined,
) {
  const aspect = crop?.aspect ?? "square";
  const preset = getCropPreset(aspect);
  const canvas = document.createElement("canvas");
  canvas.width = preset.outputWidth;
  canvas.height = preset.outputHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("No pudimos preparar la compresion de la imagen.");
  }

  const sourceFrameWidth = crop?.frameWidth ?? preset.outputWidth;
  const sourceFrameHeight = crop?.frameHeight ?? preset.outputHeight;
  const offsetScaleX = preset.outputWidth / sourceFrameWidth;
  const offsetScaleY = preset.outputHeight / sourceFrameHeight;
  const layout = getCropLayout(
    {
      height: image.height,
      width: image.width,
    },
    {
      aspect,
      frameHeight: preset.outputHeight,
      frameWidth: preset.outputWidth,
      offsetX: (crop?.offsetX ?? 0) * offsetScaleX,
      offsetY: (crop?.offsetY ?? 0) * offsetScaleY,
      zoom: crop?.zoom ?? 1,
    },
    preset.outputWidth,
    preset.outputHeight,
  );

  context.drawImage(image, layout.left, layout.top, layout.drawWidth, layout.drawHeight);

  return canvas;
}

async function createProcessedCanvas(
  source: File | string,
  { crop, maxDimension = 1400 }: Pick<CompressImageOptions, "crop" | "maxDimension"> = {},
) {
  const sourceUrl = getSourceUrl(source);

  try {
    const image = await loadImage(sourceUrl.url);

    if (crop) {
      const croppedCanvas = drawCrop(image, crop);
      const scale = Math.min(1, maxDimension / Math.max(croppedCanvas.width, croppedCanvas.height));

      if (scale >= 1) {
        return croppedCanvas;
      }

      const targetWidth = Math.max(1, Math.round(croppedCanvas.width * scale));
      const targetHeight = Math.max(1, Math.round(croppedCanvas.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("No pudimos preparar la compresion de la imagen.");
      }

      context.drawImage(croppedCanvas, 0, 0, targetWidth, targetHeight);
      return canvas;
    }

    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("No pudimos preparar la compresion de la imagen.");
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);
    return canvas;
  } finally {
    sourceUrl.release();
  }
}

export async function createImagePreviewUrl(
  source: File | string,
  {
    crop,
    maxDimension = 1400,
    quality = 0.82,
  }: Pick<CompressImageOptions, "crop" | "maxDimension" | "quality"> = {},
) {
  const canvas = await createProcessedCanvas(source, {
    crop,
    maxDimension,
  });
  const blob = await canvasToBlob(canvas, quality);

  return URL.createObjectURL(blob);
}

export async function createProcessedImageFile(
  source: File | string,
  {
    crop,
    maxBytes = 5 * 1024 * 1024,
    maxDimension = 1400,
    quality = 0.82,
  }: CompressImageOptions = {},
  fileBaseName = "imagen",
) {
  const canvas = await createProcessedCanvas(source, {
    crop,
    maxDimension,
  });
  const compressedBlob = await canvasToBlob(canvas, quality);

  if (compressedBlob.size > maxBytes) {
    throw new Error("La imagen sigue siendo demasiado pesada incluso después de comprimirla.");
  }

  return new File([compressedBlob], `${fileBaseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

export async function compressImage(
  file: File,
  {
    crop,
    maxDimension = 1400,
    maxBytes = 5 * 1024 * 1024,
    quality = 0.82,
  }: CompressImageOptions = {},
) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecciona un archivo de imagen válido.");
  }

  const compressedFile = await createProcessedImageFile(
    file,
    {
      crop,
      maxBytes,
      maxDimension,
      quality,
    },
    file.name.replace(/\.[^.]+$/, "") || "imagen",
  );

  if (compressedFile.size >= file.size && file.size <= maxBytes && !crop) {
    return file;
  }

  return compressedFile;
}
