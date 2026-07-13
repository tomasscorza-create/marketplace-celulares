import { memo } from "react";

import { ConfirmModal } from "../../../components/ConfirmModal";

type ArtisanProductsConfirmModalsProps = {
  pendingDeleteProductId: string | null;
  pendingDeleteProductTitle: string | null;
  onCancelDeleteProduct: () => void;
  onConfirmDeleteProduct: () => void;
};

function ArtisanProductsConfirmModalsInner(props: ArtisanProductsConfirmModalsProps) {
  return (
    <ConfirmModal
      confirmLabel="Sí, eliminar"
      isDanger
      isOpen={props.pendingDeleteProductId !== null}
      message={`Vas a eliminar "${
        props.pendingDeleteProductTitle ?? "este producto"
      }". Esta acción también quitará sus fotos cargadas.`}
      onCancel={props.onCancelDeleteProduct}
      onConfirm={props.onConfirmDeleteProduct}
      title="Eliminar producto"
    />
  );
}

export const ArtisanProductsConfirmModals = memo(ArtisanProductsConfirmModalsInner);
