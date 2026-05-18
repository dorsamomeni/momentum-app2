import { supabase } from "../config/supabase";
import type { Json } from "../types/database";

type DocumentData = Record<string, any>;
type Operator = "==" | ">=" | "<=" | "array-contains";

type CollectionReference = {
  collectionName: string;
};

type DocumentReference = CollectionReference & {
  id: string;
};

type WhereClause = {
  field: string;
  op: Operator;
  value: any;
};

type QueryReference = CollectionReference & {
  clauses: WhereClause[];
  maxRows?: number;
};

type ArraySentinel = {
  __op: "arrayUnion" | "arrayRemove";
  values: any[];
};

const isArraySentinel = (value: unknown): value is ArraySentinel =>
  Boolean(value && typeof value === "object" && "__op" in value);

const createId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value ?? null));

const resolveTimestamps = (data: DocumentData): DocumentData => {
  const next: DocumentData = {};

  Object.entries(data).forEach(([key, value]) => {
    if (value === SERVER_TIMESTAMP) {
      next[key] = new Date().toISOString();
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      next[key] = resolveTimestamps(value as DocumentData);
    } else {
      next[key] = value;
    }
  });

  return next;
};

const applyUpdate = (current: DocumentData, update: DocumentData) => {
  const next = { ...current };

  Object.entries(resolveTimestamps(update)).forEach(([key, value]) => {
    if (isArraySentinel(value)) {
      const existing = Array.isArray(next[key]) ? next[key] : [];

      if (value.__op === "arrayUnion") {
        next[key] = [...existing];
        value.values.forEach((item) => {
          if (!next[key].some((existingItem: any) => JSON.stringify(existingItem) === JSON.stringify(item))) {
            next[key].push(item);
          }
        });
      }

      if (value.__op === "arrayRemove") {
        next[key] = existing.filter(
          (item: any) =>
            !value.values.some(
              (valueItem) => JSON.stringify(valueItem) === JSON.stringify(item),
            ),
        );
      }
    } else {
      next[key] = value;
    }
  });

  return next;
};

const fetchDocument = async (ref: DocumentReference) => {
  const { data, error } = await documents()
    .select("data")
    .eq("collection_name", ref.collectionName)
    .eq("id", ref.id)
    .maybeSingle();

  if (error) throw error;

  return ((data as { data?: DocumentData } | null)?.data as DocumentData | null) ?? null;
};

const upsertDocument = async (ref: DocumentReference, data: DocumentData) => {
  const { error } = await documents().upsert({
    collection_name: ref.collectionName,
    id: ref.id,
    data: data as Json,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
};

const matchesClause = (data: DocumentData, clause: WhereClause) => {
  const value = data[clause.field];

  switch (clause.op) {
    case "==":
      return value === clause.value;
    case ">=":
      return String(value ?? "") >= String(clause.value ?? "");
    case "<=":
      return String(value ?? "") <= String(clause.value ?? "");
    case "array-contains":
      return Array.isArray(value) && value.includes(clause.value);
    default:
      return false;
  }
};

const SERVER_TIMESTAMP = Symbol("serverTimestamp");
const documents = () => supabase.from("documents" as never) as any;

export const collection = (_db: unknown, collectionName: string): CollectionReference => ({
  collectionName,
});

export function doc(collectionRef: CollectionReference): DocumentReference;
export function doc(collectionRef: CollectionReference, id: string): DocumentReference;
export function doc(_db: unknown, collectionName: string, id: string): DocumentReference;
export function doc(
  first: unknown,
  second?: string,
  third?: string,
): DocumentReference {
  if (typeof third === "string") {
    return { collectionName: second as string, id: third };
  }

  const collectionRef = first as CollectionReference;
  return {
    collectionName: collectionRef.collectionName,
    id: second ?? createId(),
  };
}

export const addDoc = async (collectionRef: CollectionReference, data: DocumentData) => {
  const ref = doc(collectionRef);
  await setDoc(ref, data);
  return ref;
};

export const setDoc = async (
  ref: DocumentReference,
  data: DocumentData,
  options?: { merge?: boolean },
) => {
  const current = options?.merge ? (await fetchDocument(ref)) ?? {} : {};
  await upsertDocument(ref, {
    ...current,
    ...resolveTimestamps(data),
    id: ref.id,
  });
};

export const updateDoc = async (ref: DocumentReference, data: DocumentData) => {
  const current = (await fetchDocument(ref)) ?? {};
  await upsertDocument(ref, applyUpdate(current, data));
};

export const deleteDoc = async (ref: DocumentReference) => {
  const { error } = await documents()
    .delete()
    .eq("collection_name", ref.collectionName)
    .eq("id", ref.id);

  if (error) throw error;
};

export const getDoc = async (ref: DocumentReference) => {
  const data = await fetchDocument(ref);

  return {
    id: ref.id,
    exists: () => Boolean(data),
    data: () => clone(data),
  };
};

export const where = (field: string, op: Operator, value: any): WhereClause => ({
  field,
  op,
  value,
});

export const limit = (maxRows: number) => ({
  type: "limit" as const,
  maxRows,
});

export const query = (
  collectionRef: CollectionReference,
  ...constraints: Array<WhereClause | ReturnType<typeof limit>>
): QueryReference => ({
  collectionName: collectionRef.collectionName,
  clauses: constraints.filter((item): item is WhereClause => "field" in item),
  maxRows: constraints.find((item) => "maxRows" in item)?.maxRows,
});

export const getDocs = async (queryRef: QueryReference | CollectionReference) => {
  const { data, error } = await documents()
    .select("id,data")
    .eq("collection_name", queryRef.collectionName);

  if (error) throw error;

  const clauses = "clauses" in queryRef ? queryRef.clauses : [];
  const maxRows = "maxRows" in queryRef ? queryRef.maxRows : undefined;
  const docs = ((data ?? []) as Array<{ id: string; data: DocumentData }>)
    .map((row) => ({ id: row.id, data: row.data as DocumentData }))
    .filter((row) => clauses.every((clause) => matchesClause(row.data, clause)))
    .slice(0, maxRows);

  return {
    empty: docs.length === 0,
    docs: docs.map((row) => ({
      id: row.id,
      data: () => clone(row.data),
    })),
    forEach(callback: (doc: { id: string; data: () => DocumentData }) => void) {
      this.docs.forEach(callback);
    },
  };
};

export const arrayUnion = (...values: any[]): ArraySentinel => ({
  __op: "arrayUnion",
  values,
});

export const arrayRemove = (...values: any[]): ArraySentinel => ({
  __op: "arrayRemove",
  values,
});

export const serverTimestamp = () => SERVER_TIMESTAMP;

export const enableIndexedDbPersistence = async () => undefined;

export const writeBatch = (_db: unknown) => {
  const operations: Array<() => Promise<void>> = [];

  return {
    set(ref: DocumentReference, data: DocumentData, options?: { merge?: boolean }) {
      operations.push(() => setDoc(ref, data, options));
    },
    update(ref: DocumentReference, data: DocumentData) {
      operations.push(() => updateDoc(ref, data));
    },
    delete(ref: DocumentReference) {
      operations.push(() => deleteDoc(ref));
    },
    async commit() {
      for (const operation of operations) {
        await operation();
      }
    },
  };
};
