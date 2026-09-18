import { defineConfig } from 'astro/config';
export default defineConfig({site: process.env.SITE_URL || 'https://riyadh-metal-shades.pages.dev',output:'static',trailingSlash:'always'});
