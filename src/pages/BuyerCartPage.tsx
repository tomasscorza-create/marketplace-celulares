import type { BuyerCartValidatedItem } from "../types/commerce";

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { PagePlaceholder } from "../components/PagePlaceholder";
import { buildWhatsAppUrl } from "../components/WhatsAppButton";
import { useAuth } from "../features/auth/useAuth";
import { useBuyerPreferences } from "../features/buyer/buyerQueries";
import {
  useBuyerCartValidation,
  useRemoveCartItem,
  useUpdateCartItemSelection,
  useUpdateCartItemQuantity,
} from "../features/buyer/cartQueries";
import { BuyerCartItemCard } from "../features/buyer/components/BuyerCartItemCard";
import { CompactCheckoutSection } from "../features/buyer/components/CompactCheckoutSection";
import { createMercadoPagoCheckout } from "../features/buyer/checkoutClient";
import {
  buildSellerCartGroups,
  getBuyerDeliveryDistance,
  getCartDeliveryTiming,
  getItemStatusClasses,
  getShippingSummary,
  PICKUP_ADDRESS,
  SHIPPING_NOT_READY_LABEL,
} from "../features/buyer/cartPageUtils";
import { getCheckoutReturnMessage } from "../features/buyer/checkoutReturnUtils";
import { isCordobaProvince } from "../lib/commerce/shippingRate";
import {
  loadArgentinaGeoDataset,
  resolveLocalityFromAddressDetails,
} from "../lib/geo/argentinaGeo";
import { geocodeAddress, isGeocodeAbortError } from "../lib/geo/geocodeAddress";

