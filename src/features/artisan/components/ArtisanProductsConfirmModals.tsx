import { memo } from "react";

import { ConfirmModal } from "../../../components/ConfirmModal";

type ArtisanProductsConfirmModalsProps = {
  /** Borrado individual de producto */
  pendingDeleteProductId: string | null;
  pendingDeleteProductTitle: string | null;
  onCancelDeleteProduct: () => void;
  onConfirmDeleteProduct: () => void;

  /** Crear lote (split por imagen) */
  isBatchCreateConfirmOpen: boolean;
  batchCreateProductCount: number;
  onCancelBatchCreate: () => void;
  onConfirmBatchCreate: () => void;

  /** Borrado de lote */
  pendingDeleteBatchId: string | null;
  pendingDeleteBatchCode: string | null;
  onCancelDeleteBatch: () => void;
  onConfirmDeleteBatch: () => void;
};

/**
 * Agrupa los 3 ConfirmModals que viven al final de ArtisanProductsPage:
 * borrar producto, crear lote (split por imagen), y borrar lote.
 *
 * Solo recibe primitivas y callbacks → totalmente memoizable.
 */
function ArtisanProductsConfirmModalsInner(props: ArtisanProductsConfirmModalsProps) {
  return (
    <>
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

      <ConfirmModal
        confirmLabel="Sí, crear grupo"
        isOpen={props.isBatchCreateConfirmOpen}
        message={`Vas a crear ${props.batchCreateProductCount} producto(s) con los mismos datos base y ajustes individuales por foto. Todos quedarán vinculados dentro del mismo grupo para editarlos o eliminarlos juntos.`}
        onCancel={props.onCancelBatchCreate}
        onConfirm={props.onConfirmBatchCreate}
        title="Crear grupo de productos"
      />

      <ConfirmModal
        confirmLabel="Sí, eliminar grupo"
        isDanger
        isOpen={props.pendingDeleteBatchId !== null}
        message={`Vas a eliminar el grupo ${
          props.pendingDeleteBatchCode ?? "seleccionado"
        } con todos sus productos.`}
        onCancel={props.onCancelDeleteBatch}
        onConfirm={props.onConfirmDeleteBatch}
        title="Eliminar grupo"
      />
    </>
  );
}

export const ArtisanProductsConfirmModals = memo(ArtisanProductsConfirmModalsInner);
