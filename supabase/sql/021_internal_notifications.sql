create table if not exists public.internal_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 140),
  body text not null check (char_length(trim(body)) between 3 and 6000),
  is_active boolean not null default true,
  published_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.internal_notification_signatures (
  notification_id uuid not null references public.internal_notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  signer_name text not null default '',
  signer_email text not null default '',
  signed_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

insert into public.internal_notifications (
  id,
  title,
  body,
  is_active,
  published_at,
  created_by
)
values (
  '00000000-0000-4000-8000-000000000001',
  'Informacion importante del catalogo',
  $notification$
Como funciona el catalogo de Mercado Base

Este catalogo reune en un solo lugar productos de tiendas y vendedores independientes. Cualquier persona puede entrar, explorar y comprar desde el marketplace.

Todos los productos tienen su oportunidad.

El catalogo no muestra siempre lo mismo. Funciona de manera rotatoria: los productos van cambiando de lugar para que distintas tiendas tengan visibilidad. Ademas, lo que ve un comprador puede adaptarse a su actividad para mostrar productos mas relevantes.

Como esta organizado

1. Seccion personalizada
Es la primera que aparece al ingresar. Aca puede influir el historial de cada comprador: el sistema muestra productos relacionados con lo que esa persona ya vio o busco antes.

2. Seccion de exploracion
Es la mas grande y variada del catalogo. Aca se muestra diversidad de productos de distintas tiendas. Incluye grillas destacadas que rotan para repartir mejor la visibilidad.

3. Seccion de perfiles de vendedores
Al final del catalogo aparecen perfiles de tiendas y vendedores. Esta seccion tambien rota para ayudar a que los compradores descubran nuevas propuestas.

En resumen: el catalogo trabaja para que mas productos sean vistos, lleguen a personas interesadas y mantengan una experiencia de exploracion dinamica.
$notification$,
  true,
  '2026-01-01 00:00:00+00',
  null
)
on conflict (id) do update set
  title = excluded.title,
  body = excluded.body,
  is_active = true,
  updated_at = now();

alter table public.internal_notifications enable row level security;
alter table public.internal_notification_signatures enable row level security;

create index if not exists internal_notifications_active_published_idx
  on public.internal_notifications (is_active, published_at desc);

create index if not exists internal_notification_signatures_user_idx
  on public.internal_notification_signatures (user_id, signed_at desc);

drop policy if exists internal_notifications_admin_all on public.internal_notifications;
create policy internal_notifications_admin_all
  on public.internal_notifications
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists internal_notifications_artisan_read_active on public.internal_notifications;
create policy internal_notifications_artisan_read_active
  on public.internal_notifications
  for select
  to authenticated
  using (
    is_active = true
    and public.current_user_role() = 'artisan'
  );

drop policy if exists internal_notification_signatures_admin_read on public.internal_notification_signatures;
create policy internal_notification_signatures_admin_read
  on public.internal_notification_signatures
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists internal_notification_signatures_artisan_read_own on public.internal_notification_signatures;
create policy internal_notification_signatures_artisan_read_own
  on public.internal_notification_signatures
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists internal_notification_signatures_artisan_insert_own on public.internal_notification_signatures;
create policy internal_notification_signatures_artisan_insert_own
  on public.internal_notification_signatures
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.current_user_role() = 'artisan'
    and exists (
      select 1
      from public.internal_notifications notification
      where notification.id = public.internal_notification_signatures.notification_id
        and notification.is_active = true
    )
  );

drop policy if exists internal_notification_signatures_artisan_update_own on public.internal_notification_signatures;
create policy internal_notification_signatures_artisan_update_own
  on public.internal_notification_signatures
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.current_user_role() = 'artisan'
    and exists (
      select 1
      from public.internal_notifications notification
      where notification.id = public.internal_notification_signatures.notification_id
        and notification.is_active = true
    )
  );
