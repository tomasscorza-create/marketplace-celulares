import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260715230000_catalog_promotions.sql",
  ),
  "utf8",
);
const demoContentMigration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260715231000_catalog_promotion_demo_content.sql",
  ),
  "utf8",
);

describe("catalog promotion migration", () => {
  it("mantiene lectura pública acotada a publicaciones activas y vigentes", () => {
    expect(migration).toContain('create policy "Public reads active catalog promotions"');
    expect(migration).toContain("starts_at is null or starts_at <= now()");
    expect(migration).toContain("ends_at is null or ends_at > now()");
  });

  it("reserva la edición y el storage para administradores", () => {
    expect(migration).toContain('create policy "Admins manage catalog promotions"');
    expect(migration).toContain("bucket_id = 'catalog-promotions' and public.is_admin()");
  });

  it("reclama beneficios de forma atómica y única por cuenta", () => {
    expect(migration).toContain("for update;");
    expect(migration).toContain("unique (promotion_id, profile_id)");
    expect(migration).toContain("v_promotion.max_claims");
    expect(migration).toContain("auth.uid()");
  });

  it("guarda un snapshot económico para no mutar beneficios ya obtenidos", () => {
    expect(migration).toMatch(/benefit_type text not null/);
    expect(migration).toMatch(/benefit_value numeric\(12, 2\) not null/);
    expect(migration).toContain("promotion_title");
  });

  it("agrega al menos dos contenidos editables para probar la rotación", () => {
    expect(demoContentMigration.match(/insert into public\.catalog_promotions/gi)).toHaveLength(2);
    expect(demoContentMigration).toContain("'product'");
    expect(demoContentMigration).toContain("'internal_link'");
    expect(demoContentMigration).toContain("public.is_public_artisan_visible");
  });
});
