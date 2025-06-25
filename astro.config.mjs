// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  alias: { "@": "./src" },
  // Active le mode serveur pour utiliser astro:actions
  output: 'server',
  
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
});