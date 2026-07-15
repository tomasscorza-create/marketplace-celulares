create table public.guided_help_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.guided_help_faqs enable row level security;

drop policy if exists guided_help_faqs_select_active_public on public.guided_help_faqs;
create policy guided_help_faqs_select_active_public
  on public.guided_help_faqs
  for select
  to anon
  using (is_active = true);

drop policy if exists guided_help_faqs_select_active_or_admin on public.guided_help_faqs;
create policy guided_help_faqs_select_active_or_admin
  on public.guided_help_faqs
  for select
  to authenticated
  using (is_active = true or public.is_admin());

drop policy if exists guided_help_faqs_insert_admin_only on public.guided_help_faqs;
create policy guided_help_faqs_insert_admin_only
  on public.guided_help_faqs
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists guided_help_faqs_update_admin_only on public.guided_help_faqs;
create policy guided_help_faqs_update_admin_only
  on public.guided_help_faqs
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists guided_help_faqs_delete_admin_only on public.guided_help_faqs;
create policy guided_help_faqs_delete_admin_only
  on public.guided_help_faqs
  for delete
  to authenticated
  using (public.is_admin());

-- Contenido inicial: las mismas 7 preguntas que estaban hardcodeadas en el
-- boton flotante "Ayuda guiada", para que el admin las vea y pueda editarlas
-- desde el primer momento en vez de arrancar con la lista vacia.
insert into public.guided_help_faqs (question, answer, sort_order) values
  (
    '¿Cómo hago un pedido?',
    'Entrá al producto que te interesa y tocá "Pedir por WhatsApp" (o el botón verde flotante). Se abre WhatsApp con un mensaje que ya incluye el producto, el precio y las opciones elegidas, listo para enviar.',
    0
  ),
  (
    '¿Qué medios de pago aceptan?',
    'Se coordina directo con el vendedor por WhatsApp al confirmar el pedido, según lo que tenga disponible.',
    1
  ),
  (
    '¿Hacen envíos o hay que retirar?',
    'Depende del vendedor: por WhatsApp coordinás si preferís retiro o envío, y te confirma el costo y los tiempos según tu zona.',
    2
  ),
  (
    '¿Cómo sé si un producto tiene stock?',
    'En la ficha del producto figura "Unidades disponibles" o, si es a pedido, "Producción a pedido". Si el botón dice "Consultar disponibilidad", escribinos y te confirmamos al momento.',
    3
  ),
  (
    '¿Los productos tienen garantía?',
    'Depende de cada producto y vendedor. Revisá la descripción de la publicación o preguntale directamente al vendedor por WhatsApp antes de confirmar la compra.',
    4
  ),
  (
    '¿Puedo hacer un cambio o devolución?',
    'Se resuelve directo con el vendedor que te vendió el producto, coordinando por WhatsApp.',
    5
  ),
  (
    '¿Todos los productos son de la misma tienda?',
    'No, Nyzca reúne varios vendedores independientes. Cada producto muestra a qué tienda pertenece y podés visitarla para ver el resto de su catálogo.',
    6
  );
