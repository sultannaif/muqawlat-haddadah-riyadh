import { defineConfig } from 'astro/config';
export default defineConfig({site: process.env.SITE_URL || 'https://muqawilriyadh.site',output:'static',trailingSlash:'always'});

