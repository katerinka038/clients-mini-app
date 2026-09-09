/**
 * Состояние списка клиентов: загрузка, сохранение, удаление,
 * а также строка поиска и выбранный фильтр.
 */

import { create } from 'zustand';
import { CLIENT_SCHEMA_VERSION, createClient, type Client, type ClientDraft } from '../domain/client';
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
  toggleFavorite: (id: string) => Promise<void>;
  setPhoto: (id: string, dataUrl: string) => Promise<void>;
  clearPhoto: (id: string) => Promise<void>;

  setQuery: (query: string) => void;
  setStatusFilter: (status: string) => void;
  clearError: () => void;
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
