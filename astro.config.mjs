// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  alias: { "@": "./src" },

  // Configuration de sécurité
  security: {
    // Protection CSRF activée par défaut avec astro:actions
    checkOrigin: true,
  },

  // Configuration des variables d'environnement
  vite: {
    define: {
      // Assure que les variables d'environnement sont bien chargées
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
  },

  adapter: node({
    mode: 'standalone',
  }),
});