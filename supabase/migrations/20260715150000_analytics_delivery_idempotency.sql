-- Phase 3 analytics hardening: retry-safe delivery without creating a
-- persistent anonymous visitor identity.

alter table public.analytics_events
  add column if not exists event_id uuid not null default gen_random_uuid();

create unique index if not exists analytics_events_event_id_uidx
  on public.analytics_events (event_id);

create table if not exists public.analytics_delivery_receipts (
  event_id uuid primary key,
  mode text not null check (mode in ('anonymous', 'consented')),
  user_id uuid references public.profiles (id) on delete cascade,
  session_id uuid references public.analytics_sessions (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '48 hours'),
  constraint analytics_delivery_receipts_identity_check check (
    (mode = 'anonymous' and user_id is null and session_id is null)
    or (mode = 'consented' and user_id is not null)
  )
);

create index if not exists analytics_delivery_receipts_expires_idx
  on public.analytics_delivery_receipts (expires_at);

alter table public.analytics_delivery_receipts enable row level security;

revoke all on table public.analytics_delivery_receipts from public;
revoke all on table public.analytics_delivery_receipts from anon;
revoke all on table public.analytics_delivery_receipts from authenticated;

create or replace function public.record_anonymous_analytics_v2(
  requested_event_id uuid,
  requested_event_name text,
  requested_path text,
  requested_device_type text,
  requested_os_family text,
  requested_performance_tier text,
  requested_country_code text,
  requested_region text,
  requested_city text,
  requested_referrer_domain text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_event_id uuid;
begin
  if requested_event_id is null then
    raise exception 'Analytics event ID is required.';
  end if;

  delete from public.analytics_delivery_receipts where expires_at <= now();

  insert into public.analytics_delivery_receipts (event_id, mode)
  values (requested_event_id, 'anonymous')
  on conflict (event_id) do nothing
  returning event_id into claimed_event_id;

  if claimed_event_id is null then
    if exists (
      select 1
      from public.analytics_delivery_receipts receipts
      where receipts.event_id = requested_event_id
        and receipts.mode = 'anonymous'
        and receipts.user_id is null
    ) then
      return false;
    end if;

    raise exception 'Analytics event ID belongs to another delivery.';
  end if;

  perform public.record_anonymous_analytics(
    requested_event_name,
    requested_path,
    requested_device_type,
    requested_os_family,
    requested_performance_tier,
    requested_country_code,
    requested_region,
    requested_city,
    requested_referrer_domain
  );

  return true;
end;
$$;

revoke all on function public.record_anonymous_analytics_v2(
  uuid, text, text, text, text, text, text, text, text, text
) from public;
grant execute on function public.record_anonymous_analytics_v2(
  uuid, text, text, text, text, text, text, text, text, text
) to service_role;

create or replace function public.record_consented_analytics_v2(
  requested_user_id uuid,
  requested_event_id uuid,
  requested_session_id uuid,
  requested_event_name text,
  requested_path text,
  requested_entity_type text,
  requested_entity_id uuid,
  requested_active_seconds integer,
  requested_browser_family text,
  requested_classification_confidence text,
  requested_classifier_version text,
  requested_connection_type text,
  requested_device_type text,
  requested_os_family text,
  requested_performance_tier text,
  requested_referrer_domain text,
  requested_screen_size text,
  requested_city text,
  requested_country_code text,
  requested_region text,
  requested_timezone text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_event_id uuid;
  normalized_event_name text := lower(trim(coalesce(requested_event_name, '')));
  saved_session_id uuid;
  seconds_to_add integer := least(greatest(coalesce(requested_active_seconds, 0), 0), 60);
begin
  if requested_user_id is null or requested_event_id is null then
    raise exception 'Analytics user and event IDs are required.';
  end if;

  if normalized_event_name not in (
    'heartbeat', 'page_view', 'product_view', 'artisan_view', 'search',
    'filter', 'contact_click', 'signup_completed', 'favorite_add',
    'cart_add', 'checkout_start', 'purchase_completed'
  ) then
    raise exception 'Unsupported consented analytics event.';
  end if;

  delete from public.analytics_delivery_receipts where expires_at <= now();

  insert into public.analytics_delivery_receipts (event_id, mode, user_id)
  values (requested_event_id, 'consented', requested_user_id)
  on conflict (event_id) do nothing
  returning event_id into claimed_event_id;

  if claimed_event_id is null then
    select receipts.session_id
    into saved_session_id
    from public.analytics_delivery_receipts receipts
    where receipts.event_id = requested_event_id
      and receipts.mode = 'consented'
      and receipts.user_id = requested_user_id;

    if not found then
      raise exception 'Analytics event ID belongs to another delivery.';
    end if;

    return saved_session_id;
  end if;

  if requested_session_id is not null then
    select sessions.id
    into saved_session_id
    from public.analytics_sessions sessions
    where sessions.id = requested_session_id
      and sessions.user_id = requested_user_id;
  end if;

  if saved_session_id is null then
    insert into public.analytics_sessions (
      user_id,
      landing_path,
      referrer_domain,
      device_type,
      os_family,
      performance_tier,
      classification_confidence,
      browser_family,
      connection_type,
      screen_size,
      country_code,
      region,
      city,
      timezone,
      classifier_version
    )
    values (
      requested_user_id,
      left(coalesce(nullif(trim(requested_path), ''), '/'), 240),
      left(coalesce(nullif(trim(requested_referrer_domain), ''), 'direct'), 120),
      requested_device_type,
      requested_os_family,
      requested_performance_tier,
      requested_classification_confidence,
      requested_browser_family,
      requested_connection_type,
      requested_screen_size,
      left(coalesce(nullif(trim(requested_country_code), ''), 'unknown'), 8),
      left(coalesce(nullif(trim(requested_region), ''), 'unknown'), 100),
      left(coalesce(nullif(trim(requested_city), ''), 'unknown'), 100),
      left(coalesce(nullif(trim(requested_timezone), ''), 'unknown'), 80),
      left(coalesce(nullif(trim(requested_classifier_version), ''), 'unknown'), 30)
    )
    returning id into saved_session_id;
  end if;

  update public.analytics_sessions
  set
    active_seconds = least(active_seconds + seconds_to_add, 31536000),
    last_seen_at = now()
  where id = saved_session_id
    and user_id = requested_user_id;

  if normalized_event_name <> 'heartbeat' then
    insert into public.analytics_events (
      event_id,
      session_id,
      user_id,
      event_name,
      path,
      entity_type,
      entity_id
    )
    values (
      requested_event_id,
      saved_session_id,
      requested_user_id,
      normalized_event_name,
      left(coalesce(nullif(trim(requested_path), ''), '/'), 240),
      nullif(trim(coalesce(requested_entity_type, '')), ''),
      requested_entity_id
    );
  end if;

  update public.analytics_delivery_receipts
  set session_id = saved_session_id
  where event_id = requested_event_id;

  return saved_session_id;
end;
$$;

revoke all on function public.record_consented_analytics_v2(
  uuid, uuid, uuid, text, text, text, uuid, integer, text, text, text,
  text, text, text, text, text, text, text, text, text, text
) from public;
grant execute on function public.record_consented_analytics_v2(
  uuid, uuid, uuid, text, text, text, uuid, integer, text, text, text,
  text, text, text, text, text, text, text, text, text, text
) to service_role;

create or replace function public.cleanup_internal_analytics()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.analytics_delivery_receipts where expires_at <= now();
  delete from public.analytics_events where occurred_at < now() - interval '365 days';
  delete from public.analytics_sessions where started_at < now() - interval '365 days';
  delete from public.analytics_anonymous_daily where bucket_date < current_date - 730;
end;
$$;

revoke all on function public.cleanup_internal_analytics() from public;
grant execute on function public.cleanup_internal_analytics() to service_role;
