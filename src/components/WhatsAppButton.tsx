import { useEffect, useRef, useState } from "react";
import { marketplaceConfig } from "../config/marketplace";
type WhatsAppButtonProps = {
  message: string;
  className?: string;
};

export function buildWhatsAppUrl(message: string): string {
  return buildWhatsAppUrlForPhone(marketplaceConfig.whatsappPhone, message);
}

export function buildWhatsAppUrlForPhone(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const normalized =
    digits.startsWith("549") && digits.length === 13
      ? digits
      : digits.startsWith("54") && digits.length === 12
        ? `549${digits.slice(2)}`
        : digits.startsWith("9") && digits.length === 11
          ? `54${digits}`
          : digits.length === 10
            ? `549${digits}`
            : `54${digits}`;

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function WhatsAppButton({ message, className }: WhatsAppButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isTouchRef = useRef(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

  const href = marketplaceConfig.whatsappPhone.trim() ? buildWhatsAppUrl(message) : undefined;

  const scheduleCollapse = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
    }
    collapseTimerRef.current = setTimeout(() => {
      setIsExpanded(false);
    }, 5000);
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    isTouchRef.current = event.pointerType === "touch";
  };

  const handleClick = (event: React.MouseEvent) => {
    // Mobile: primer tap expande, segundo tap navega.
    if (isTouchRef.current && !isExpanded) {
      event.preventDefault();
      setIsExpanded(true);
      scheduleCollapse();
    }
  };

  return (
    <a
      aria-label="Consultar por WhatsApp"
      className={[
        "group/wa flex h-14 cursor-pointer items-center overflow-hidden rounded-full",
        "bg-stone-400/70 text-white shadow-lg",
        "transition-[background-color,box-shadow] duration-300",
        "hover:bg-whatsapp hover:shadow-[0_8px_32px_-8px_rgba(37,211,102,0.55)]",
        isExpanded ? "bg-whatsapp shadow-[0_8px_32px_-8px_rgba(37,211,102,0.55)]" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      href={href}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      rel="noopener noreferrer"
      target="_blank"
    >
      {/* Icono siempre visible, tamano fijo. */}
      <span className="flex h-14 w-14 shrink-0 items-center justify-center">
        <svg
          aria-hidden="true"
          fill="currentColor"
          height="22"
          viewBox="0 0 24 24"
          width="22"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      </span>

      {/* El texto se desliza hacia la derecha en hover o expandido. */}
      <span
        className={[
          "overflow-hidden whitespace-nowrap text-sm font-semibold",
          "transition-[max-width,padding-right] duration-300",
          isExpanded
            ? "max-w-[10rem] pr-5"
            : "max-w-0 pr-0 group-hover/wa:max-w-[10rem] group-hover/wa:pr-5",
        ].join(" ")}
      >
        Consultar por WhatsApp
      </span>
    </a>
  );
}
