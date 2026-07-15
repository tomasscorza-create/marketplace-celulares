import { useEffect, useRef, useState } from "react";
import { marketplaceConfig } from "../config/marketplace";

type WhatsAppButtonProps = {
  message: string;
  className?: string;
};

export type WhatsAppContact = {
  name: string;
  phone: string;
};

type WhatsAppContactMenuProps = {
  contacts: readonly WhatsAppContact[];
  message: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Altura de cada opcion; "lg" iguala al boton flotante y al CTA completo, "md" al compacto. */
  size?: "lg" | "md";
  /** Iguala el ancho del boton que abrio el menu (los CTA de producto son w-full). */
  fullWidth?: boolean;
  className?: string;
};

// Menu pequeño para elegir a que contacto de WhatsApp escribirle. Se usa
// tanto en el flotante generico como en el boton de pedido de producto.
export function WhatsAppContactMenu({
  contacts,
  message,
  isOpen,
  onOpenChange,
  size = "lg",
  fullWidth = false,
  className,
}: WhatsAppContactMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onOpenChange]);

  if (!isOpen || contacts.length === 0) {
    return null;
  }

  const itemHeightClass = size === "lg" ? "h-14" : "h-11";
  const itemTextClass = size === "lg" ? "text-[15px]" : "text-sm";
  const itemIconSize = size === "lg" ? 20 : 16;

  return (
    <div
      className={[
        "absolute z-50 flex flex-col gap-1.5 rounded-3xl border border-white/15 p-2",
        "bg-gradient-to-br from-[#2be370] via-whatsapp to-[#0f9b48]",
        "shadow-elev-3 ring-1 ring-black/5",
        "animate-wa-menu-pop",
        fullWidth ? "w-full" : "w-max min-w-[14rem]",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      ref={menuRef}
      role="menu"
    >
      {contacts.map((contact, index) => (
        <a
          className={[
            "group/waitem flex items-center gap-3 rounded-2xl bg-white/10 px-4 font-bold text-white",
            "transition-all duration-200 hover:bg-white/25 hover:shadow-elev-1 active:scale-[0.97]",
            "animate-fade-in-up motion-reduce:animate-none",
            itemHeightClass,
            itemTextClass,
          ].join(" ")}
          href={buildWhatsAppUrlForPhone(contact.phone, message)}
          key={contact.phone}
          onClick={() => onOpenChange(false)}
          rel="noopener noreferrer"
          role="menuitem"
          style={{ animationDelay: `${index * 70}ms` }}
          target="_blank"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 transition-transform duration-200 group-hover/waitem:scale-110">
            <WhatsAppIcon size={itemIconSize} />
          </span>
          {contact.name}
        </a>
      ))}
    </div>
  );
}

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

export function WhatsAppIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export function WhatsAppButton({ message, className }: WhatsAppButtonProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const contacts = marketplaceConfig.whatsappContacts.filter((contact) => contact.phone.trim());

  if (contacts.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        aria-label="Consultar por WhatsApp"
        className={[
          "group/wa flex h-12 cursor-pointer items-center overflow-hidden rounded-full sm:h-14",
          "bg-stone-800 text-white shadow-elev-2",
          "transition-[background-color,box-shadow] duration-300",
          "hover:bg-whatsapp hover:shadow-elev-whatsapp",
          isMenuOpen ? "bg-whatsapp shadow-elev-whatsapp" : "",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => setIsMenuOpen((open) => !open)}
        type="button"
      >
        {/* Icono siempre visible, tamano fijo (cuadrado, igual al alto del boton para mantener el circulo). */}
        <span className="flex h-12 w-12 shrink-0 items-center justify-center sm:h-14 sm:w-14">
          <WhatsAppIcon size={22} />
        </span>

        {/* El texto se desliza hacia la derecha en hover o con el menu abierto. El margen negativo solo se aplica expandido, para no romper el circulo cuando esta colapsado. */}
        <span
          className={[
            "overflow-hidden whitespace-nowrap text-sm font-semibold",
            "transition-[max-width,padding-right,margin-left] duration-300",
            isMenuOpen
              ? "-ml-2 max-w-[12rem] pr-4"
              : "ml-0 max-w-0 pr-0 group-hover/wa:-ml-2 group-hover/wa:max-w-[12rem] group-hover/wa:pr-4",
          ].join(" ")}
        >
          Consultar por WhatsApp
        </span>
      </button>

      <WhatsAppContactMenu
        className="bottom-full right-0 mb-3 origin-bottom-right"
        contacts={contacts}
        isOpen={isMenuOpen}
        message={message}
        onOpenChange={setIsMenuOpen}
        size="lg"
      />
    </div>
  );
}
