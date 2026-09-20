/**
 * Навигация. Два корневых экрана (вкладки) и стек поверх них.
 * Стек связан с системной кнопкой «назад» Telegram.
 */

import { create } from 'zustand';

export type Tab = 'clients' | 'numbers' | 'reminders';

export type Screen =
  | { name: 'clients' }
  | { name: 'numbers' }
  | { name: 'reminders' }
  | { name: 'details'; id: string }
  | { name: 'form'; id?: string };

/**
 * Защита от потери данных: экран может попросить подтверждение перед
 * уходом. Функция получает `proceed` и решает, вызывать ли его.
 */
type Guard = (proceed: () => void) => void;

interface NavState {
  tab: Tab;
  stack: Screen[];
  guard: Guard | null;
  current: () => Screen;
  setTab: (tab: Tab) => void;
  push: (screen: Screen) => void;
  back: () => void;
  reset: () => void;
  setGuard: (guard: Guard | null) => void;
}

export const useNav = create<NavState>()((set, get) => ({
  tab: 'clients',
  stack: [],
  guard: null,

  current: () => {
    const { stack, tab } = get();
    return stack.length > 0 ? stack[stack.length - 1] : { name: tab };
  },

  setTab: (tab) => {
    const run = () => set({ tab, stack: [], guard: null });
    const { guard } = get();
    if (guard) guard(run);
    else run();
  },

  push: (screen) => set((state) => ({ stack: [...state.stack, screen], guard: null })),

  back: () => {
    const run = () => set((state) => ({ stack: state.stack.slice(0, -1), guard: null }));
    const { guard } = get();
    if (guard) guard(run);
    else run();
  },

  reset: () => set({ stack: [], guard: null }),

  setGuard: (guard) => set({ guard }),
}));
