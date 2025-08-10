# 🍥Fuwari

Un tema estático para blogs construido con [Astro](https://astro.build).

[**🖥️ Demostración en Vivo (Vercel)**](https://fuwari.vercel.app)&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;
[**📦 Versión Antigua de Hexo**](https://github.com/saicaca/hexo-theme-vivia)&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;

> Versión del README: `2024-04-07`

![Imagen de Vista Previa](https://raw.githubusercontent.com/saicaca/resource/main/fuwari/home.png)

## ✨ Características

- [x] Construido con [Astro](https://astro.build) y [Tailwind CSS](https://tailwindcss.com)
- [x] Animaciones suaves y transiciones de página
- [x] Modo claro / oscuro
- [x] Colores del tema y banner personalizables
- [x] Diseño responsivo
- [ ] Comentarios
- [x] Buscador
- [ ] TOC (Tabla de Contenidos)

## 🚀 Cómo Usar

1. [Genera un nuevo repositorio](https://github.com/saicaca/fuwari/generate) desde esta plantilla o haz un fork de este repositorio.
2. Para editar tu blog localmente, clona tu repositorio, ejecuta `pnpm install` y `pnpm add sharp` para instalar las dependencias.
   - Instala [pnpm](https://pnpm.io) `npm install -g pnpm` si aún no lo tienes.
3. Edita el archivo de configuración `src/config.ts` para personalizar tu blog.
4. [ELIMINADO: Ya no se usa `pnpm new-post` ni se edita en `src/content/posts/`. Ahora los posts se gestionan desde el backend.]
5. Despliega tu blog en Vercel, Netlify, GitHub Pages, etc., siguiendo [las guías](https://docs.astro.build/en/guides/deploy/). Necesitas editar la configuración del sitio en `astro.config.mjs` antes del despliegue.

## ⚙️ Cabecera de las Entradas

```yaml
---
title: Mi Primer Post en el Blog
published: 2023-09-09
description: Esta es la primera entrada de mi nuevo blog con Astro.
image: /images/cover.jpg
tags: [Foo, Bar]
category: Front-end
draft: false
---
```

## 🧞 Comandos

Todos los comandos se ejecutan desde la raíz del proyecto, desde una terminal:

| Comando                             | Acción                                                     |
| :---------------------------------- | :--------------------------------------------------------- |
| `pnpm install` y `pnpm add sharp`   | Instala las dependencias                                   |
| `pnpm dev`                          | Inicia el servidor de desarrollo local en `localhost:4321` |
| `pnpm build`                        | Compila tu web para producción en `./dist/`                |
| `pnpm preview`                      | Previsualiza la web localmente, antes del despliegue       |
| `pnpm astro ...`                    | Ejecuta comandos CLI como `astro add`, `astro check`       |
| `pnpm astro --help`                 | Obtén ayuda para usar el CLI de Astro                      |
