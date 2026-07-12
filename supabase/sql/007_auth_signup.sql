-- Fresh installs:
-- run this after 006_policies.sql
--
-- Existing projects:
-- run this if your database was created before buyer/artisan signup
-- was handled automatically from auth.users metadata.

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('admin', 'artisan', 'buyer'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_role text := 'buyer';
  requested_role text := coalesce(new.raw_user_meta_data ->> 'requested_role', '');
  artisan_access_key text := coalesce(new.raw_user_meta_data ->> 'artisan_access_key', '');
begin
  if requested_role = 'artisan' then
    if artisan_access_key <> 'Admindeventa' then
      raise exception 'La clave de alta para vendedores no es valida.';
    end if;

    next_role := 'artisan';
  end if;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    next_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
