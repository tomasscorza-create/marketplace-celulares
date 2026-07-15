-- Phase 4 analytics: sessions expire after 30 minutes without activity, can
-- be closed explicitly, and report duration using visible active time only.

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
  existing_session_id uuid;
  existing_session_ended_at timestamptz;
  existing_session_last_seen_at timestamptz;
  seconds_to_add integer := least(greatest(coalesce(requested_active_seconds, 0), 0), 60);
begin
  if requested_user_id is null or requested_event_id is null then
    raise exception 'Analytics user and event IDs are required.';
  end if;

  if normalized_event_name not in (
    'heartbeat', 'session_end', 'page_view', 'product_view', 'artisan_view',
    'search', 'filter', 'contact_click', 'signup_completed', 'favorite_add',
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

  -- Serialize lifecycle decisions for a user so a heartbeat racing with
  -- pagehide cannot create two sessions.
  perform pg_advisory_xact_lock(hashtextextended(requested_user_id::text, 0));

  if requested_session_id is not null then
    select sessions.id, sessions.ended_at, sessions.last_seen_at
    into existing_session_id, existing_session_ended_at, existing_session_last_seen_at
    from public.analytics_sessions sessions
    where sessions.id = requested_session_id
      and sessions.user_id = requested_user_id;

    if existing_session_id is not null then
      if
        existing_session_last_seen_at >= now() - interval '30 minutes'
        and (
          existing_session_ended_at is null
          or normalized_event_name in ('heartbeat', 'session_end')
        )
      then
        saved_session_id := existing_session_id;
      elsif existing_session_ended_at is null then
        update public.analytics_sessions
        set ended_at = last_seen_at
        where id = existing_session_id;
      end if;
    end if;
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
    last_seen_at = now(),
    ended_at = case
      when normalized_event_name = 'session_end' then now()
      else ended_at
    end
  where id = saved_session_id
    and user_id = requested_user_id;

  if normalized_event_name not in ('heartbeat', 'session_end') then
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

create or replace function public.get_admin_analytics_overview(requested_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_days integer := least(greatest(coalesce(requested_days, 30), 1), 365);
  period_start timestamptz;
  period_date date;
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  period_start := now() - make_interval(days => safe_days);
  period_date := current_date - (safe_days - 1);

  select jsonb_build_object(
    'periodDays', safe_days,
    'totalBuyers', (select count(*) from public.profiles where role = 'buyer'),
    'totalArtisans', (select count(*) from public.profiles where role = 'artisan'),
    'newBuyers', (
      select count(*) from public.profiles
      where role = 'buyer' and created_at >= period_start
    ),
    'newArtisans', (
      select count(*) from public.profiles
      where role = 'artisan' and created_at >= period_start
    ),
    'signupStarted', coalesce((
      select sum(total_count) from public.analytics_anonymous_daily
      where bucket_date >= period_date and event_name = 'signup_started'
    ), 0),
    'accountRegistrations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', grouped.registration_date,
        'buyers', grouped.buyers,
        'artisans', grouped.artisans,
        'total', grouped.buyers + grouped.artisans
      ) order by grouped.registration_date desc)
      from (
        select
          created_at::date as registration_date,
          count(*) filter (where role = 'buyer')::bigint as buyers,
          count(*) filter (where role = 'artisan')::bigint as artisans
        from public.profiles
        where role in ('buyer', 'artisan') and created_at >= period_start
        group by created_at::date
      ) grouped
    ), '[]'::jsonb),
    'anonymousVisits', coalesce((
      select sum(total_count) from public.analytics_anonymous_daily
      where bucket_date >= period_date and event_name = 'visit'
    ), 0),
    'anonymousPageViews', coalesce((
      select sum(total_count) from public.analytics_anonymous_daily
      where bucket_date >= period_date and event_name = 'page_view'
    ), 0),
    'consentedSessions', (
      select count(*) from public.analytics_sessions where started_at >= period_start
    ),
    'consentedUsers', (
      select count(distinct user_id) from public.analytics_sessions where started_at >= period_start
    ),
    'consentedPageViews', (
      select count(*) from public.analytics_events
      where occurred_at >= period_start and event_name = 'page_view'
    ),
    'averageActiveSeconds', coalesce((
      select round(avg(active_seconds)) from public.analytics_sessions
      where started_at >= period_start
    ), 0),
    'sessionDurationBuckets', (
      select jsonb_agg(
        jsonb_build_object('label', buckets.label, 'count', buckets.total)
        order by buckets.sort_order
      )
      from (
        select 1 as sort_order, 'under_15' as label, count(*)::bigint as total
        from public.analytics_sessions
        where started_at >= period_start and active_seconds < 15
        union all
        select 2, '15_to_59', count(*)::bigint
        from public.analytics_sessions
        where started_at >= period_start and active_seconds between 15 and 59
        union all
        select 3, '1_to_2', count(*)::bigint
        from public.analytics_sessions
        where started_at >= period_start and active_seconds between 60 and 179
        union all
        select 4, '3_to_9', count(*)::bigint
        from public.analytics_sessions
        where started_at >= period_start and active_seconds between 180 and 599
        union all
        select 5, '10_plus', count(*)::bigint
        from public.analytics_sessions
        where started_at >= period_start and active_seconds >= 600
      ) buckets
    ),
    'devices', coalesce((
      with device_totals as (
        select device_type as label, sum(total_count)::bigint as total
        from public.analytics_anonymous_daily
        where bucket_date >= period_date and event_name = 'visit'
        group by device_type
        union all
        select device_type, count(*)::bigint
        from public.analytics_sessions
        where started_at >= period_start
        group by device_type
      )
      select jsonb_agg(jsonb_build_object('label', label, 'count', total_sum) order by total_sum desc)
      from (select label, sum(total)::bigint as total_sum from device_totals group by label) grouped
    ), '[]'::jsonb),
    'operatingSystems', coalesce((
      with os_totals as (
        select os_family as label, sum(total_count)::bigint as total
        from public.analytics_anonymous_daily
        where bucket_date >= period_date and event_name = 'visit'
        group by os_family
        union all
        select os_family, count(*)::bigint
        from public.analytics_sessions
        where started_at >= period_start
        group by os_family
      )
      select jsonb_agg(jsonb_build_object('label', label, 'count', total_sum) order by total_sum desc)
      from (select label, sum(total)::bigint as total_sum from os_totals group by label) grouped
    ), '[]'::jsonb),
    'performanceTiers', coalesce((
      with tier_totals as (
        select performance_tier as label, sum(total_count)::bigint as total
        from public.analytics_anonymous_daily
        where bucket_date >= period_date and event_name = 'visit'
        group by performance_tier
        union all
        select performance_tier, count(*)::bigint
        from public.analytics_sessions
        where started_at >= period_start
        group by performance_tier
      )
      select jsonb_agg(jsonb_build_object('label', label, 'count', total_sum) order by total_sum desc)
      from (select label, sum(total)::bigint as total_sum from tier_totals group by label) grouped
    ), '[]'::jsonb),
    'locations', coalesce((
      with location_totals as (
        select city, region, country_code, sum(total_count)::bigint as total
        from public.analytics_anonymous_daily
        where bucket_date >= period_date and event_name = 'visit'
        group by city, region, country_code
        union all
        select city, region, country_code, count(*)::bigint
        from public.analytics_sessions
        where started_at >= period_start
        group by city, region, country_code
      )
      select jsonb_agg(jsonb_build_object(
        'city', city,
        'region', region,
        'countryCode', country_code,
        'count', total_sum
      ) order by total_sum desc)
      from (
        select city, region, country_code, sum(total)::bigint as total_sum
        from location_totals
        group by city, region, country_code
        order by total_sum desc
        limit 12
      ) grouped
    ), '[]'::jsonb),
    'topPages', coalesce((
      with page_totals as (
        select path, sum(total_count)::bigint as total
        from public.analytics_anonymous_daily
        where bucket_date >= period_date and event_name = 'page_view'
        group by path
        union all
        select path, count(*)::bigint
        from public.analytics_events
        where occurred_at >= period_start and event_name = 'page_view'
        group by path
      )
      select jsonb_agg(jsonb_build_object('path', path, 'count', total_sum) order by total_sum desc)
      from (
        select path, sum(total)::bigint as total_sum
        from page_totals
        group by path
        order by total_sum desc
        limit 12
      ) grouped
    ), '[]'::jsonb),
    'topEvents', coalesce((
      with event_totals as (
        select event_name as label, sum(total_count)::bigint as total
        from public.analytics_anonymous_daily
        where bucket_date >= period_date
        group by event_name
        union all
        select event_name, count(*)::bigint
        from public.analytics_events
        where occurred_at >= period_start
        group by event_name
      )
      select jsonb_agg(jsonb_build_object('label', label, 'count', total_sum) order by total_sum desc)
      from (
        select label, sum(total)::bigint as total_sum
        from event_totals
        group by label
        order by total_sum desc
        limit 16
      ) grouped
    ), '[]'::jsonb),
    'recentUsers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'userId', grouped.user_id,
        'fullName', grouped.full_name,
        'email', grouped.email,
        'role', grouped.role,
        'sessions', grouped.sessions,
        'events', grouped.events,
        'lastSeenAt', grouped.last_seen_at
      ) order by grouped.last_seen_at desc)
      from (
        select
          profiles.id as user_id,
          profiles.full_name,
          profiles.email,
          profiles.role,
          count(distinct sessions.id)::bigint as sessions,
          count(events.id)::bigint as events,
          max(sessions.last_seen_at) as last_seen_at
        from public.analytics_sessions sessions
        join public.profiles profiles on profiles.id = sessions.user_id
        left join public.analytics_events events on events.session_id = sessions.id
        where sessions.started_at >= period_start
        group by profiles.id, profiles.full_name, profiles.email, profiles.role
        order by last_seen_at desc
        limit 20
      ) grouped
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_admin_analytics_overview(integer) from public;
grant execute on function public.get_admin_analytics_overview(integer) to authenticated;
