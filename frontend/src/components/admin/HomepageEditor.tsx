import React, { useState, useEffect } from 'react';
import { fetchHomepageConfig } from '../../lib/api-homepage';
import { updateHomepageConfig, type HomepageSectionConfig } from '../../lib/admin-api';
import { ImageLibraryModal } from './ImageLibraryModal';
import { getBackendResourceUrl } from '../../lib/env';
import { getOptimizedImageUrl } from '../../lib/image-utils';
import { DEFAULT_HOMEPAGE_SECTIONS } from '../home/componentRegistry';
import { showSuccess, showError } from '@/lib/notifications';

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero (banner principal)',
  intro: 'Introducción personal',
  secciones: 'Grid de secciones',
  'gallery-preview': 'Preview galería',
  'ultimos-posts': 'Últimos artículos',
  'now-listening': 'Actividad reciente (Spotify + libro + álbum)',
  'actividad-reciente': 'Actividad reciente (Spotify + libro + álbum)',
  'now-footer': 'Footer /now (reloj · esta semana · contacto)',
};

export function HomepageEditor() {
  const [sections, setSections] = useState<HomepageSectionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>('hero');
  const [imageModalFor, setImageModalFor] = useState<{ sectionId: string; field: string; appendToArray?: boolean } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await fetchHomepageConfig();
      if (data?.sections?.length) {
        setSections([...data.sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      } else {
        setSections(DEFAULT_HOMEPAGE_SECTIONS);
      }
    } catch (e) {
      console.error(e);
      showError('Error al cargar configuración');
      setSections(DEFAULT_HOMEPAGE_SECTIONS);
    } finally {
      setLoading(false);
    }
  };

  const updateSection = (id: string, updates: Partial<HomepageSectionConfig>) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const updateSectionConfig = (id: string, configUpdates: Record<string, unknown>) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, config: { ...(s.config ?? {}), ...configUpdates } } : s
      )
    );
  };

  const updateSeccionesItem = (index: number, field: string, value: string) => {
    const sec = sections.find((s) => s.id === 'secciones');
    const items = Array.isArray(sec?.config?.items) ? [...(sec.config.items as Record<string, string>[])] : [];
    if (!items[index]) return;
    items[index] = { ...items[index], [field]: value };
    updateSectionConfig('secciones', { items });
  };

  const addSeccionesItem = () => {
    const sec = sections.find((s) => s.id === 'secciones');
    const items = Array.isArray(sec?.config?.items) ? [...(sec.config.items as Record<string, string>[])] : [];
    items.push({ titulo: '', descripcion: '', enlace: '', icono: '' });
    updateSectionConfig('secciones', { items });
  };

  const removeSeccionesItem = (index: number) => {
    const sec = sections.find((s) => s.id === 'secciones');
    const items = Array.isArray(sec?.config?.items) ? [...(sec.config.items as Record<string, string>[])] : [];
    items.splice(index, 1);
    updateSectionConfig('secciones', { items });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = sections.map((s, i) => ({
        id: s.id,
        enabled: s.enabled ?? true,
        order: i,
        config: s.config ?? {},
      }));
      await updateHomepageConfig({ sections: payload });
      showSuccess('Configuración guardada correctamente.');
    } catch (e: any) {
      showError(e?.message ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageSelect = (url: string) => {
    if (!imageModalFor) return;
    if (imageModalFor.appendToArray && imageModalFor.field === 'imageUrls') {
      const sec = sections.find((s) => s.id === imageModalFor.sectionId);
      const current = (sec?.config?.imageUrls as string[] | undefined) ?? [];
      updateSectionConfig(imageModalFor.sectionId, { imageUrls: [...current, url] });
    } else {
      updateSectionConfig(imageModalFor.sectionId, { [imageModalFor.field]: url });
    }
    setImageModalFor(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      <div className="space-y-2">
        {sections.map((section) => (
          <div
            key={section.id}
            className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
          >
            <button
              type="button"
              onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="font-medium">{SECTION_LABELS[section.id] ?? section.id}</span>
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={section.enabled !== false}
                  onChange={(e) => updateSection(section.id, { enabled: e.target.checked })}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded"
                />
                <span className="text-sm text-gray-500">
                  {openSection === section.id ? '▼' : '▶'}
                </span>
              </span>
            </button>
            {openSection === section.id && (
              <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
                {section.id === 'hero' && (
                  <HeroFields
                    config={section.config ?? {}}
                    onUpdate={(c) => updateSectionConfig('hero', c)}
                    onOpenImageModal={(field, appendToArray) => setImageModalFor({ sectionId: 'hero', field, appendToArray })}
                  />
                )}
                {section.id === 'intro' && (
                  <IntroFields
                    config={section.config ?? {}}
                    onUpdate={(c) => updateSectionConfig('intro', c)}
                    onOpenImageModal={(field) => setImageModalFor({ sectionId: 'intro', field })}
                  />
                )}
                {section.id === 'secciones' && (
                  <SeccionesFields
                    config={section.config ?? {}}
                    onUpdate={(c) => updateSectionConfig('secciones', c)}
                    items={Array.isArray(section.config?.items) ? (section.config.items as Record<string, string>[]) : []}
                    onUpdateItem={updateSeccionesItem}
                    onAddItem={addSeccionesItem}
                    onRemoveItem={removeSeccionesItem}
                  />
                )}
                {section.id === 'gallery-preview' && (
                  <GalleryPreviewFields
                    config={section.config ?? {}}
                    onUpdate={(c) => updateSectionConfig('gallery-preview', c)}
                  />
                )}
                {section.id === 'ultimos-posts' && (
                  <UltimosPostsFields
                    config={section.config ?? {}}
                    onUpdate={(c) => updateSectionConfig('ultimos-posts', c)}
                  />
                )}
                {(section.id === 'now-listening' || section.id === 'actividad-reciente') && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Muestra la canción actual de Spotify, el último libro leído y el último álbum. No requiere configuración manual.
                  </p>
                )}
                {section.id === 'now-footer' && (
                  <NowFooterFields
                    config={section.config ?? {}}
                    onUpdate={(c) => updateSectionConfig('now-footer', c)}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {imageModalFor && (
        <ImageLibraryModal
          isOpen={true}
          onClose={() => setImageModalFor(null)}
          onSelect={handleImageSelect}
          allowUpload={true}
        />
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      )}
    </div>
  );
}

function heroImageUrl(url: string): string {
  if (!url) return '';
  return getOptimizedImageUrl(url.startsWith('/') ? url : `/${url}`, 400);
}

function HeroFields({
  config,
  onUpdate,
  onOpenImageModal,
}: {
  config: Record<string, unknown>;
  onUpdate: (c: Record<string, unknown>) => void;
  onOpenImageModal: (field: string, appendToArray?: boolean) => void;
}) {
  const imageUrls = (Array.isArray(config.imageUrls) ? config.imageUrls : []) as string[];

  const removeImage = (index: number) => {
    const next = imageUrls.filter((_, i) => i !== index);
    onUpdate({ ...config, imageUrls: next });
  };

  const moveImage = (index: number, dir: number) => {
    const next = [...imageUrls];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    onUpdate({ ...config, imageUrls: next });
  };

  return (
    <div>
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Imágenes del carrusel (orden = orden en el carrusel)
        </label>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Si no hay ninguna, se usará la imagen por defecto. Añade varias para un carrusel automático.
        </p>
        <div className="flex flex-wrap gap-3">
          {imageUrls.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="group relative flex flex-col items-center rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-50 dark:bg-gray-700"
            >
              <div className="relative h-24 w-28 overflow-hidden">
                <img
                  src={heroImageUrl(url)}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.onerror = null;
                  img.src = '/default-avatar.svg';
                }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveImage(index, -1)}
                    disabled={index === 0}
                    className="rounded bg-white/90 p-1.5 text-gray-800 disabled:opacity-40"
                    title="Mover antes"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="rounded bg-red-500 p-1.5 text-white"
                    title="Quitar"
                  >
                    ✕
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(index, 1)}
                    disabled={index === imageUrls.length - 1}
                    className="rounded bg-white/90 p-1.5 text-gray-800 disabled:opacity-40"
                    title="Mover después"
                  >
                    →
                  </button>
                </div>
              </div>
              <span className="text-xs text-gray-500 py-1">{index + 1}</span>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onOpenImageModal('imageUrls', true)}
            className="flex h-24 w-28 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition"
          >
            <span className="text-2xl">+</span>
            <span className="text-xs mt-1">Añadir imagen</span>
          </button>
        </div>
      </div>
      <Field
        label="Eyebrow (texto sobre el título, dejar vacío para ocultar)"
        value={(config.eyebrow as string) ?? ''}
        onChange={(v) => onUpdate({ ...config, eyebrow: v })}
      />
      <Field
        label="Título"
        value={(config.title as string) ?? ''}
        onChange={(v) => onUpdate({ ...config, title: v })}
      />
      <Field
        label="Subtítulo"
        value={(config.subtitle as string) ?? ''}
        onChange={(v) => onUpdate({ ...config, subtitle: v })}
        textarea
      />
      <Field
        label="Texto del botón"
        value={(config.ctaText as string) ?? ''}
        onChange={(v) => onUpdate({ ...config, ctaText: v })}
      />
      <Field
        label="Enlace del botón"
        value={(config.ctaHref as string) ?? ''}
        onChange={(v) => onUpdate({ ...config, ctaHref: v })}
      />
      <div className="mb-3">
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Altura del hero (vh)
        </label>
        <input
          type="number"
          min={30}
          max={100}
          step={5}
          value={typeof config.heightVh === 'number' ? config.heightVh : 70}
          onChange={(e) => onUpdate({ ...config, heightVh: Math.max(30, Math.min(100, parseInt(e.target.value, 10) || 70)) })}
          className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Altura del bloque en % del viewport (30–100). Por defecto 70.
        </p>
      </div>
      <div className="mb-3">
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Intervalo del carrusel (segundos)
        </label>
        <input
          type="number"
          min={2}
          max={30}
          step={0.5}
          value={typeof config.carouselIntervalSeconds === 'number' ? config.carouselIntervalSeconds : 5.5}
          onChange={(e) => onUpdate({ ...config, carouselIntervalSeconds: parseFloat(e.target.value) || 5.5 })}
          className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Tiempo entre cada imagen (2–30 s). Solo aplica si hay más de una imagen.
        </p>
      </div>
    </div>
  );
}

function IntroFields({
  config,
  onUpdate,
  onOpenImageModal,
}: {
  config: Record<string, unknown>;
  onUpdate: (c: Record<string, unknown>) => void;
  onOpenImageModal: (field: string) => void;
}) {
  return (
    <div>
      <Field
        label="Título"
        value={(config.title as string) ?? ''}
        onChange={(v) => onUpdate({ ...config, title: v })}
      />
      <Field
        label="Bio / descripción"
        value={(config.bio as string) ?? ''}
        onChange={(v) => onUpdate({ ...config, bio: v })}
        textarea
      />
      <Field
        label="Avatar (URL)"
        value={(config.avatarUrl as string) ?? ''}
        onChange={(v) => onUpdate({ ...config, avatarUrl: v })}
      />
      <button
        type="button"
        onClick={() => onOpenImageModal('avatarUrl')}
        className="mb-3 text-sm text-indigo-600 hover:underline"
      >
        Seleccionar de la biblioteca
      </button>
      <Field
        label="Texto del botón"
        value={(config.ctaText as string) ?? ''}
        onChange={(v) => onUpdate({ ...config, ctaText: v })}
      />
      <Field
        label="Enlace del botón"
        value={(config.ctaHref as string) ?? ''}
        onChange={(v) => onUpdate({ ...config, ctaHref: v })}
      />
    </div>
  );
}

function SeccionesFields({
  config,
  onUpdate,
  items,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
}: {
  config: Record<string, unknown>;
  onUpdate: (c: Record<string, unknown>) => void;
  items: Record<string, string>[];
  onUpdateItem: (index: number, field: string, value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
}) {
  return (
    <div>
      <Field
        label="Título de sección"
        value={(config.title as string) ?? ''}
        onChange={(v) => onUpdate({ ...config, title: v })}
      />
      <Field
        label="Subtítulo"
        value={(config.subtitle as string) ?? ''}
        onChange={(v) => onUpdate({ ...config, subtitle: v })}
      />
      <div className="mt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Items del grid</span>
          <button
            type="button"
            onClick={onAddItem}
            className="text-sm text-indigo-600 hover:underline"
          >
            + Añadir item
          </button>
        </div>
        {items.map((item, index) => (
          <div
            key={index}
            className="mb-3 rounded border border-gray-200 p-3 dark:border-gray-600"
          >
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => onRemoveItem(index)}
                className="text-sm text-red-600 hover:underline"
              >
                Eliminar
              </button>
            </div>
            <Field
              label="Título"
              value={item.titulo ?? ''}
              onChange={(v) => onUpdateItem(index, 'titulo', v)}
            />
            <Field
              label="Descripción"
              value={item.descripcion ?? ''}
              onChange={(v) => onUpdateItem(index, 'descripcion', v)}
            />
            <Field
              label="Enlace"
              value={item.enlace ?? ''}
              onChange={(v) => onUpdateItem(index, 'enlace', v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function GalleryPreviewFields({
  config,
  onUpdate,
}: {
  config: Record<string, unknown>;
  onUpdate: (c: Record<string, unknown>) => void;
}) {
  return (
    <div>
      <Field
        label="Título"
        value={(config.title as string) ?? ''}
        onChange={(v) => onUpdate({ ...config, title: v })}
      />
      <Field
        label="Texto del botón"
        value={(config.ctaText as string) ?? ''}
        onChange={(v) => onUpdate({ ...config, ctaText: v })}
      />
      <Field
        label="Enlace del botón"
        value={(config.ctaHref as string) ?? ''}
        onChange={(v) => onUpdate({ ...config, ctaHref: v })}
      />
    </div>
  );
}

function NowFooterFields({
  config,
  onUpdate,
}: {
  config: Record<string, unknown>;
  onUpdate: (c: Record<string, unknown>) => void;
}) {
  const items = (Array.isArray(config.thisWeek) ? config.thisWeek : []) as string[];

  const updateItem = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onUpdate({ ...config, thisWeek: next });
  };

  const addItem = () => onUpdate({ ...config, thisWeek: [...items, ''] });

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onUpdate({ ...config, thisWeek: next });
  };

  return (
    <div>
      <Field
        label="Email de contacto"
        value={(config.email as string) ?? ''}
        onChange={(v) => onUpdate({ ...config, email: v })}
      />
      <div className="mt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Lista "Esta semana"
          </span>
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-indigo-600 hover:underline"
          >
            + Añadir ítem
          </button>
        </div>
        {items.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            Sin ítems — se usarán los valores por defecto.
          </p>
        )}
        {items.map((item, index) => (
          <div key={index} className="mb-2 flex items-center gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={`Ítem ${index + 1}`}
              className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="text-sm text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function UltimosPostsFields({
  config,
  onUpdate,
}: {
  config: Record<string, unknown>;
  onUpdate: (c: Record<string, unknown>) => void;
}) {
  return (
    <div>
      <Field
        label="Título"
        value={(config.title as string) ?? ''}
        onChange={(v) => onUpdate({ ...config, title: v })}
      />
      <Field
        label="Subtítulo"
        value={(config.subtitle as string) ?? ''}
        onChange={(v) => onUpdate({ ...config, subtitle: v })}
      />
      <div className="mb-3">
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Cantidad de posts
        </label>
        <input
          type="number"
          min={1}
          max={12}
          value={typeof config.limit === 'number' ? config.limit : 3}
          onChange={(e) => onUpdate({ ...config, limit: parseInt(e.target.value, 10) || 3 })}
          className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>
      <Field
        label="Texto del enlace"
        value={(config.ctaText as string) ?? ''}
        onChange={(v) => onUpdate({ ...config, ctaText: v })}
      />
      <Field
        label="Enlace"
        value={(config.ctaHref as string) ?? ''}
        onChange={(v) => onUpdate({ ...config, ctaHref: v })}
      />
    </div>
  );
}
