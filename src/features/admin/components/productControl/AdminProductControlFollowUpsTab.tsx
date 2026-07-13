import type { ReactNode } from "react";
import { memo, useMemo } from "react";

import type { FollowUpItem } from "../AdminProductControlDetailModal";

import { SectionEmpty, getTagOption } from "./shared";

type AdminProductControlFollowUpsTabProps = {
  followUpItems: FollowUpItem[];
  onSelectProduct: (id: string) => void;
};

function FollowUpCard({
  item,
  badge,
  onSelect,
}: {
  item: FollowUpItem;
  badge: ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 text-left transition-colors hover:border-ocean-500/20 hover:bg-brand-50/50"
      onClick={onSelect}
      type="button"
    >
      {item.imageUrl ? (
        <img
          alt={item.title}
          className="h-10 w-10 shrink-0 rounded-xl border border-stone-200 object-cover"
          decoding="async"
          loading="lazy"
          src={item.imageUrl}
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-100 text-[9px] font-medium text-stone-400">
          Sin foto
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-stone-900">{item.title}</p>
        <p className="truncate text-xs text-stone-500">{item.artisanLabel}</p>
      </div>

      <div className="shrink-0">{badge}</div>
    </button>
  );
}

/**
 * Tab "Seguimientos": lista los productos con etiqueta, comentario o
 * boost activo, agrupados por tipo. Click en uno → cambia al tab Info
 * de ese producto.
 */
function AdminProductControlFollowUpsTabInner({
  followUpItems,
  onSelectProduct,
}: AdminProductControlFollowUpsTabProps) {
  const taggedItems = useMemo(
    () => followUpItems.filter((i) => i.currentTag !== null),
    [followUpItems],
  );
  const commentedItems = useMemo(
    () => followUpItems.filter((i) => Boolean(i.comment?.trim())),
    [followUpItems],
  );
  const boostedItems = useMemo(
    () => followUpItems.filter((i) => i.boostSummaryLabel !== null),
    [followUpItems],
  );
  const totalFollowUp = followUpItems.length;

  return (
    <div className="grid gap-5 p-5">
      {totalFollowUp === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 px-5 py-8 text-center text-sm text-stone-400">
          Ningún producto tiene etiqueta, comentario o boost activo todavía.
        </div>
      ) : null}

      {/* Etiquetas */}
      <div className="grid gap-2">
        <div className="flex items-center gap-2 px-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">Etiquetas</p>
          {taggedItems.length > 0 ? (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-500">
              {taggedItems.length}
            </span>
          ) : null}
        </div>
        {taggedItems.length === 0 ? (
          <SectionEmpty />
        ) : (
          taggedItems.map((item) => {
            const opt = getTagOption(item.currentTag);
            return (
              <FollowUpCard
                key={item.id}
                badge={
                  opt ? (
                    <span
                      className={[
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                        opt.activeClassName,
                      ].join(" ")}
                    >
                      {opt.icon}
                      {opt.label}
                    </span>
                  ) : null
                }
                item={item}
                onSelect={() => {
                  onSelectProduct(item.id);
                }}
              />
            );
          })
        )}
      </div>

      <hr className="border-stone-100" />

      {/* Comentarios */}
      <div className="grid gap-2">
        <div className="flex items-center gap-2 px-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">Comentarios</p>
          {commentedItems.length > 0 ? (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-500">
              {commentedItems.length}
            </span>
          ) : null}
        </div>
        {commentedItems.length === 0 ? (
          <SectionEmpty />
        ) : (
          commentedItems.map((item) => (
            <FollowUpCard
              key={item.id}
              badge={
                <span className="max-w-[140px] truncate rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] font-medium text-stone-600">
                  {item.comment}
                </span>
              }
              item={item}
              onSelect={() => {
                onSelectProduct(item.id);
              }}
            />
          ))
        )}
      </div>

      <hr className="border-stone-100" />

      {/* Boost */}
      <div className="grid gap-2">
        <div className="flex items-center gap-2 px-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">Boost activo</p>
          {boostedItems.length > 0 ? (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-500">
              {boostedItems.length}
            </span>
          ) : null}
        </div>
        {boostedItems.length === 0 ? (
          <SectionEmpty />
        ) : (
          boostedItems.map((item) => (
            <FollowUpCard
              key={item.id}
              badge={
                <span className="rounded-full border border-brand-500/50 bg-brand-100 px-2.5 py-1 text-[10px] font-semibold text-[#0e7490]">
                  Boost {item.boostLevel}
                </span>
              }
              item={item}
              onSelect={() => {
                onSelectProduct(item.id);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

export const AdminProductControlFollowUpsTab = memo(AdminProductControlFollowUpsTabInner);