export function BuyerCartPage() {
  const location = useLocation();
  const { user } = useAuth();
  const buyerId = user?.id;
  const validationQuery = useBuyerCartValidation(buyerId, Boolean(user));
  const preferencesQuery = useBuyerPreferences(buyerId, Boolean(user));
  const updateQuantityMutation = useUpdateCartItemQuantity(buyerId);
  const updateSelectionMutation = useUpdateCartItemSelection(buyerId);
  const removeCartItemMutation = useRemoveCartItem(buyerId);
  const [cartMessage, setCartMessage] = useState<string | null>(() => getCheckoutReturnMessage(location));
  const [cartError, setCartError] = useState<string | null>(null);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<"pickup" | "shipping">("shipping");
  const [isTimingExpanded, setIsTimingExpanded] = useState(false);
  const [isDeliveryExpanded, setIsDeliveryExpanded] = useState(false);
  const [exactAddressCoordinates, setExactAddressCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [datasetCoordinates, setDatasetCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);

  const cartValidation = validationQuery.data;
  const validatedItems = useMemo(() => cartValidation?.items ?? [], [cartValidation?.items]);
  const payableItems = useMemo(
    () => validatedItems.filter((item) => item.status !== "error"),
    [validatedItems],
  );
  const blockedItems = useMemo(
    () => validatedItems.filter((item) => item.status === "error"),
    [validatedItems],
  );
  const errorMessage = validationQuery.error?.message ?? cartError;
  const buyerPreferences = preferencesQuery.data;
  const shippingAddressDetails = buyerPreferences?.shipping_address_details ?? null;
  const needsShippingAddress = selectedDeliveryType === "shipping";
  const buyerProvinceName = shippingAddressDetails?.provinceName ?? null;
  const isCordobaShippingAddress = isCordobaProvince(buyerProvinceName);
  const isShippingAddressMissingForCheckout = Boolean(
    needsShippingAddress && cartValidation?.missing_shipping_address,
  );
  const hasCompleteReceiverData = Boolean(
    !cartValidation?.missing_phone && !isShippingAddressMissingForCheckout,
  );
  const [isBuyerDataExpanded, setIsBuyerDataExpanded] = useState(true);

  useEffect(() => {
    if (buyerPreferences?.preferred_delivery_type === "pickup") {
      setSelectedDeliveryType("pickup");
      return;
    }

    if (buyerPreferences?.preferred_delivery_type === "shipping") {
      setSelectedDeliveryType("shipping");
    }
  }, [buyerPreferences?.preferred_delivery_type]);

  useEffect(() => {
    const addressDetails = shippingAddressDetails;

    if (!addressDetails) {
      setDatasetCoordinates(null);
      return;
    }

    if (typeof addressDetails.latitude === "number" && typeof addressDetails.longitude === "number") {
      setDatasetCoordinates({
        latitude: addressDetails.latitude,
        longitude: addressDetails.longitude,
      });
      return;
    }

    let isCancelled = false;

    void loadArgentinaGeoDataset()
      .then((dataset) => {
        if (isCancelled) {
          return;
        }

        const locality = resolveLocalityFromAddressDetails(dataset, addressDetails);

        if (locality && locality.latitude !== null && locality.longitude !== null) {
          setDatasetCoordinates({
            latitude: locality.latitude,
            longitude: locality.longitude,
          });
          return;
        }

        setDatasetCoordinates(null);
      })
      .catch(() => {
        if (!isCancelled) {
          setDatasetCoordinates(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [shippingAddressDetails]);

  useEffect(() => {
    const addressDetails = shippingAddressDetails;
    const cityName = addressDetails?.cityName || addressDetails?.city || "";
    const provinceName = addressDetails?.provinceName || "";
    const savedLatitude =
      typeof addressDetails?.latitude === "number"
        ? addressDetails.latitude
        : typeof buyerPreferences?.shipping_latitude === "number"
          ? buyerPreferences.shipping_latitude
          : null;
    const savedLongitude =
      typeof addressDetails?.longitude === "number"
        ? addressDetails.longitude
        : typeof buyerPreferences?.shipping_longitude === "number"
          ? buyerPreferences.shipping_longitude
          : null;

    if (typeof savedLatitude === "number" && typeof savedLongitude === "number") {
      setExactAddressCoordinates({
        latitude: savedLatitude,
        longitude: savedLongitude,
      });
      setIsGeocodingAddress(false);
      return;
    }

    if (!addressDetails?.street || !addressDetails.number || !cityName || !provinceName) {
      setExactAddressCoordinates(null);
      setIsGeocodingAddress(false);
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();
    setIsGeocodingAddress(true);

    void geocodeAddress({
      city: cityName,
      number: addressDetails.number,
      province: provinceName,
      street: addressDetails.street,
    }, {
      signal: controller.signal,
      timeoutMs: 3500,
    })
      .then((coordinates) => {
        if (!isCancelled) {
          setExactAddressCoordinates(coordinates);
        }
      })
      .catch((error) => {
        if (isGeocodeAbortError(error)) {
          return;
        }

        if (!isCancelled) {
          setExactAddressCoordinates(null);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsGeocodingAddress(false);
        }
      });

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [
    buyerPreferences?.shipping_latitude,
    buyerPreferences?.shipping_longitude,
    shippingAddressDetails,
  ]);

  const sellerGroups = useMemo(
    () => buildSellerCartGroups(payableItems),
    [payableItems],
  );
  const blockedSellerGroups = useMemo(
    () => buildSellerCartGroups(blockedItems),
    [blockedItems],
  );

  const deliveryTiming = useMemo(
    () => getCartDeliveryTiming(validatedItems, selectedDeliveryType),
    [selectedDeliveryType, validatedItems],
  );
  const buyerDeliveryDistance = useMemo(() => {
    return getBuyerDeliveryDistance({
      buyerPreferences,
      datasetCoordinates,
      exactAddressCoordinates,
      shippingAddressDetails,
    });
  }, [
    buyerPreferences,
    datasetCoordinates,
    exactAddressCoordinates,
    shippingAddressDetails,
  ]);
  const shippingSummary = useMemo(() => {
    return getShippingSummary({
      buyerDeliveryDistance,
      isCordobaShippingAddress,
      isGeocodingAddress,
      isShippingAddressMissingForCheckout,
      selectedDeliveryType,
    });
  }, [
    buyerDeliveryDistance,
    isGeocodingAddress,
    isCordobaShippingAddress,
    isShippingAddressMissingForCheckout,
    selectedDeliveryType,
  ]);
  const subtotalAmount = Number(cartValidation?.total_amount ?? 0);
  const purchaseHelpWhatsAppUrl = buildWhatsAppUrl("Hola, tengo una duda con mi compra.");
  const checkoutBlockedReason =
    selectedDeliveryType === "shipping" && !shippingSummary.isReady ? shippingSummary.reason : null;
  const checkoutTotalAmount =
    selectedDeliveryType === "shipping"
      ? shippingSummary.isReady
        ? subtotalAmount + shippingSummary.amount
        : null
      : subtotalAmount;
  const canStartCheckout = Boolean(
    cartValidation?.can_checkout &&
      !isShippingAddressMissingForCheckout &&
      !checkoutBlockedReason &&
      !isStartingCheckout,
  );

  useEffect(() => {
    if (!cartMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCartMessage(null);
    }, 2000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [cartMessage]);

  useEffect(() => {
    setIsBuyerDataExpanded(!hasCompleteReceiverData);
  }, [hasCompleteReceiverData]);

  useEffect(() => {
    if (checkoutBlockedReason) {
      setIsDeliveryExpanded(true);
    }
  }, [checkoutBlockedReason]);

  useEffect(() => {
    setIsTimingExpanded(false);
  }, [deliveryTiming.detailLabel]);

  return (
    <PagePlaceholder
      actions={null}
      badge=""
      description=""
      title="Mi carrito"
    >
      {errorMessage ? (
        <div className="rounded-2xl border border-brand-500 bg-brand-100 px-4 py-3 text-sm text-brand-500">
          {errorMessage}
        </div>
      ) : null}

      {cartMessage ? (
        <div className="rounded-2xl border border-ocean-200 bg-brand-50 px-4 py-3 text-sm text-ocean-600">
          {cartMessage}
        </div>
      ) : null}

      {validationQuery.isLoading ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-5 text-sm text-stone-500 shadow-sm">
          Revisando tu compra...
        </div>
      ) : null}

      {!validationQuery.isLoading && validatedItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white/85 p-6 text-sm leading-6 text-stone-600">
          Tu carrito esta vacio.
        </div>
      ) : null}

      {!validationQuery.isLoading && validatedItems.length > 0 ? (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="grid gap-4">
            {cartValidation?.checkout_blockers.length ? (
              <div className="rounded-3xl border border-brand-200 bg-brand-50 px-5 py-4">
                <p className="text-sm font-semibold uppercase tracking-widest text-brand-500">
                  Compra en revision
                </p>
                <div className="mt-3 grid gap-2 text-sm text-brand-500">
                  {cartValidation.checkout_blockers.map((blocker) => (
                    <p key={blocker}>{blocker}</p>
                  ))}
                </div>
              </div>
            ) : null}

            {[
              {
                groups: sellerGroups,
                key: "payable",
                subtitle: "Estas piezas ya estan reservadas para avanzar con tu compra.",
                title: "Tu seleccion esta lista",
              },
              {
                groups: blockedSellerGroups,
                key: "blocked",
                subtitle: "Al corregir una pieza pasa automaticamente arriba.",
                title: "Para corregir",
              },
            ].filter((section) => section.groups.length > 0).map((section) => (
              <div key={section.key} className="grid gap-2.5">
                <div className="px-1">
                  <h2 className="text-[15px] font-semibold tracking-[0.03em] text-ocean-500">
                    {section.title}
                  </h2>
                  <p className="text-xs leading-5 text-stone-500">{section.subtitle}</p>
                </div>
                {section.groups.map((group) => (
                  <section
                    key={`${section.key}-${group.artisanId}`}
                    className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.28)]"
                  >
                <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                      {group.storeName}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-stone-900">{group.artisanName}</h2>
                    <p className="mt-1 text-sm text-stone-500">
                      {group.itemCount} pieza{group.itemCount === 1 ? "" : "s"} · $
                      {Number(group.totalAmount).toLocaleString("es-AR")}
                    </p>
                  </div>
                  <span
                    className={`inline-flex self-start rounded-full border px-3 py-1 text-xs font-semibold ${getItemStatusClasses(group.sellerStatus)}`}
                  >
                    {group.sellerStatus === "error"
                      ? "Hay piezas para corregir"
                      : group.sellerStatus === "warning"
                        ? "Compra actualizada"
                        : "Todo listo con este vendedor"}
                  </span>
                </div>

                <div className="grid gap-3">
                  {group.items.map((item: BuyerCartValidatedItem) => (
                    <BuyerCartItemCard
                      key={item.id}
                      item={item}
                      onError={(message) => {
                        setCartMessage(null);
                        setCartError(message);
                      }}
                      onMessage={(message) => {
                        setCartError(null);
                        setCartMessage(message);
                      }}
                      onStartAction={() => {
                        setCartError(null);
                        setCartMessage(null);
                      }}
                      removeCartItemMutation={removeCartItemMutation}
                      updateQuantityMutation={updateQuantityMutation}
                      updateSelectionMutation={updateSelectionMutation}
                    />
                  ))}
                </div>
                  </section>
                ))}
              </div>
            ))}
          </section>

          <aside className="grid gap-3 self-start rounded-[1.65rem] border border-ocean-100 bg-[linear-gradient(180deg,_#ffffff,_#f5f8ff)] p-4 shadow-[0_18px_44px_-32px_rgba(11,58,130,0.35)] lg:mt-[3.15rem]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-ocean-600">
                Listo para pagar
              </p>
              <h2 className="mt-1 text-lg font-semibold text-stone-900">Resumen de tu compra</h2>
            </div>

            <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm text-stone-600">
              <div className="flex items-center justify-between gap-3">
                <span>Vendedores</span>
                <span className="font-semibold text-stone-900">{cartValidation?.active_seller_count ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Piezas</span>
                <span className="font-semibold text-stone-900">{cartValidation?.total_items ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Subtotal</span>
                <span className="font-semibold text-stone-900">
                  ${subtotalAmount.toLocaleString("es-AR")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>{selectedDeliveryType === "shipping" ? "Envio" : "Retiro"}</span>
                <span
                  className={`font-semibold ${
                    shippingSummary.isReady ? "text-stone-900" : "text-brand-500"
                  }`}
                >
                  {selectedDeliveryType === "shipping" ? shippingSummary.label : "Sin cargo"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Total actualizado</span>
                <span className="text-lg font-semibold text-ocean-500">
                  {checkoutTotalAmount === null
                    ? SHIPPING_NOT_READY_LABEL
                    : `$${Number(checkoutTotalAmount).toLocaleString("es-AR")}`}
                </span>
              </div>
            </div>

            <div className="grid gap-3">
              <button
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0B3A82,#1A5FD0)] px-5 py-3 text-base font-semibold text-white shadow-elev-3 transition-all hover:-translate-y-0.5 hover:shadow-elev-3 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                disabled={!canStartCheckout}
                onClick={async () => {
                  setCartError(null);
                  setCartMessage(null);
                  setIsStartingCheckout(true);

                  const response = await createMercadoPagoCheckout({
                    deliveryType: selectedDeliveryType,
                    returnOrigin: window.location.origin,
                    shippingAddress: needsShippingAddress
                      ? buyerPreferences?.shipping_address ?? undefined
                      : undefined,
                    shippingLatitude:
                      needsShippingAddress && buyerDeliveryDistance
                        ? (exactAddressCoordinates?.latitude ??
                            shippingAddressDetails?.latitude ??
                            buyerPreferences?.shipping_latitude ??
                            datasetCoordinates?.latitude ??
                            undefined)
                        : undefined,
                    shippingLongitude:
                      needsShippingAddress && buyerDeliveryDistance
                        ? (exactAddressCoordinates?.longitude ??
                            shippingAddressDetails?.longitude ??
                            buyerPreferences?.shipping_longitude ??
                            datasetCoordinates?.longitude ??
                            undefined)
                        : undefined,
                    shippingProvinceName: needsShippingAddress ? buyerProvinceName ?? undefined : undefined,
                  }).catch((error: Error) => ({
                    data: null,
                    error,
                  }));

                  setIsStartingCheckout(false);

                  if (response.error || !response.data) {
                    setCartError(response.error?.message || "No pudimos iniciar el pago en este momento.");
                    return;
                  }

                  window.location.href = response.data.checkoutUrl;
                }}
                type="button"
              >
                {isStartingCheckout ? "Preparando pago..." : "Hacer la compra"}
              </button>
              {checkoutBlockedReason ? (
                <p className="text-sm text-brand-500">{checkoutBlockedReason}</p>
              ) : null}
              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-2xl border border-[#25D366]/35 bg-whatsapp/10 px-4 py-3 text-xs leading-5 text-stone-700">
                Tienes alguna duda con tu compra? Escribenos por{" "}
                <a
                  className="inline-flex items-center rounded-full bg-whatsapp px-3 py-1 text-xs font-bold text-white shadow-[0_8px_18px_-10px_rgba(37,211,102,0.85)] transition hover:bg-[#1ebe5d]"
                  href={purchaseHelpWhatsAppUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  WhatsApp
                </a>
              </p>
            </div>

            <CompactCheckoutSection
              isExpanded={isBuyerDataExpanded}
              isProblem={!hasCompleteReceiverData}
              onToggle={() => {
                setIsBuyerDataExpanded((currentValue) => !currentValue);
              }}
              status={
                hasCompleteReceiverData
                  ? "Telefono y entrega listos"
                  : cartValidation?.missing_phone
                    ? "Falta telefono"
                    : "Falta direccion"
              }
              title="Mis datos"
            >
                <div className="grid gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <span>Telefono de contacto</span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        cartValidation?.missing_phone
                          ? "bg-brand-50 text-brand-500"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {cartValidation?.missing_phone ? "Falta completar" : "Listo"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Direccion de entrega</span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        isShippingAddressMissingForCheckout
                          ? "bg-brand-50 text-[#0e7490]"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {isShippingAddressMissingForCheckout ? "Falta para envio" : "Cargada"}
                    </span>
                  </div>
                  <Link
                    className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                      cartValidation?.missing_phone || isShippingAddressMissingForCheckout
                        ? "border-brand-300 bg-brand-50 text-brand-500 shadow-[0_0_0_2px_rgba(199,84,32,0.08)] hover:bg-[#F8E2D7]"
                        : "border-stone-300 bg-white text-stone-600 hover:border-ocean-200 hover:bg-brand-50 hover:text-ocean-600"
                    }`}
                    to="/panel/comprador/cuenta/contacto"
                    state={{ returnToCart: true }}
                  >
                    Revisar datos de compra
                  </Link>
                </div>
            </CompactCheckoutSection>

            <CompactCheckoutSection
              isExpanded={isDeliveryExpanded}
              isProblem={Boolean(checkoutBlockedReason)}
              onToggle={() => {
                setIsDeliveryExpanded((currentValue) => !currentValue);
              }}
              status={
                selectedDeliveryType === "shipping"
                  ? shippingSummary.isReady
                    ? `Envio ${shippingSummary.label}`
                    : shippingSummary.label
                  : "Retiro sin cargo"
              }
              title="Entrega"
            >
              <div className="grid gap-3">

              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                    selectedDeliveryType === "pickup"
                      ? "border-ocean-500 bg-brand-50 text-ocean-600"
                      : "border-stone-300 bg-white text-stone-600 hover:border-ocean-200 hover:bg-stone-50"
                  }`}
                  onClick={() => {
                    setSelectedDeliveryType("pickup");
                  }}
                  type="button"
                >
                  Punto de retiro
                </button>
                <button
                  className={`inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                    selectedDeliveryType === "shipping"
                      ? "border-ocean-500 bg-brand-50 text-ocean-600"
                      : "border-stone-300 bg-white text-stone-600 hover:border-ocean-200 hover:bg-stone-50"
                  }`}
                  onClick={() => {
                    setSelectedDeliveryType("shipping");
                  }}
                  type="button"
                >
                  Envio
                </button>
              </div>

              {selectedDeliveryType === "pickup" ? (
                <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
                  <div className="border-b border-stone-200 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">
                      Punto de retiro
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="min-w-0 text-sm font-medium text-stone-800">{PICKUP_ADDRESS}</p>
                      <button
                        aria-label="Copiar direccion de retiro"
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white text-xs font-semibold text-stone-600 transition-colors hover:border-ocean-300 hover:text-ocean-600"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(PICKUP_ADDRESS);
                            setCartError(null);
                            setCartMessage("Direccion copiada.");
                          } catch {
                            setCartError("No pudimos copiar la direccion.");
                          }
                        }}
                        type="button"
                      >
                        ⧉
                      </button>
                    </div>
                    {buyerDeliveryDistance ? (
                      <p className="mt-2 text-xs text-stone-500">
                        Distancia estimada: {buyerDeliveryDistance.label}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {selectedDeliveryType === "shipping" ? (
                <div
                  className={`rounded-2xl border px-4 py-3 ${
                    isShippingAddressMissingForCheckout
                      ? "border-brand-200 bg-brand-50"
                      : "border-stone-200 bg-stone-50"
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">
                    Direccion de envio
                  </p>
                  <p
                    className={`mt-1 text-sm font-medium ${
                      isShippingAddressMissingForCheckout ? "text-brand-500" : "text-stone-800"
                    }`}
                  >
                    {buyerPreferences?.shipping_address?.trim()
                      ? buyerPreferences.shipping_address
                      : "Falta cargar una direccion de entrega."}
                  </p>
                  {buyerDeliveryDistance ? (
                    <p className="mt-2 text-xs text-stone-500">
                      Distancia estimada desde despacho: {buyerDeliveryDistance.label}
                    </p>
                  ) : null}
                  {shippingSummary.reason ? (
                    <p className="mt-2 text-xs text-brand-500">{shippingSummary.reason}</p>
                  ) : null}
                </div>
              ) : null}
              </div>
            </CompactCheckoutSection>

            <CompactCheckoutSection
              isExpanded={isTimingExpanded}
              onToggle={() => {
                setIsTimingExpanded((currentValue) => !currentValue);
              }}
              status={deliveryTiming.detailLabel}
              title="Tiempo"
            >
              <div className="grid gap-2">
                <p className="text-sm font-medium text-stone-900">{deliveryTiming.primaryLabel}</p>
                <p className="text-sm text-stone-600">{deliveryTiming.secondaryLabel}</p>
                {deliveryTiming.tertiaryLabel ? (
                  <p className="text-sm text-stone-500">{deliveryTiming.tertiaryLabel}</p>
                ) : null}
              </div>
            </CompactCheckoutSection>
          </aside>
        </div>
      ) : null}
    </PagePlaceholder>
  );
}
