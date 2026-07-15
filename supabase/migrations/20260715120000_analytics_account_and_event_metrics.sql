-- Phase 1 analytics hardening: account metrics come from the operational
-- profiles table, while the event summary combines anonymous aggregates and
-- consented events without linking anonymous activity to an account.

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
    'totalBuyers', (
      select count(*) from public.profiles where role = 'buyer'
    ),
    'totalArtisans', (
      select count(*) from public.profiles where role = 'artisan'
    ),
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
        where role in ('buyer', 'artisan')
          and created_at >= period_start
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
      select round(avg(active_seconds)) from public.analytics_sessions where started_at >= period_start
    ), 0),
    'devices', coalesce((
      with device_totals as (
        select device_type as label, sum(total_count)::bigint as total
        from public.analytics_anonymous_daily
        where bucket_date >= period_date and event_name = 'visit'
        group by device_type
        union all
        select device_type as label, count(*)::bigint as total
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
        select os_family as label, count(*)::bigint as total
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
        select performance_tier as label, count(*)::bigint as total
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
        select city, region, country_code, count(*)::bigint as total
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
        select path, count(*)::bigint as total
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
        select event_name as label, count(*)::bigint as total
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
