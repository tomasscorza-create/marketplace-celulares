import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { DownloadableQr } from "../components/DownloadableQr";
import { PagePlaceholder } from "../components/PagePlaceholder";
import {
  getArtisanProducts,
  getArtisanSales,
} from "../features/artisan/artisanClient";
import { useAuth } from "../features/auth/useAuth";
import { buildPublicArtisanProfileUrl, buildUrlFileSlug } from "../lib/publicUrls";
import type { ArtisanProduct, ArtisanSaleItem } from "../types/artisan";

export function ArtisanDashboardPage() {
  const { profile, user } = useAuth();
  const [products, setProducts] = useState<ArtisanProduct[]>([]);
  const [sales, setSales] = useState<ArtisanSaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadDashboard = async () => {
      setIsLoading(true);

      const [productsResponse, salesResponse] = await Promise.all([
        getArtisanProducts(user.id),
        getArtisanSales(user.id),
      ]);

      setProducts(productsResponse.data ?? []);
      setSales(salesResponse.data ?? []);
      setIsLoading(false);
    };

    void loadDashboard();
  }, [user]);

  const summary = useMemo(() => {
    const activeProducts = products.filter((product) => product.is_active).length;
    const hiddenProducts = products.length - activeProducts;
    const totalRevenue = sales.reduce(
      (accumulator, item) => accumulator + Number(item.subtotal),
      0,
    );

    return {
      activeProducts,
      hiddenProducts,
      pendingFulfillmentItems: sales.filter(
        (item) => item.fulfillment_status !== "delivered" && item.fulfillment_status !== "cancelled",
      ).length,
      totalRevenue,
      totalSales: sales.length,
    };
  }, [products, sales]);

  const nextSteps = useMemo(() => {
    if (isLoading) {
      return [];
    }

    const steps: Array<{ label: string; to: string }> = [];

    if (!profile?.store_name) {
      steps.push({ label: "Ponele un nombre a tu tienda para que los compradores te reconozcan.", to: "/panel/vendedor/tienda" });
    }

    if (!profile?.profile_image_url) {
      steps.push({ label: "Agrega una foto de perfil para darle identidad visual a tu espacio.", to: "/panel/vendedor/tienda" });
    }

    if (!profile?.store_description) {
      steps.push({ label: "Completá la descripción de tu tienda para dar más contexto a quienes te visiten.", to: "/panel/vendedor/tienda" });
    }

    if (summary.activeProducts === 0) {
      steps.push({ label: "Cargá tu primer producto con precio, categoría e imagen para aparecer en el catálogo.", to: "/panel/vendedor/productos" });
    } else if (summary.activeProducts < 3) {
      steps.push({ label: `Tenés ${summary.activeProducts} producto${summary.activeProducts === 1 ? "" : "s"} visible${summary.activeProducts === 1 ? "" : "s"}. Agregar más aumenta tus posibilidades de consulta.`, to: "/panel/vendedor/productos" });
    }

    if (summary.totalSales === 0 && summary.activeProducts > 0) {
      steps.push({ label: "Tu catálogo está activo. Compartí el enlace de tu perfil para recibir las primeras consultas.", to: user ? `/vendedor/${user.id}` : "/panel/vendedor" });
    }

    return steps;
  }, [isLoading, profile, summary, user]);

  const publicProfileUrl = useMemo(
    () => (user ? buildPublicArtisanProfileUrl(user.id) : ""),
    [user],
  );
  const qrFileBaseName = useMemo(() => {
    const profileLabel = profile?.store_name || profile?.full_name || user?.id || "vendedor";

    return `qr-${buildUrlFileSlug(profileLabel)}`;
  }, [profile, user]);

  return (
    <PagePlaceholder
      actions={
        <>
          <Link
            className="inline-flex w-full items-center justify-center rounded-full border border-ocean-500 px-5 py-3 text-sm font-medium text-ocean-500 transition-colors hover:bg-brand-50 sm:w-auto"
            to="/panel/vendedor/tienda"
          >
            Mi tienda
          </Link>
          <Link
            className="inline-flex w-full items-center justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 sm:w-auto"
            to="/panel/vendedor/productos"
          >
            Productos
          </Link>
        </>
      }
      badge="Vendedor"
      description="Resumen rápido de tu tienda, tu catálogo y tus ventas registradas dentro de la plataforma."
      title={profile?.store_name || "Panel de tu tienda"}
    >
      {summary.pendingFulfillmentItems > 0 ? (
        <section className="mb-5 grid gap-3 rounded-3xl border border-brand-500 bg-brand-50 p-5 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">
              Nueva actividad
            </p>
            <h2 className="mt-1 text-xl font-semibold text-stone-900">
              Tenes ventas pendientes de entrega
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              {summary.pendingFulfillmentItems} producto{summary.pendingFulfillmentItems === 1 ? "" : "s"} requieren gestion.
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            to="/panel/vendedor/ventas"
          >
            Abrir ventas
          </Link>
        </section>
      ) : null}
      {/* ── Métricas ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <article className="rounded-2xl border border-brand-100 bg-gradient-to-br from-[#ECFEFF] to-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-400">
            Productos visibles
          </p>
          <p className="mt-3 text-3xl font-bold tabular-nums text-brand-600">
            {isLoading ? "—" : summary.activeProducts}
          </p>
        </article>

        <article className="rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-50 to-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
            Productos ocultos
          </p>
          <p className="mt-3 text-3xl font-bold tabular-nums text-stone-500">
            {isLoading ? "—" : summary.hiddenProducts}
          </p>
        </article>

        <article className="rounded-2xl border border-ocean-100 bg-gradient-to-br from-[#E0F2FE] to-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-ocean-400">
            Ventas registradas
          </p>
          <p className="mt-3 text-3xl font-bold tabular-nums text-ocean-500">
            {isLoading ? "—" : summary.totalSales}
          </p>
        </article>

        <article className="rounded-2xl border border-brand-100 bg-gradient-to-br from-[#ECFEFF] to-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0e7490]">
            Monto vendido
          </p>
          <p className="mt-3 text-3xl font-bold tabular-nums text-brand-500">
            {isLoading ? "—" : `$${summary.totalRevenue.toLocaleString("es-AR")}`}
          </p>
        </article>

      </div>

      {/* ── Secciones principales ─────────────────────────────────────────── */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">

        {/* Estado de tu tienda */}
        <section className="rounded-3xl border border-ocean-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-ocean-400">
                Tu espacio
              </p>
              <h2 className="mt-2 text-xl font-semibold text-stone-900">
                Estado de tu tienda
              </h2>
            </div>
            {user ? (
              <Link
                className="inline-flex items-center justify-center rounded-full border border-ocean-500 px-4 py-3 text-sm font-medium text-ocean-500 transition-colors hover:bg-brand-50"
                to={`/vendedor/${user.id}`}
              >
                Ver perfil público
              </Link>
            ) : null}
          </div>

          <p className="mt-4 text-sm leading-6 text-stone-600">
            {profile?.store_description ||
              "Todavía no cargaste una descripción para tu tienda. Completarla ayuda a dar más contexto a compradores."}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-4 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-100"
              to="/panel/vendedor/tienda"
            >
              Mi tienda
            </Link>
            <Link
              className="rounded-2xl border border-ocean-100 bg-brand-50 px-4 py-4 text-sm font-medium text-ocean-500 transition-colors hover:bg-ocean-50"
              to="/panel/vendedor/productos"
            >
              Productos
            </Link>
            <Link
              className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm font-medium text-stone-700 transition-colors hover:border-brand-100 hover:bg-brand-50"
              to="/panel/vendedor/ventas"
            >
              Ventas
            </Link>
          </div>
        </section>

        {/* Siguiente foco */}
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
              Próximos pasos
            </p>
            <h2 className="mt-2 text-xl font-semibold text-stone-900">Siguiente foco</h2>
          </div>

          {isLoading ? (
            <p className="mt-5 text-sm text-stone-400">Calculando estado de tu tienda…</p>
          ) : nextSteps.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-ocean-100 bg-brand-50 px-4 py-4 text-sm leading-6 text-ocean-500">
              Tu tienda está completa y activa. Revisá tus ventas para seguir el movimiento.
            </div>
          ) : (
            <ol className="mt-5 grid gap-3 text-sm leading-6 text-stone-600">
              {nextSteps.map((step, index) => (
                <li key={step.label}>
                  <Link
                    className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 transition-colors hover:border-brand-100 hover:bg-brand-50 hover:text-brand-700"
                    to={step.to}
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-bold text-stone-500">
                      {index + 1}
                    </span>
                    {step.label}
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        {user ? (
          <DownloadableQr
            className="lg:col-span-2"
            description="Apunta directo a tu perfil publico dentro del marketplace."
            fileBaseName={qrFileBaseName}
            targetUrl={publicProfileUrl}
            title="Mi QR publico"
          />
        ) : null}

      </div>
    </PagePlaceholder>
  );
}
