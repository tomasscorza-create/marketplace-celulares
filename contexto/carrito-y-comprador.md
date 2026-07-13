# Carrito y Comprador

## Propósito
Documentar la experiencia del usuario final, su carrito de compras y el ciclo de vida de los pedidos desde la perspectiva del cliente (comprador).

## Fuentes de verdad
- `src/features/buyer/`: Gestión de la sesión de carrito, métodos de cobro, e interfaz de la cuenta del comprador.
- `src/features/orders/`: Estructuras de datos y componentes compartidos de tracking de órdenes.
- `src/pages/Buyer*Page.tsx`: Páginas del panel de usuario (`BuyerCartPage`, `BuyerDashboardPage`, `BuyerOrderDetailPage`).

## Flujo o arquitectura
1. **Carrito activo**: Se maneja con persistencia remota en la tabla `carts` (relacionada al comprador) y `cart_items` (ítems seleccionados). El frontend sincroniza su estado local con la base de datos en tiempo real.
2. **Historial de pedidos**: Al completarse un pago, la orden temporal (tabla `orders`) pasa a un estado pagado visible para el comprador, donde puede revisar avance de envíos, totales y los detalles desglosados (`order_items`).
3. **Perfil y preferencias**: El comprador tiene un perfil (`buyer_preferences`, `buyer_favorites`) donde se guardan listas de deseos e historial de interacciones.

## Reglas y decisiones vigentes
- **Carrito persistente y seguro**: El carrito no se guarda exclusivamente en `localStorage`, sino que reside en la base de datos. Esto habilita el uso multi-dispositivo y asegura que el servidor valide el stock remanente justo antes del checkout.
- **Protección de privacidad (RLS)**: Un comprador solo puede seleccionar (`SELECT`) de la tabla `orders` y `order_items` aquellas filas exactas donde él es dueño (`buyer_id = auth.uid()`).

## Dependencias y límites externos
- Depende 100% de Edge Functions (documentadas en `checkout-y-pagos.md`) para procesar e inmovilizar la mercadería del carrito durante el inicio de pago.

## Validación
- Manual: Agregar items al carrito en incógnito, iniciar sesión, asegurar el merge o persistencia del carrito. Verificar que la orden se genera correctamente al comprar.

## Riesgos y errores frecuentes
- Asumir que los montos totales de los items del carrito calculados en la interfaz de React (cliente) son la fuente final de verdad. Los montos para cobro siempre se re-evalúan en backend por seguridad (anti Client-side tampering).

## Mantenimiento
Actualizar si cambia el motor o arquitectura de carritos (ej. pasar de persistencia remota a carritos 100% en sesión efímera) o si se agregan cupones de descuento globales.
