/**
 * Helper para extraer un mensaje legible de cualquier valor `unknown`
 * (típicamente un `error` capturado en `try/catch` o devuelto por una promesa).
 *
 * Reemplaza el patrón repetido en ~9 sitios del codebase:
 *   `error instanceof Error ? error.message : "fallback"`
 *
 * Y consolida las dos implementaciones locales:
 *   - `src/features/public/publicQueries.ts`
 *   - `src/features/buyer/cartQueries.ts`
 *
 * NO migrar usos masivamente — incorporar gradualmente desde código nuevo.
 *
 * @example
 *   try {
 *     await algo();
 *   } catch (error) {
 *     setErrorMessage(getErrorMessage(error, "No pudimos completar la operación."));
 *   }
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  // Errores de Supabase / PostgREST suelen ser objetos planos con `.message`.
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string" &&
    (error as { message: string }).message.length > 0
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}
