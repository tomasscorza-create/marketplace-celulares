import { useState } from "react";

import { marketplaceConfig } from "../config/marketplace";
import { formatCurrency } from "../lib/format";
import { WhatsAppContactMenu, WhatsAppIcon } from "./WhatsAppButton";

type WhatsAppProductButtonProps = {
  product: { id: string; title: string; price: number };
  variant?: "full" | "compact";
  className?: string;
  selectedOptionsSummary?: string | null;
  label?: string;
};

export function WhatsAppProductButton({
  product,
  variant = "full",
  className = "",
  selectedOptionsSummary,
  label,
}: WhatsAppProductButtonProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const url = `${window.location.origin}/producto/${product.id}`;
  const price = formatCurrency(product.price);
  const optionsText = selectedOptionsSummary ? `\nOpciones: ${selectedOptionsSummary}` : "";
  const message = `Hola! Quiero pedir: ${product.title} (${price})${optionsText} — ${url}`;

  const baseClasses = variant === "full"
    ? "group/wa flex h-14 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full !bg-whatsapp !text-white shadow-elev-whatsapp transition-[background-color,box-shadow,transform] duration-300 hover:!bg-[#1ebe5d] hover:shadow-elev-whatsapp hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-whatsapp/35 font-semibold"
    : "group/wa flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-full !bg-whatsapp !text-white shadow-elev-whatsapp transition-[background-color,box-shadow,transform] duration-300 hover:!bg-[#1ebe5d] hover:shadow-elev-whatsapp hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-whatsapp/35 text-sm font-semibold";

  return (
    <div className={["relative", className].filter(Boolean).join(" ")}>
      <button
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        className={`${baseClasses} ${className}`.trim()}
        onClick={() => setIsMenuOpen((open) => !open)}
        type="button"
      >
        <WhatsAppIcon size={variant === "full" ? 24 : 18} />
        <span>{label ?? "Pedir por WhatsApp"}</span>
      </button>

      <WhatsAppContactMenu
        className="right-0 top-full mt-2 origin-top"
        contacts={marketplaceConfig.whatsappContacts}
        fullWidth
        isOpen={isMenuOpen}
        message={message}
        onOpenChange={setIsMenuOpen}
        size={variant === "full" ? "lg" : "md"}
      />
    </div>
  );
}
