import { useCallback, useState, type Dispatch, type SetStateAction } from "react";

import type { ArtisanProductInput } from "../../types/artisan";
import { isProductModel3DMediaItem } from "../../types/productMedia";

type Params = {
  setProductForm: Dispatch<SetStateAction<ArtisanProductInput>>;
  setSaveErrorMessage: Dispatch<SetStateAction<string | null>>;
};

export function useArtisanProductModel3D({ setProductForm, setSaveErrorMessage }: Params) {
  const [productModel3DFile, setProductModel3DFile] = useState<File | null>(null);

  const handleModel3DFileChange = useCallback((file: File | null) => {
    if (!file) {
      setProductModel3DFile(null);
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension !== "glb" && extension !== "gltf") {
      setSaveErrorMessage("El modelo 3D debe estar en formato .glb o .gltf.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setSaveErrorMessage("El modelo 3D no puede superar 8 MB en esta fase.");
      return;
    }

    setSaveErrorMessage(null);
    setProductModel3DFile(file);
  }, [setSaveErrorMessage]);

  const handleRemoveModel3D = useCallback(() => {
    setProductModel3DFile(null);
    setProductForm((currentValue) => ({
      ...currentValue,
      product_media: currentValue.product_media.filter(
        (mediaItem) => !isProductModel3DMediaItem(mediaItem),
      ),
    }));
  }, [setProductForm]);

  return {
    handleModel3DFileChange,
    handleRemoveModel3D,
    productModel3DFile,
    setProductModel3DFile,
  };
}
