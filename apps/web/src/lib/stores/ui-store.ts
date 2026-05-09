'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (v: boolean) => void
  /**
   * Estado del coach IA flotante (FAB). Lo lift-eamos al store global
   * para que botones fuera del componente (ej. CTA "Abrir coach" en
   * /ia/page.tsx) puedan abrirlo sin acoplar refs.
   */
  aiCoachOpen: boolean
  setAiCoachOpen: (v: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      commandPaletteOpen: false,
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      aiCoachOpen: false,
      setAiCoachOpen: (aiCoachOpen) => set({ aiCoachOpen }),
    }),
    {
      name: 'interna.ui',
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
)
