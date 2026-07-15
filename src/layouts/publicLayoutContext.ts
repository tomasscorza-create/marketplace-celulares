import { useEffect } from "react";
import { useOutletContext } from "react-router-dom";

export type PublicLayoutOutletContext = {
  setFloatingWhatsAppMessage: (message: string | null) => void;
};

// Permite que una pagina anidada bajo PublicLayout reemplace el mensaje del
// boton flotante de WhatsApp mientras esta montada; al desmontarse vuelve al
// mensaje generico por defecto.
export function useFloatingWhatsAppMessage(message: string | null) {
  const { setFloatingWhatsAppMessage } = useOutletContext<PublicLayoutOutletContext>();

  useEffect(() => {
    setFloatingWhatsAppMessage(message);
    return () => setFloatingWhatsAppMessage(null);
  }, [message, setFloatingWhatsAppMessage]);
}
