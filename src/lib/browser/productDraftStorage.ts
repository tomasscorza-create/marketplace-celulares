const DATABASE_NAME = "neutral-marketplace-product-drafts";
const STORE_NAME = "drafts";
const DATABASE_VERSION = 1;

type ProductDraftRecord<TValue> = {
  key: string;
  value: TValue;
};

function openDraftDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB no esta disponible."));
      return;
    }

    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("No pudimos abrir la base de borradores."));
    };
  });
}

async function withStore<TResult>(
  mode: IDBTransactionMode,
  handler: (
    store: IDBObjectStore,
    resolve: (value: TResult) => void,
    reject: (error: unknown) => void,
  ) => void,
) {
  const database = await openDraftDatabase();

  return new Promise<TResult>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);

    transaction.oncomplete = () => {
      database.close();
    };

    transaction.onerror = () => {
      reject(transaction.error ?? new Error("No pudimos completar la operacion del borrador."));
      database.close();
    };

    transaction.onabort = () => {
      reject(transaction.error ?? new Error("La operacion del borrador fue cancelada."));
      database.close();
    };

    handler(store, resolve, reject);
  });
}

export async function loadProductDraft<TValue>(key: string) {
  return withStore<TValue | null>("readonly", (store, resolve, reject) => {
    const request = store.get(key);

    request.onsuccess = () => {
      const result = request.result as ProductDraftRecord<TValue> | undefined;
      resolve(result?.value ?? null);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("No pudimos leer el borrador guardado."));
    };
  });
}

export async function saveProductDraft<TValue>(key: string, value: TValue) {
  await withStore<void>("readwrite", (store, resolve, reject) => {
    const request = store.put({
      key,
      value,
    } satisfies ProductDraftRecord<TValue>);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error ?? new Error("No pudimos guardar el borrador."));
    };
  });
}

export async function removeProductDraft(key: string) {
  await withStore<void>("readwrite", (store, resolve, reject) => {
    const request = store.delete(key);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error ?? new Error("No pudimos limpiar el borrador."));
    };
  });
}
