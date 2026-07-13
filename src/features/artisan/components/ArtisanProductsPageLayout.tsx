import type { ReactNode } from "react";

import { PagePlaceholder } from "../../../components/PagePlaceholder";

type ArtisanProductsPageLayoutProps = {
  adminHeader: ReactNode;
  confirmModals: ReactNode;
  cropController: ReactNode;
  fileInput: ReactNode;
  form: ReactNode;
  isManagedProfileLoading: boolean;
  managementList: ReactNode;
  statsBar: ReactNode;
  useSingleColumnLayout: boolean;
};

export function ArtisanProductsPageLayout({
  adminHeader,
  confirmModals,
  cropController,
  fileInput,
  form,
  isManagedProfileLoading,
  managementList,
  statsBar,
  useSingleColumnLayout,
}: ArtisanProductsPageLayoutProps) {
  return (
    <PagePlaceholder description="" hideHeader title="">
      {adminHeader}
      {statsBar}
      {isManagedProfileLoading ? (
        <div className="rounded-3xl border border-stone-200 bg-white px-5 py-8 text-sm text-stone-500">
          Cargando perfil vendedor...
        </div>
      ) : (
        <>
          {fileInput}
          <div
            className={
              useSingleColumnLayout
                ? "grid items-start gap-5"
                : "grid items-start gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)]"
            }
          >
            {form}
            {managementList}
          </div>
          {confirmModals}
          {cropController}
        </>
      )}
    </PagePlaceholder>
  );
}
