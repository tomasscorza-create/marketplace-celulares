import { describe, expect, it } from "vitest";

import {
  applyOrderedMigrations,
  buildBackendReport,
  extractAppReferences,
} from "./backend-schema-audit.mjs";

describe("backend schema audit", () => {
  it("respeta drops de tablas y funciones creadas históricamente", () => {
    const schema = applyOrderedMigrations([
      {
        name: "002_remove.sql",
        source: `
          drop function if exists public.create_product_batch();
          drop table if exists public.product_batches;
        `,
      },
      {
        name: "001_create.sql",
        source: `
          create table if not exists public.products (id uuid);
          create table if not exists public.product_batches (id uuid);
          create or replace function public.create_product_batch() returns void as $$ begin end $$ language plpgsql;
        `,
      },
    ]);

    expect([...schema.definedTables]).toEqual(["products"]);
    expect([...schema.removedTables]).toEqual(["product_batches"]);
    expect([...schema.removedFunctions]).toEqual(["create_product_batch"]);
  });

  it("conserva una función que se elimina y recrea en la misma migración", () => {
    const schema = applyOrderedMigrations([
      {
        name: "001_rpc.sql",
        source: "create or replace function public.catalog_feed() returns void as $$ begin end $$ language plpgsql;",
      },
      {
        name: "002_replace.sql",
        source: `
          drop function if exists public.catalog_feed();
          create or replace function public.catalog_feed() returns void as $$ begin end $$ language plpgsql;
        `,
      },
    ]);

    expect([...schema.definedFunctions]).toEqual(["catalog_feed"]);
    expect([...schema.removedFunctions]).toEqual([]);
  });

  it("detecta referencias con comillas simples o dobles", () => {
    const references = extractAppReferences([
      `client.from("products"); client.from('profiles'); client.rpc("catalog_feed", {});`,
    ]);

    expect([...references.usedTables].sort()).toEqual(["products", "profiles"]);
    expect([...references.usedRpcs]).toEqual(["catalog_feed"]);
  });

  it("falla conceptualmente cuando el código usa objetos ausentes del esquema final", () => {
    const report = buildBackendReport({
      appSources: [`client.from("product_batches"); client.rpc("create_product_batch", {});`],
      migrationSources: [
        {
          name: "001.sql",
          source: "create table if not exists public.products (id uuid);",
        },
      ],
    });

    expect(report.missingTables).toEqual(["product_batches"]);
    expect(report.missingRpcs).toEqual(["create_product_batch"]);
  });
});
