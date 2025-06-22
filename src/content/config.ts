import { defineCollection, z } from "astro:content";

const homepage = defineCollection({
  type: "content", //"content" for markdown files
});

export const collections = { homepage };

