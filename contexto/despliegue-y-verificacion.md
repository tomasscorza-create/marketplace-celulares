# Despliegue y verificación

## Propósito

Explicar cómo se construye el empaquetado de producción del frontend, qué herramientas se usan y cuáles son los límites entre el deploy de la interfaz y los despliegues de backend.

## Fuentes de verdad

- `netlify.toml`: Configuración de *build* para el proveedor de despliegue (Netlify).
- `package.json`: Scripts de npm, específicamente `build`, `preflight` y los comandos `audit:*`.
- `AGENTS.md`: Define explícitamente que el despliegue del frontend no despliega backend ni migraciones de forma automática.

## Flujo o arquitectura

1. **Frontend Build**: Localmente o en la nube, se ejecuta `npm run build` (que invoca `tsc -b` y `vite build`). Esto genera recursos estáticos minificados en la carpeta `dist/`.
2. **Netlify**: El archivo `netlify.toml` le indica a la plataforma que el comando base es `npm run build`, que la versión de Node es la 20 y que debe publicar el contenido del directorio `dist`.
3. **Backend Independiente**: Las migraciones de Supabase (`supabase/migrations/`) y las Edge Functions (`supabase/functions/`) no tienen relación automática con el pipeline de Netlify. Deben aplicarse a través del CLI de Supabase independientemente, contra el proyecto en producción.

## Reglas y decisiones vigentes

- **Variables de Producción**: En producción, las variables seguras (como `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`) se configuran directamente en el panel web de Netlify. Nunca se versionan en el repositorio ni se empujan `.env` globales de producción.
- **Preflight local**: Antes de cualquier publicación o commit grande estructural, se exige correr `npm run preflight` (que agrupa lint, tipos, pruebas automatizadas, auditorías de seguridad y el límite bloqueante de tamaño de módulos).
- **Desacople estricto**: Si se publica un cambio en Netlify que requiere una nueva vista o función SQL, la migración de Supabase debe haberse corrido y validado *antes* en el proyecto remoto.

## Dependencias y límites externos

- **Vite & TypeScript**: Para el build y la comprobación estática.
- **Netlify**: Entorno de alojamiento elegido.
- **Supabase CLI**: Única herramienta válida para los despliegues del lado servidor.

## Validación

- Comandos: `npm test`, `npm run audit:large-files`, `npm run preflight` y `npm run build` aseguran que la app pase las pruebas y estándares de calidad locales antes de considerar subirla.
- Manual: Revisar la consola del navegador y la pestaña Network tras un deploy en staging para confirmar que las variables de entorno se inyectaron correctamente en el bundle de Vite.

## Riesgos y errores frecuentes

- Creer que al pushear código a la rama principal, el *trigger* de Netlify también actualizó las funciones Edge o aplicó las nuevas tablas. Esto causa fallos de red en el cliente que intenta leer cosas que no existen.
- Agregar dependencias problemáticas que fallen en la compilación estricta de TypeScript (`tsc -b`). Vite build falla si el typcheck es forzado antes.

## Mantenimiento

Se debe modificar si el proyecto migra a otro proveedor (ej. Vercel), cambia a un framework SSR (Server-Side Rendering) que exija variables privadas en despliegue, o si se integra automatización CI/CD con GitHub Actions para el backend.
