/**
 * Состояние списка клиентов: загрузка, сохранение, удаление,
 * а также строка поиска и выбранный фильтр.
 */

import { create } from 'zustand';
import {
  CLIENT_SCHEMA_VERSION,
  createClient,
  type Client,
  type ClientDraft,
  type Contact,
} from '../domain/client';
import type { ParsedRow } from '../domain/import';
import { forgetFromCache, sortClients } from '../domain/search';
import { deleteClient, loadAll, readCache, saveClient, writeCache } from '../storage/clientsRepo';
import {
  deletePhoto,
  loadAllPhotos,
  readPhotoCache,
  savePhoto,
  writePhotoCache,
  type PhotoMap,
} from '../storage/photosRepo';

interface ClientsState {
  clients: Client[];
  /** фото клиентов: id клиента → картинка в виде строки data:… */
  photos: PhotoMap;
  loaded: boolean;
  error: string | null;

  query: string;
  statusFilter: string;

  load: () => Promise<void>;
  byId: (id: string) => Client | undefined;
  create: (draft: ClientDraft) => Promise<Client>;
  update: (id: string, draft: ClientDraft) => Promise<void>;
  patch: (id: string, changes: Partial<Client>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  importRows: (
    rows: ParsedRow[],
    onProgress?: (done: number) => void,
  ) => Promise<{ added: number; updated: number }>;
  toggleFavorite: (id: string) => Promise<void>;
  setPhoto: (id: string, dataUrl: string) => Promise<void>;
  clearPhoto: (id: string) => Promise<void>;

  setQuery: (query: string) => void;
  setStatusFilter: (status: string) => void;
  clearError: () => void;
}

/** Дописывает новые контакты к старым, не создавая одинаковых */
function mergeContacts(current: Contact[], incoming?: Contact[]): Contact[] {
  if (!incoming || incoming.length === 0) return current;
  const seen = new Set(current.map((c) => c.value.trim().toLowerCase()));
  const extra = incoming.filter((c) => {
    const key = c.value.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return extra.length > 0 ? [...current, ...extra] : current;
}

function describeError(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return 'Не удалось сохранить. Попробуй ещё раз.';
}

export const useClients = create<ClientsState>()((set, get) => ({
  clients: [],
  photos: {},
  loaded: false,
  error: null,
  query: '',
  statusFilter: 'all',

  load: async () => {
    // сначала показываем локальный кэш — интерфейс не «моргает» пустотой
    const cached = readCache();
    const cachedPhotos = readPhotoCache();
    if (cached.length > 0) set({ clients: sortClients(cached), photos: cachedPhotos });

    try {
      const [list, photos] = await Promise.all([loadAll(), loadAllPhotos()]);
      set({ clients: sortClients(list), photos, loaded: true, error: null });
      writeCache(list);
      writePhotoCache(photos);
    } catch (e) {
      set({
        loaded: true,
        error: cached.length > 0 ? null : describeError(e),
      });
    }
  },

  byId: (id) => get().clients.find((c) => c.id === id),

  create: async (draft) => {
    const client = createClient({ ...draft, v: CLIENT_SCHEMA_VERSION });
    const next = sortClients([client, ...get().clients]);
    set({ clients: next, error: null });
    try {
      await saveClient(client);
      writeCache(next);
    } catch (e) {
      // откатываем: запись не сохранилась
      const rolled = get().clients.filter((c) => c.id !== client.id);
      set({ clients: rolled, error: describeError(e) });
      throw e;
    }
    return client;
  },

  update: async (id, draft) => {
    await get().patch(id, draft as Partial<Client>);
  },

  patch: async (id, changes) => {
    const previous = get().clients;
    const target = previous.find((c) => c.id === id);
    if (!target) return;

    const updated: Client = { ...target, ...changes, id, updatedAt: Date.now() };
    const next = sortClients(previous.map((c) => (c.id === id ? updated : c)));
    set({ clients: next, error: null });

    try {
      await saveClient(updated);
      writeCache(next);
    } catch (e) {
      set({ clients: previous, error: describeError(e) });
      throw e;
    }
  },

  /**
   * Вставка списком. Пишем в хранилище по одной записи, а состояние
   * обновляем один раз в конце — иначе сотня карточек дёргает экран
   * сотню раз. Если запись оборвалась, сохраняем то, что успели.
   */
  importRows: async (rows, onProgress) => {
    const result = [...get().clients];
    const indexById = new Map(result.map((c, i) => [c.id, i]));

    let added = 0;
    let updated = 0;
    let done = 0;

    const finish = () => {
      const sorted = sortClients(result);
      set({ clients: sorted });
      writeCache(sorted);
    };

    for (const row of rows) {
      const at = row.existingId !== undefined ? indexById.get(row.existingId) : undefined;
      let client: Client;

      if (at !== undefined) {
        const target = result[at];
        client = {
          ...target,
          ...row.patch,
          name: row.name,
          contacts: mergeContacts(target.contacts, row.patch.contacts),
          updatedAt: Date.now(),
        };
        result[at] = client;
        updated += 1;
      } else {
        client = createClient({ ...row.patch, name: row.name, v: CLIENT_SCHEMA_VERSION });
        indexById.set(client.id, result.length);
        result.push(client);
        added += 1;
      }

      try {
        await saveClient(client);
      } catch (e) {
        finish();
        set({ error: describeError(e) });
        throw e;
      }

      done += 1;
      onProgress?.(done);
    }

    finish();
    set({ error: null });
    return { added, updated };
  },

  remove: async (id) => {
    const previous = get().clients;
    const next = previous.filter((c) => c.id !== id);
    set({ clients: next, error: null });
    try {
      await deleteClient(id);
      forgetFromCache(id);
      writeCache(next);
      // фото хранится отдельной записью — убираем и его
      if (get().photos[id]) await get().clearPhoto(id);
    } catch (e) {
      set({ clients: previous, error: describeError(e) });
      throw e;
    }
  },

  setPhoto: async (id, dataUrl) => {
    const previous = get().photos;
    const next = { ...previous, [id]: dataUrl };
    set({ photos: next, error: null });
    try {
      await savePhoto(id, dataUrl);
      writePhotoCache(next);
    } catch (e) {
      set({ photos: previous, error: describeError(e) });
      throw e;
    }
  },

  clearPhoto: async (id) => {
    const previous = get().photos;
    const next = { ...previous };
    delete next[id];
    set({ photos: next, error: null });
    try {
      await deletePhoto(id);
      writePhotoCache(next);
    } catch (e) {
      set({ photos: previous, error: describeError(e) });
      throw e;
    }
  },

  toggleFavorite: async (id) => {
    const target = get().byId(id);
    if (!target) return;
    await get().patch(id, { favorite: !target.favorite });
  },

  setQuery: (query) => set({ query }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  clearError: () => set({ error: null }),
}));
