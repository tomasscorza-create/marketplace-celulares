begin;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  phone_change,
  phone_change_token,
  email_change_token_current,
  reauthentication_token,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'admin@demo.local',
    extensions.crypt('Demo123456!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin Demo"}'::jsonb,
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000101',
    'authenticated',
    'authenticated',
    'tienda.norte@demo.local',
    extensions.crypt('Demo123456!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Tienda Norte","requested_role":"artisan","artisan_access_key":"Admindeventa"}'::jsonb,
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000102',
    'authenticated',
    'authenticated',
    'estudio.sur@demo.local',
    extensions.crypt('Demo123456!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Estudio Sur","requested_role":"artisan","artisan_access_key":"Admindeventa"}'::jsonb,
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000103',
    'authenticated',
    'authenticated',
    'casa.luna@demo.local',
    extensions.crypt('Demo123456!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Casa Luna","requested_role":"artisan","artisan_access_key":"Admindeventa"}'::jsonb,
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000201',
    'authenticated',
    'authenticated',
    'comprador@demo.local',
    extensions.crypt('Demo123456!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Comprador Demo"}'::jsonb,
    false,
    now(),
    now()
  )
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  confirmation_token = excluded.confirmation_token,
  recovery_token = excluded.recovery_token,
  email_change_token_new = excluded.email_change_token_new,
  email_change = excluded.email_change,
  phone_change = excluded.phone_change,
  phone_change_token = excluded.phone_change_token,
  email_change_token_current = excluded.email_change_token_current,
  reauthentication_token = excluded.reauthentication_token,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  auth_user.id,
  auth_user.id::text,
  auth_user.id,
  jsonb_build_object(
    'sub', auth_user.id::text,
    'email', auth_user.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now(),
  now()
from auth.users auth_user
where auth_user.email in (
  'admin@demo.local',
  'tienda.norte@demo.local',
  'estudio.sur@demo.local',
  'casa.luna@demo.local',
  'comprador@demo.local'
)
on conflict (provider, provider_id) do update set
  identity_data = excluded.identity_data,
  updated_at = now();

insert into public.profiles (
  id,
  full_name,
  email,
  role,
  store_name,
  store_description,
  profile_image_url,
  storefront_theme_color,
  whatsapp_phone,
  storefront_boost_multiplier,
  storefront_boosted_at,
  storefront_hidden_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Admin Demo',
    'admin@demo.local',
    'admin',
    null,
    null,
    null,
    null,
    null,
    1.00,
    null,
    null
  ),
  (
    '10000000-0000-4000-8000-000000000101',
    'Tienda Norte',
    'tienda.norte@demo.local',
    'artisan',
    'Tienda Norte',
    'Objetos para casa, regalos y uso diario con una estetica simple y calida.',
    '/pwa-512.png',
    '#7c3aed',
    '+5491100000101',
    1.18,
    now(),
    null
  ),
  (
    '10000000-0000-4000-8000-000000000102',
    'Estudio Sur',
    'estudio.sur@demo.local',
    'artisan',
    'Estudio Sur',
    'Productos textiles, accesorios y piezas livianas para combinar todos los dias.',
    '/pwa-512.png',
    '#0891b2',
    '+5491100000102',
    1.00,
    null,
    null
  ),
  (
    '10000000-0000-4000-8000-000000000103',
    'Casa Luna',
    'casa.luna@demo.local',
    'artisan',
    'Casa Luna',
    'Decoracion, aromas y detalles para espacios tranquilos.',
    '/pwa-512.png',
    '#16a34a',
    '+5491100000103',
    1.00,
    null,
    null
  ),
  (
    '10000000-0000-4000-8000-000000000201',
    'Comprador Demo',
    'comprador@demo.local',
    'buyer',
    null,
    'Perfil demo para probar favoritos, carrito y compras locales.',
    '/pwa-512.png',
    null,
    '+5491100000201',
    1.00,
    null,
    null
  )
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  role = excluded.role,
  store_name = excluded.store_name,
  store_description = excluded.store_description,
  profile_image_url = excluded.profile_image_url,
  storefront_theme_color = excluded.storefront_theme_color,
  whatsapp_phone = excluded.whatsapp_phone,
  storefront_boost_multiplier = excluded.storefront_boost_multiplier,
  storefront_boosted_at = excluded.storefront_boosted_at,
  storefront_hidden_at = excluded.storefront_hidden_at;

insert into public.categories (id, name, slug, is_active)
values
  ('20000000-0000-4000-8000-000000000001', 'Celulares', 'celulares', true),
  ('20000000-0000-4000-8000-000000000002', 'Fundas', 'fundas', true),
  ('20000000-0000-4000-8000-000000000003', 'Cargadores', 'cargadores', true),
  ('20000000-0000-4000-8000-000000000004', 'Audio', 'audio', true)
on conflict (slug) do update set
  name = excluded.name,
  is_active = excluded.is_active;

insert into public.products (
  id,
  artisan_id,
  category_id,
  title,
  description,
  price,
  image_url,
  image_urls,
  product_media,
  product_attributes,
  is_active,
  availability_mode,
  stock_quantity,
  lead_time_days,
  made_to_order_options,
  created_at
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000101',
    '20000000-0000-4000-8000-000000000001',
    'Set de mesa cotidiano',
    'Piezas simples para armar una mesa calida en casa.',
    18500,
    '/pwa-512.png',
    array['/pwa-512.png', '/pwa-192.png'],
    '[{"type":"image","url":"/pwa-512.png","thumbnail_url":"/pwa-192.png","description":"Set de mesa cotidiano"},{"type":"model_3d","url":"https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/SheenChair/glTF-Binary/SheenChair.glb","poster_url":"/pwa-512.png","thumbnail_url":"/pwa-192.png","format":"glb","size_bytes":4385048,"description":"Modelo 3D demo"}]'::jsonb,
    '[{"name":"Material","value":"TPU"},{"name":"Estilo","value":"Transparente"}]'::jsonb,
    true,
    'stock',
    8,
    null,
    '[]'::jsonb,
    now() - interval '5 days'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000101',
    '20000000-0000-4000-8000-000000000003',
    'Caja regalo de temporada',
    'Seleccion de productos pequenos para regalar sin elegir pieza por pieza.',
    24500,
    '/pwa-512.png',
    array['/pwa-512.png'],
    '[{"url":"/pwa-512.png","thumbnail_url":"/pwa-192.png","description":"Caja regalo de temporada"}]'::jsonb,
    '[{"name":"Incluye","value":"3 piezas"}]'::jsonb,
    true,
    'stock',
    5,
    null,
    '[]'::jsonb,
    now() - interval '4 days'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000102',
    '20000000-0000-4000-8000-000000000002',
    'Bolso liviano urbano',
    'Bolso flexible para compras, paseo o uso diario.',
    29800,
    '/pwa-512.png',
    array['/pwa-512.png', '/pwa-192.png'],
    '[{"url":"/pwa-512.png","thumbnail_url":"/pwa-192.png","description":"Bolso liviano urbano"}]'::jsonb,
    '[{"name":"Medida","value":"Mediana"},{"name":"Cuidado","value":"Lavado suave"}]'::jsonb,
    true,
    'made_to_order',
    null,
    7,
    '[{"name":"Color","values":["Arena","Verde","Azul"]}]'::jsonb,
    now() - interval '3 days'
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000102',
    '20000000-0000-4000-8000-000000000003',
    'Neceser compacto',
    'Organizador pequeno para llevar articulos personales.',
    12600,
    '/pwa-512.png',
    array['/pwa-512.png'],
    '[{"url":"/pwa-512.png","thumbnail_url":"/pwa-192.png","description":"Neceser compacto"}]'::jsonb,
    '[{"name":"Formato","value":"Compacto"}]'::jsonb,
    true,
    'stock',
    12,
    null,
    '[]'::jsonb,
    now() - interval '2 days'
  ),
  (
    '30000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000103',
    '20000000-0000-4000-8000-000000000004',
    'Vela aromatica suave',
    'Aroma fresco para escritorio, living o dormitorio.',
    9200,
    '/pwa-512.png',
    array['/pwa-512.png', '/pwa-192.png'],
    '[{"url":"/pwa-512.png","thumbnail_url":"/pwa-192.png","description":"Vela aromatica suave"}]'::jsonb,
    '[{"name":"Aroma","value":"Hierbas suaves"}]'::jsonb,
    true,
    'stock',
    20,
    null,
    '[]'::jsonb,
    now() - interval '1 day'
  ),
  (
    '30000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000103',
    '20000000-0000-4000-8000-000000000001',
    'Centro decorativo',
    'Pieza simple para mesa baja, estante o rincon de lectura.',
    21400,
    '/pwa-512.png',
    array['/pwa-512.png'],
    '[{"url":"/pwa-512.png","thumbnail_url":"/pwa-192.png","description":"Centro decorativo"}]'::jsonb,
    '[{"name":"Uso","value":"Decorativo"}]'::jsonb,
    true,
    'made_to_order',
    null,
    10,
    '[{"name":"Terminacion","values":["Mate","Satinada"]}]'::jsonb,
    now() - interval '12 hours'
  ),
  (
    '30000000-0000-4000-8000-000000000007',
    '10000000-0000-4000-8000-000000000101',
    '20000000-0000-4000-8000-000000000001',
    'Lampara de mesa curva',
    'Lampara compacta para sumar luz calida en una mesa de noche, escritorio o rincon de lectura.',
    36500,
    'https://picsum.photos/seed/marketplace-lamp-table/900/1100',
    array[
      'https://picsum.photos/seed/marketplace-lamp-table/900/1100',
      'https://picsum.photos/seed/marketplace-lamp-detail/900/1100'
    ],
    '[{"type":"image","url":"https://picsum.photos/seed/marketplace-lamp-table/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-lamp-table/360/440","description":"Lampara de mesa curva"},{"type":"image","url":"https://picsum.photos/seed/marketplace-lamp-detail/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-lamp-detail/360/440","description":"Detalle de terminacion"},{"type":"model_3d","url":"https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/SheenChair/glTF-Binary/SheenChair.glb","poster_url":"https://picsum.photos/seed/marketplace-lamp-table/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-lamp-table/360/440","format":"glb","size_bytes":4385048,"description":"Modelo 3D demo"}]'::jsonb,
    '[{"name":"Material","value":"Silicona"},{"name":"Compatibilidad","value":"iPhone"}]'::jsonb,
    true,
    'stock',
    6,
    null,
    '[]'::jsonb,
    now() - interval '11 hours'
  ),
  (
    '30000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000101',
    '20000000-0000-4000-8000-000000000004',
    'Kit de cuidado personal',
    'Set liviano con elementos de uso diario para armar una rutina simple en casa o llevar de viaje.',
    17200,
    'https://picsum.photos/seed/marketplace-care-kit/900/1100',
    array[
      'https://picsum.photos/seed/marketplace-care-kit/900/1100',
      'https://picsum.photos/seed/marketplace-care-kit-pack/900/1100'
    ],
    '[{"url":"https://picsum.photos/seed/marketplace-care-kit/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-care-kit/360/440","description":"Kit de cuidado personal"},{"url":"https://picsum.photos/seed/marketplace-care-kit-pack/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-care-kit-pack/360/440","description":"Presentacion del kit"}]'::jsonb,
    '[{"name":"Incluye","value":"4 unidades"},{"name":"Formato","value":"Pack"}]'::jsonb,
    true,
    'stock',
    14,
    null,
    '[]'::jsonb,
    now() - interval '10 hours'
  ),
  (
    '30000000-0000-4000-8000-000000000009',
    '10000000-0000-4000-8000-000000000102',
    '20000000-0000-4000-8000-000000000002',
    'Camisa oversize neutra',
    'Prenda amplia de uso cotidiano, pensada para combinar facil con distintas capas y estaciones.',
    33200,
    'https://picsum.photos/seed/marketplace-shirt-neutral/900/1100',
    array[
      'https://picsum.photos/seed/marketplace-shirt-neutral/900/1100',
      'https://picsum.photos/seed/marketplace-shirt-textile/900/1100',
      'https://picsum.photos/seed/marketplace-shirt-detail/900/1100'
    ],
    '[{"url":"https://picsum.photos/seed/marketplace-shirt-neutral/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-shirt-neutral/360/440","description":"Camisa oversize neutra"},{"url":"https://picsum.photos/seed/marketplace-shirt-textile/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-shirt-textile/360/440","description":"Textura de tela"},{"url":"https://picsum.photos/seed/marketplace-shirt-detail/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-shirt-detail/360/440","description":"Detalle de costura"}]'::jsonb,
    '[{"name":"Talle","value":"Unico amplio"},{"name":"Tela","value":"Algodon"}]'::jsonb,
    true,
    'made_to_order',
    null,
    9,
    '[{"name":"Color","values":["Blanco","Gris","Celeste"]},{"name":"Largo","values":["Regular","Largo"]}]'::jsonb,
    now() - interval '9 hours'
  ),
  (
    '30000000-0000-4000-8000-000000000010',
    '10000000-0000-4000-8000-000000000102',
    '20000000-0000-4000-8000-000000000003',
    'Cuaderno de tapa rigida',
    'Cuaderno resistente para notas, proyectos o listas, con interior liso y papel de buen gramaje.',
    11800,
    'https://picsum.photos/seed/marketplace-notebook-hardcover/900/1100',
    array[
      'https://picsum.photos/seed/marketplace-notebook-hardcover/900/1100',
      'https://picsum.photos/seed/marketplace-notebook-pages/900/1100'
    ],
    '[{"url":"https://picsum.photos/seed/marketplace-notebook-hardcover/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-notebook-hardcover/360/440","description":"Cuaderno de tapa rigida"},{"url":"https://picsum.photos/seed/marketplace-notebook-pages/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-notebook-pages/360/440","description":"Interior del cuaderno"}]'::jsonb,
    '[{"name":"Hojas","value":"96"},{"name":"Formato","value":"A5"}]'::jsonb,
    true,
    'stock',
    18,
    null,
    '[]'::jsonb,
    now() - interval '8 hours'
  ),
  (
    '30000000-0000-4000-8000-000000000011',
    '10000000-0000-4000-8000-000000000103',
    '20000000-0000-4000-8000-000000000001',
    'Organizador modular',
    'Modulo simple para ordenar llaves, cables, papeles o pequenos objetos sobre una superficie de trabajo.',
    20900,
    'https://picsum.photos/seed/marketplace-desk-organizer/900/1100',
    array[
      'https://picsum.photos/seed/marketplace-desk-organizer/900/1100',
      'https://picsum.photos/seed/marketplace-organizer-top/900/1100'
    ],
    '[{"url":"https://picsum.photos/seed/marketplace-desk-organizer/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-desk-organizer/360/440","description":"Organizador modular"},{"url":"https://picsum.photos/seed/marketplace-organizer-top/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-organizer-top/360/440","description":"Vista superior"}]'::jsonb,
    '[{"name":"Modulos","value":"3"},{"name":"Terminacion","value":"Mate"}]'::jsonb,
    true,
    'stock',
    9,
    null,
    '[]'::jsonb,
    now() - interval '7 hours'
  ),
  (
    '30000000-0000-4000-8000-000000000012',
    '10000000-0000-4000-8000-000000000103',
    '20000000-0000-4000-8000-000000000004',
    'Difusor ambiental mini',
    'Difusor chico para espacios de trabajo, dormitorios o banos, con aroma suave y persistente.',
    15400,
    'https://picsum.photos/seed/marketplace-mini-diffuser/900/1100',
    array[
      'https://picsum.photos/seed/marketplace-mini-diffuser/900/1100',
      'https://picsum.photos/seed/marketplace-diffuser-detail/900/1100'
    ],
    '[{"url":"https://picsum.photos/seed/marketplace-mini-diffuser/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-mini-diffuser/360/440","description":"Difusor ambiental mini"},{"url":"https://picsum.photos/seed/marketplace-diffuser-detail/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-diffuser-detail/360/440","description":"Detalle del difusor"}]'::jsonb,
    '[{"name":"Contenido","value":"120 ml"},{"name":"Aroma","value":"Limpio"}]'::jsonb,
    true,
    'stock',
    16,
    null,
    '[]'::jsonb,
    now() - interval '6 hours'
  ),
  (
    '30000000-0000-4000-8000-000000000013',
    '10000000-0000-4000-8000-000000000101',
    '20000000-0000-4000-8000-000000000002',
    'Mochila plegable diaria',
    'Mochila liviana para trayectos cortos, con bolsillo interno y cuerpo plegable para guardar facil.',
    42100,
    'https://picsum.photos/seed/marketplace-folding-backpack/900/1100',
    array[
      'https://picsum.photos/seed/marketplace-folding-backpack/900/1100',
      'https://picsum.photos/seed/marketplace-backpack-pocket/900/1100'
    ],
    '[{"url":"https://picsum.photos/seed/marketplace-folding-backpack/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-folding-backpack/360/440","description":"Mochila plegable diaria"},{"url":"https://picsum.photos/seed/marketplace-backpack-pocket/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-backpack-pocket/360/440","description":"Bolsillo interno"}]'::jsonb,
    '[{"name":"Capacidad","value":"18 litros"},{"name":"Peso","value":"Liviana"}]'::jsonb,
    true,
    'made_to_order',
    null,
    12,
    '[{"name":"Color","values":["Negro","Gris","Verde"]}]'::jsonb,
    now() - interval '5 hours'
  ),
  (
    '30000000-0000-4000-8000-000000000014',
    '10000000-0000-4000-8000-000000000102',
    '20000000-0000-4000-8000-000000000001',
    'Bandeja apilable',
    'Bandeja firme para servir, ordenar accesorios o armar una estacion de cafe en espacios chicos.',
    26800,
    'https://picsum.photos/seed/marketplace-stackable-tray/900/1100',
    array[
      'https://picsum.photos/seed/marketplace-stackable-tray/900/1100',
      'https://picsum.photos/seed/marketplace-tray-detail/900/1100'
    ],
    '[{"url":"https://picsum.photos/seed/marketplace-stackable-tray/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-stackable-tray/360/440","description":"Bandeja apilable"},{"url":"https://picsum.photos/seed/marketplace-tray-detail/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-tray-detail/360/440","description":"Detalle de borde"}]'::jsonb,
    '[{"name":"Formato","value":"Rectangular"},{"name":"Uso","value":"Multiuso"}]'::jsonb,
    true,
    'stock',
    7,
    null,
    '[]'::jsonb,
    now() - interval '4 hours'
  ),
  (
    '30000000-0000-4000-8000-000000000015',
    '10000000-0000-4000-8000-000000000103',
    '20000000-0000-4000-8000-000000000003',
    'Pack escritorio inicial',
    'Combinacion de accesorios para ordenar el escritorio y empezar una rutina de trabajo mas clara.',
    28700,
    'https://picsum.photos/seed/marketplace-desk-starter-pack/900/1100',
    array[
      'https://picsum.photos/seed/marketplace-desk-starter-pack/900/1100',
      'https://picsum.photos/seed/marketplace-desk-pack-close/900/1100'
    ],
    '[{"url":"https://picsum.photos/seed/marketplace-desk-starter-pack/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-desk-starter-pack/360/440","description":"Pack escritorio inicial"},{"url":"https://picsum.photos/seed/marketplace-desk-pack-close/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-desk-pack-close/360/440","description":"Accesorios del pack"}]'::jsonb,
    '[{"name":"Incluye","value":"5 accesorios"},{"name":"Ideal para","value":"Home office"}]'::jsonb,
    true,
    'stock',
    10,
    null,
    '[]'::jsonb,
    now() - interval '3 hours'
  ),
  (
    '30000000-0000-4000-8000-000000000016',
    '10000000-0000-4000-8000-000000000101',
    '20000000-0000-4000-8000-000000000004',
    'Almohadilla termica',
    'Almohadilla compacta para descanso, pausas de trabajo o pequenos momentos de relajacion.',
    19600,
    'https://picsum.photos/seed/marketplace-thermal-pad/900/1100',
    array[
      'https://picsum.photos/seed/marketplace-thermal-pad/900/1100',
      'https://picsum.photos/seed/marketplace-pad-fabric/900/1100'
    ],
    '[{"url":"https://picsum.photos/seed/marketplace-thermal-pad/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-thermal-pad/360/440","description":"Almohadilla termica"},{"url":"https://picsum.photos/seed/marketplace-pad-fabric/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-pad-fabric/360/440","description":"Textura de funda"}]'::jsonb,
    '[{"name":"Funda","value":"Removible"},{"name":"Uso","value":"Bienestar"}]'::jsonb,
    true,
    'made_to_order',
    null,
    6,
    '[{"name":"Funda","values":["Gris","Celeste","Verde"]}]'::jsonb,
    now() - interval '2 hours'
  ),
  (
    '30000000-0000-4000-8000-000000000017',
    '10000000-0000-4000-8000-000000000102',
    '20000000-0000-4000-8000-000000000002',
    'Rinonera simple',
    'Accesorio compacto para caminar, viajar o salir con lo minimo sin cargar una mochila.',
    22300,
    'https://picsum.photos/seed/marketplace-waist-bag/900/1100',
    array[
      'https://picsum.photos/seed/marketplace-waist-bag/900/1100',
      'https://picsum.photos/seed/marketplace-waist-bag-strap/900/1100'
    ],
    '[{"url":"https://picsum.photos/seed/marketplace-waist-bag/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-waist-bag/360/440","description":"Rinonera simple"},{"url":"https://picsum.photos/seed/marketplace-waist-bag-strap/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-waist-bag-strap/360/440","description":"Correa ajustable"}]'::jsonb,
    '[{"name":"Bolsillos","value":"2"},{"name":"Correa","value":"Regulable"}]'::jsonb,
    true,
    'stock',
    11,
    null,
    '[]'::jsonb,
    now() - interval '90 minutes'
  ),
  (
    '30000000-0000-4000-8000-000000000018',
    '10000000-0000-4000-8000-000000000103',
    '20000000-0000-4000-8000-000000000003',
    'Caja bienvenida hogar',
    'Seleccion pensada para mudanzas, alquileres temporarios o regalos practicos para una casa nueva.',
    38900,
    'https://picsum.photos/seed/marketplace-home-welcome-box/900/1100',
    array[
      'https://picsum.photos/seed/marketplace-home-welcome-box/900/1100',
      'https://picsum.photos/seed/marketplace-welcome-box-open/900/1100',
      'https://picsum.photos/seed/marketplace-welcome-box-items/900/1100'
    ],
    '[{"url":"https://picsum.photos/seed/marketplace-home-welcome-box/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-home-welcome-box/360/440","description":"Caja bienvenida hogar"},{"url":"https://picsum.photos/seed/marketplace-welcome-box-open/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-welcome-box-open/360/440","description":"Caja abierta"},{"url":"https://picsum.photos/seed/marketplace-welcome-box-items/900/1100","thumbnail_url":"https://picsum.photos/seed/marketplace-welcome-box-items/360/440","description":"Contenido del regalo"}]'::jsonb,
    '[{"name":"Incluye","value":"6 productos"},{"name":"Presentacion","value":"Caja"}]'::jsonb,
    true,
    'stock',
    4,
    null,
    '[]'::jsonb,
    now() - interval '45 minutes'
  )
on conflict (id) do update set
  artisan_id = excluded.artisan_id,
  category_id = excluded.category_id,
  title = excluded.title,
  description = excluded.description,
  price = excluded.price,
  image_url = excluded.image_url,
  image_urls = excluded.image_urls,
  product_media = excluded.product_media,
  product_attributes = excluded.product_attributes,
  is_active = excluded.is_active,
  availability_mode = excluded.availability_mode,
  stock_quantity = excluded.stock_quantity,
  lead_time_days = excluded.lead_time_days,
  made_to_order_options = excluded.made_to_order_options,
  created_at = excluded.created_at;

insert into public.product_admin_controls (
  product_id,
  internal_tag,
  comment,
  boost_level,
  boost_until
)
values (
  '30000000-0000-4000-8000-000000000001',
  'destacado up',
  'Producto destacado para validar cards y ordenamiento.',
  'medio',
  now() + interval '30 days'
)
on conflict (product_id) do update set
  internal_tag = excluded.internal_tag,
  comment = excluded.comment,
  boost_level = excluded.boost_level,
  boost_until = excluded.boost_until,
  updated_at = now();

insert into public.site_content (content_key, value, updated_by)
values
  (
    'home.hero.description',
    'Un marketplace neutral para descubrir tiendas, comparar productos y probar flujos reales sin tocar datos productivos.',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    'home.primary_button.label',
    'Ver catalogo',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    'home.secondary_button.label',
    'Ingresar',
    '10000000-0000-4000-8000-000000000001'
  )
on conflict (content_key) do update set
  value = excluded.value,
  updated_by = excluded.updated_by,
  updated_at = now();

insert into public.buyer_preferences (
  buyer_id,
  phone,
  preferred_delivery_type,
  delivery_notes,
  shipping_address
)
values (
  '10000000-0000-4000-8000-000000000201',
  '+5491100000201',
  'arrange_with_seller',
  'Datos demo para probar checkout local.',
  'Direccion demo 123'
)
on conflict (buyer_id) do update set
  phone = excluded.phone,
  preferred_delivery_type = excluded.preferred_delivery_type,
  delivery_notes = excluded.delivery_notes,
  shipping_address = excluded.shipping_address,
  updated_at = now();

insert into public.buyer_favorites (id, buyer_id, product_id)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000201',
    '30000000-0000-4000-8000-000000000001'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000201',
    '30000000-0000-4000-8000-000000000003'
  )
on conflict (buyer_id, product_id) do nothing;

insert into public.carts (id, buyer_id, status)
values (
  '50000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000201',
  'active'
)
on conflict (id) do update set
  buyer_id = excluded.buyer_id,
  status = excluded.status,
  updated_at = now();

insert into public.cart_items (
  id,
  cart_id,
  product_id,
  artisan_id,
  quantity,
  unit_price,
  product_title,
  product_image_url,
  availability_mode
)
values (
  '50000000-0000-4000-8000-000000000101',
  '50000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000005',
  '10000000-0000-4000-8000-000000000103',
  2,
  9200,
  'Vela aromatica suave',
  '/pwa-192.png',
  'stock'
)
on conflict (id) do update set
  quantity = excluded.quantity,
  unit_price = excluded.unit_price,
  product_title = excluded.product_title,
  product_image_url = excluded.product_image_url,
  availability_mode = excluded.availability_mode,
  updated_at = now();

insert into public.orders (
  id,
  buyer_id,
  buyer_name,
  buyer_email,
  buyer_phone,
  total_amount,
  subtotal_amount,
  shipping_amount,
  fees_amount,
  currency,
  status,
  payment_status,
  fulfillment_status,
  delivery_type,
  delivery_address,
  delivery_notes,
  paid_at,
  created_at
)
values (
  '60000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000201',
  'Comprador Demo',
  'comprador@demo.local',
  '+5491100000201',
  18500,
  18500,
  0,
  0,
  'ARS',
  'paid',
  'approved',
  'preparing',
  'arrange_with_seller',
  'Direccion demo 123',
  'Pedido demo para validar paneles.',
  now() - interval '1 day',
  now() - interval '1 day'
)
on conflict (id) do update set
  buyer_id = excluded.buyer_id,
  buyer_name = excluded.buyer_name,
  buyer_email = excluded.buyer_email,
  buyer_phone = excluded.buyer_phone,
  total_amount = excluded.total_amount,
  subtotal_amount = excluded.subtotal_amount,
  shipping_amount = excluded.shipping_amount,
  fees_amount = excluded.fees_amount,
  status = excluded.status,
  payment_status = excluded.payment_status,
  fulfillment_status = excluded.fulfillment_status,
  delivery_type = excluded.delivery_type,
  delivery_address = excluded.delivery_address,
  delivery_notes = excluded.delivery_notes,
  paid_at = excluded.paid_at,
  updated_at = now();

insert into public.order_items (
  id,
  order_id,
  product_id,
  artisan_id,
  product_title,
  product_description,
  product_image_url,
  category_name,
  artisan_name,
  store_name,
  availability_mode,
  fulfillment_status,
  quantity,
  unit_price,
  subtotal,
  created_at
)
values (
  '60000000-0000-4000-8000-000000000101',
  '60000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000101',
  'Set de mesa cotidiano',
  'Piezas simples para armar una mesa calida en casa.',
  '/pwa-192.png',
  'Hogar',
  'Tienda Norte',
  'Tienda Norte',
  'stock',
  'preparing',
  1,
  18500,
  18500,
  now() - interval '1 day'
)
on conflict (id) do update set
  product_title = excluded.product_title,
  product_description = excluded.product_description,
  product_image_url = excluded.product_image_url,
  category_name = excluded.category_name,
  artisan_name = excluded.artisan_name,
  store_name = excluded.store_name,
  availability_mode = excluded.availability_mode,
  fulfillment_status = excluded.fulfillment_status,
  quantity = excluded.quantity,
  unit_price = excluded.unit_price,
  subtotal = excluded.subtotal;

insert into public.order_events (
  id,
  order_id,
  order_item_id,
  event_type,
  actor_id,
  actor_role,
  message,
  metadata,
  created_at
)
values (
  '60000000-0000-4000-8000-000000000201',
  '60000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000101',
  'fulfillment_status_updated',
  '10000000-0000-4000-8000-000000000101',
  'artisan',
  'Pedido demo marcado como en preparacion.',
  '{"fulfillment_status":"preparing"}'::jsonb,
  now() - interval '12 hours'
)
on conflict (id) do update set
  event_type = excluded.event_type,
  actor_id = excluded.actor_id,
  actor_role = excluded.actor_role,
  message = excluded.message,
  metadata = excluded.metadata,
  created_at = excluded.created_at;

insert into public.catalog_activity_events (
  id,
  user_id,
  artisan_id,
  category_id,
  product_id,
  search_term
)
values (
  '70000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000201',
  '10000000-0000-4000-8000-000000000101',
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'mesa'
)
on conflict (id) do update set
  artisan_id = excluded.artisan_id,
  category_id = excluded.category_id,
  product_id = excluded.product_id,
  search_term = excluded.search_term,
  created_at = now();

commit;
