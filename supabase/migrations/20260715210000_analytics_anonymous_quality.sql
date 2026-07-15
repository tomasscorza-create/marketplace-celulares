-- Phase 5 analytics: shared abuse controls and anomaly exclusion without
-- storing an IP address or creating an anonymous visitor identity.

create table if not exists public.analytics_rate_limits (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists analytics_rate_limits_expires_idx
  on public.analytics_rate_limits (expires_at);

create table if not exists public.analytics_anonymous_quality_hourly (
  bucket_hour timestamptz not null,
  event_name text not null check (event_name in (
    'visit', 'page_view', 'product_view', 'artisan_view', 'search',
    'filter', 'contact_click', 'signup_started'
  )),
  path text not null check (char_length(path) <= 240),
  total_count bigint not null default 0 check (total_count >= 0),
  excluded_count bigint not null default 0 check (
    excluded_count >= 0 and excluded_count <= total_count
  ),
  updated_at timestamptz not null default now(),
  primary key (bucket_hour, event_name, path)
);

create index if not exists analytics_anonymous_quality_hour_idx
  on public.analytics_anonymous_quality_hourly (bucket_hour desc);

alter table public.analytics_rate_limits enable row level security;
alter table public.analytics_anonymous_quality_hourly enable row level security;

revoke all on table public.analytics_rate_limits from public, anon, authenticated;
revoke all on table public.analytics_anonymous_quality_hourly from public, anon, authenticated;

create or replace function public.claim_analytics_rate_limit(
  requested_key_hash text,
  requested_limit integer default 90,
  requested_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_hash text := lower(trim(coalesce(requested_key_hash, '')));
  safe_limit integer := least(greatest(coalesce(requested_limit, 90), 1), 1000);
  safe_window_seconds integer := least(
    greatest(coalesce(requested_window_seconds, 60), 10),
    3600
  );
  saved_count integer;
begin
  if normalized_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'A valid temporary analytics key hash is required.';
  end if;

  insert into public.analytics_rate_limits (
    key_hash,
    window_started_at,
    request_count,
    expires_at,
    updated_at
  )
  values (
    normalized_hash,
    now(),
    1,
    now() + make_interval(secs => safe_window_seconds * 2),
    now()
  )
  on conflict (key_hash) do update
  set
    request_count = case
      when public.analytics_rate_limits.window_started_at
        <= now() - make_interval(secs => safe_window_seconds)
      then 1
      else public.analytics_rate_limits.request_count + 1
    end,
    window_started_at = case
      when public.analytics_rate_limits.window_started_at
        <= now() - make_interval(secs => safe_window_seconds)
      then now()
      else public.analytics_rate_limits.window_started_at
    end,
    expires_at = now() + make_interval(secs => safe_window_seconds * 2),
    updated_at = now()
  returning request_count into saved_count;

  return saved_count <= safe_limit;
end;
$$;

revoke all on function public.claim_analytics_rate_limit(text, integer, integer) from public;
grant execute on function public.claim_analytics_rate_limit(text, integer, integer) to service_role;

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
  hourly_limit integer;
  included_in_report boolean;
  normalized_event_name text := lower(trim(coalesce(requested_event_name, '')));
  normalized_path text := left(coalesce(nullif(trim(requested_path), ''), '/'), 240);
  saved_total bigint;
begin
  if requested_event_id is null then
    raise exception 'Analytics event ID is required.';
  end if;

  if normalized_event_name not in (
    'visit', 'page_view', 'product_view', 'artisan_view', 'search',
    'filter', 'contact_click', 'signup_started'
  ) then
    raise exception 'Unsupported anonymous analytics event.';
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

  hourly_limit := case normalized_event_name
    when 'visit' then 2000
    when 'page_view' then 10000
    else 5000
  end;

  insert into public.analytics_anonymous_quality_hourly (
    bucket_hour,
    event_name,
    path,
    total_count,
    excluded_count,
    updated_at
  )
  values (date_trunc('hour', now()), normalized_event_name, normalized_path, 1, 0, now())
  on conflict (bucket_hour, event_name, path) do update
  set
    total_count = public.analytics_anonymous_quality_hourly.total_count + 1,
    excluded_count = greatest(
      public.analytics_anonymous_quality_hourly.total_count + 1 - hourly_limit,
      0
    ),
    updated_at = now()
  returning total_count into saved_total;

  included_in_report := saved_total <= hourly_limit;
  if included_in_report then
    perform public.record_anonymous_analytics(
      normalized_event_name,
      normalized_path,
      requested_device_type,
      requested_os_family,
      requested_performance_tier,
      requested_country_code,
      requested_region,
      requested_city,
      requested_referrer_domain
    );
  end if;

  return included_in_report;
end;
$$;

revoke all on function public.record_anonymous_analytics_v2(
  uuid, text, text, text, text, text, text, text, text, text
) from public;
grant execute on function public.record_anonymous_analytics_v2(
  uuid, text, text, text, text, text, text, text, text, text
) to service_role;

create or replace function public.get_admin_analytics_quality(requested_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_days integer := least(greatest(coalesce(requested_days, 30), 1), 365);
  period_start timestamptz := date_trunc(
    'hour',
    now() - make_interval(days => least(greatest(coalesce(requested_days, 30), 1), 365))
  );
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  return jsonb_build_object(
    'periodDays', safe_days,
    'excludedEvents', coalesce((
      select sum(excluded_count)
      from public.analytics_anonymous_quality_hourly
      where bucket_hour >= period_start
    ), 0),
    'flaggedBuckets', (
      select count(*)
      from public.analytics_anonymous_quality_hourly
      where bucket_hour >= period_start and excluded_count > 0
    ),
    'isApproximate', true,
    'sharedRateLimit', true,
    'routeValidation', true
  );
end;
$$;

revoke all on function public.get_admin_analytics_quality(integer) from public;
grant execute on function public.get_admin_analytics_quality(integer) to authenticated;
