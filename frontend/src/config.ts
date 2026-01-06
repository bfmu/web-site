import type {
  LicenseConfig,
  NavBarConfig,
  ProfileConfig,
  SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
  title: "bfmu.dev",
  subtitle: "| Bryan Muñoz",
  lang: "es", // 'en', 'zh_CN', 'zh_TW', 'ja', 'ko'
  themeColor: {
    hue: 250, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
    fixed: true, // Hide the theme color picker for visitors
  },
  banner: {
    enable: false,
    src: "assets/images/DSC_2453.jpg", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
    position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
    credit: {
      enable: false, // Display the credit text of the banner image
      text: "", // Credit text to be displayed
      url: "", // (Optional) URL link to the original artwork or artist's page
    },
  },
  toc: {
    enable: true, // Display the table of contents on the right side of the post
    depth: 2, // Maximum heading depth to show in the table, from 1 to 3
  },
  favicon: [
    // Favicon estándar
    {
      src: '/favicon/favicon-light-32.png',
      sizes: '32x32',
    },
    {
      src: '/favicon/favicon-light-128.png',
      sizes: '128x128',
    },
    {
      src: '/favicon/favicon-light-180.png',
      sizes: '180x180',
    },
    {
      src: '/favicon/favicon-light-192.png',
      sizes: '192x192',
    },
    // Favicons para dark mode
    {
      src: '/favicon/favicon-dark-32.png',
      theme: 'dark',
      sizes: '32x32',
    },
    {
      src: '/favicon/favicon-dark-128.png',
      theme: 'dark',
      sizes: '128x128',
    },
    {
      src: '/favicon/favicon-dark-180.png',
      theme: 'dark',
      sizes: '180x180',
    },
    {
      src: '/favicon/favicon-dark-192.png',
      theme: 'dark',
      sizes: '192x192',
    },
  ],
};

export const navBarConfig: NavBarConfig = {
  links: [
    LinkPreset.Home,
    // LinkPreset.Gallery,
    LinkPreset.Music,
    LinkPreset.Blog,
    // LinkPreset.Archive, // Removido - ahora está en el sidebar de blog
    LinkPreset.About,
    {
      name: "Portafolio",
      url: "https://portfolio.bfmu.dev/", // Internal links should not include the base path, as it is automatically added
      external: true, // Show an external link icon and will open in a new tab
      openInNewTab: false,
    },
  ],
};

export const profileConfig: ProfileConfig = {
  avatar: "assets/images/DSC_1024.jpg", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
  name: "Bryan Felipe Muñoz Molina",
  bio: "Un poco de todo, mucho de nada, siempre explorando.",
  links: [
    {
      name: "Instagram",
      icon: "fa6-brands:instagram", // Visit https://icones.js.org/ for icon codes
      // You will need to install the corresponding icon set if it's not already included
      // `pnpm add @iconify-json/<icon-set-name>`
      url: "https://www.instagram.com/bfmu.dev/",
    },
    {
      name: "LinkedIn",
      icon: "fa6-brands:linkedin",
      url: "https://www.linkedin.com/in/bfmunozm96/",
    },
    {
      name: "GitHub",
      icon: "fa6-brands:github",
      url: "https://github.com/bfmu",
    },
  ],
};

export const licenseConfig: LicenseConfig = {
  enable: true,
  name: "CC BY-NC-SA 4.0",
  url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};
