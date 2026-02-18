import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { fetchNavbarConfig } from '../../lib/api-navbar';
import { updateNavbarConfig, type NavBarLink } from '../../lib/admin-api';
import { discoverPages } from '../../lib/discover-pages';
import { navBarConfig } from '../../config';
import { LinkPresets } from '../../constants/link-presets';
import { i18n } from '../../i18n/translation';
import I18nKey from '../../i18n/i18nKey';
import { showSuccess, showError } from '@/lib/notifications';

function resolveFallbackLinks(): NavBarLink[] {
  return navBarConfig.links.map((item: NavBarLink | number): NavBarLink => {
    if (typeof item === 'number') {
      return LinkPresets[item as keyof typeof LinkPresets];
    }
    return item;
  });
}

export function NavbarEditor() {
  const [links, setLinks] = useState<NavBarLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [showAddExternal, setShowAddExternal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customExternal, setCustomExternal] = useState(true);
  const [customOpenNewTab, setCustomOpenNewTab] = useState(false);

  const availablePages = discoverPages();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await fetchNavbarConfig();
      if (data?.links?.length) {
        setLinks(data.links);
      } else {
        setLinks(resolveFallbackLinks());
      }
    } catch (e) {
      console.error(e);
      showError('Error al cargar configuración');
      setLinks(resolveFallbackLinks());
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeStr = String(active.id);
    const overStr = String(over.id);

    // Child item: "item-P-cC" (parent index P, child index C)
    const childMatch = (s: string) => {
      const m = s.match(/^item-(\d+)-c(\d+)$/);
      return m ? { parentIdx: Number(m[1]), childIdx: Number(m[2]) } : null;
    };
    const topMatch = (s: string) => {
      const m = s.match(/^item-(\d+)$/);
      return m ? Number(m[1]) : null;
    };

    const activeChild = childMatch(activeStr);
    const overChild = childMatch(overStr);
    const activeTop = topMatch(activeStr);
    const overTop = topMatch(overStr);

    if (activeChild && overChild && activeChild.parentIdx === overChild.parentIdx) {
      // Reorder children within same parent
      setLinks((prev) => {
        const parentIdx = activeChild.parentIdx;
        if (parentIdx < 0 || parentIdx >= prev.length) return prev;
        const children = prev[parentIdx].children ?? [];
        if (activeChild.childIdx >= children.length || overChild.childIdx >= children.length)
          return prev;
        const newChildren = arrayMove(
          children,
          activeChild.childIdx,
          overChild.childIdx,
        );
        return prev.map((l, i) =>
          i === parentIdx ? { ...l, children: newChildren } : l,
        );
      });
    } else if (activeChild && overTop !== null) {
      // Child dropped on top-level item: PROMOTE (sacarlo) - move to top-level
      setLinks((prev) => {
        const srcParentIdx = activeChild.parentIdx;
        if (
          srcParentIdx < 0 || srcParentIdx >= prev.length ||
          overTop < 0 || overTop >= prev.length ||
          activeChild.childIdx >= (prev[srcParentIdx].children ?? []).length
        )
          return prev;
        const srcChildren = [...(prev[srcParentIdx].children ?? [])];
        const [moved] = srcChildren.splice(activeChild.childIdx, 1);
        if (!moved) return prev;
        const withoutChild = prev.map((l, i) =>
          i === srcParentIdx ? { ...l, children: srcChildren.length ? srcChildren : undefined } : l,
        );
        return [
          ...withoutChild.slice(0, overTop),
          moved,
          ...withoutChild.slice(overTop),
        ];
      });
    } else if (activeChild && overChild && activeChild.parentIdx !== overChild.parentIdx) {
      // Child dropped on child of different parent: move to that parent
      setLinks((prev) => {
        const srcParentIdx = activeChild.parentIdx;
        const dstParentIdx = overChild.parentIdx;
        if (
          srcParentIdx < 0 || srcParentIdx >= prev.length ||
          dstParentIdx < 0 || dstParentIdx >= prev.length
        )
          return prev;
        const srcChildren = [...(prev[srcParentIdx].children ?? [])];
        const [moved] = srcChildren.splice(activeChild.childIdx, 1);
        const dstChildren = [...(prev[dstParentIdx].children ?? [])];
        dstChildren.splice(overChild.childIdx + 1, 0, moved);
        return prev.map((l, i) => {
          if (i === srcParentIdx) return { ...l, children: srcChildren.length ? srcChildren : undefined };
          if (i === dstParentIdx) return { ...l, children: dstChildren };
          return l;
        });
      });
    } else if (activeTop !== null && overTop !== null && activeTop !== overTop) {
      // Top-level dropped on another top-level: NEST (create submenu)
      setLinks((prev) => {
        if (
          activeTop < 0 ||
          activeTop >= prev.length ||
          overTop < 0 ||
          overTop >= prev.length
        )
          return prev;
        const moved = prev[activeTop];
        const droppedOn = prev[overTop];
        const withoutMoved = prev.filter((_, i) => i !== activeTop);
        return withoutMoved.map((l) =>
          l === droppedOn
            ? { ...l, children: [...(l.children ?? []), moved] }
            : l,
        );
      });
    } else if (activeTop !== null && overTop !== null) {
      // Same-level reorder
      setLinks((prev) => {
        if (
          activeTop < 0 ||
          activeTop >= prev.length ||
          overTop < 0 ||
          overTop >= prev.length
        )
          return prev;
        return arrayMove(prev, activeTop, overTop);
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNavbarConfig({ links });
      showSuccess('Navbar guardado correctamente.');
    } catch (e: unknown) {
      showError((e as { message?: string })?.message ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const addLink = (link: NavBarLink) => {
    setLinks((prev) => [...prev, link]);
  };

  const addExternalLink = () => {
    if (!customName.trim() || !customUrl.trim()) return;
    addLink({
      name: customName.trim(),
      url: customUrl.trim(),
      external: customExternal,
      openInNewTab: customOpenNewTab,
    });
    setCustomName('');
    setCustomUrl('');
    setShowAddExternal(false);
  };

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLink = (index: number, updates: Partial<NavBarLink>) => {
    setLinks((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...updates } : l)),
    );
  };

  const addSubmenu = (index: number) => {
    setLinks((prev) =>
      prev.map((l, i) =>
        i === index ? { ...l, children: [...(l.children ?? [])] } : l,
      ),
    );
  };

  const updateChild = (
    parentIndex: number,
    childIndex: number,
    updates: Partial<NavBarLink>,
  ) => {
    setLinks((prev) =>
      prev.map((l, i) => {
        if (i !== parentIndex) return l;
        const children = [...(l.children ?? [])];
        if (!children[childIndex]) return l;
        children[childIndex] = { ...children[childIndex], ...updates };
        return { ...l, children };
      }),
    );
  };

  const removeChild = (parentIndex: number, childIndex: number) => {
    setLinks((prev) =>
      prev.map((l, i) => {
        if (i !== parentIndex) return l;
        const children = (l.children ?? []).filter((_, ci) => ci !== childIndex);
        return { ...l, children };
      }),
    );
  };

  const addChildLink = (parentIndex: number, child: NavBarLink) => {
    setLinks((prev) =>
      prev.map((l, i) =>
        i === parentIndex
          ? { ...l, children: [...(l.children ?? []), child] }
          : l,
      ),
    );
  };

  const promoteChild = (parentIndex: number, childIndex: number) => {
    setLinks((prev) => {
      const children = [...(prev[parentIndex].children ?? [])];
      const [moved] = children.splice(childIndex, 1);
      if (!moved) return prev;
      const newLinks = prev.map((l, i) =>
        i === parentIndex
          ? { ...l, children: children.length ? children : undefined }
          : l,
      );
      const insertIdx = Math.min(parentIndex + 1, newLinks.length);
      return [
        ...newLinks.slice(0, insertIdx),
        moved,
        ...newLinks.slice(insertIdx),
      ];
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Panel: Añadir enlaces */}
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="font-medium text-gray-900 dark:text-white">
            Añadir enlace
          </h3>
          <div className="space-y-2">
            {availablePages.map((p) => (
              <button
                key={p.path}
                type="button"
                onClick={() =>
                  addLink({
                    name: p.i18nKey ? i18n(p.i18nKey) : p.suggestedName,
                    url: p.path,
                  })
                }
                className="flex w-full items-center justify-between rounded border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <span>{p.i18nKey ? i18n(p.i18nKey) : p.suggestedName}</span>
                <span className="text-xs text-gray-500">{p.path}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowAddExternal(true)}
              className="flex w-full items-center rounded border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              + Enlace externo
            </button>
          </div>

          {showAddExternal && (
            <div className="mt-4 space-y-2 rounded border border-gray-200 p-3 dark:border-gray-600">
              <input
                type="text"
                placeholder="Nombre"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <input
                type="url"
                placeholder="URL"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={customExternal}
                  onChange={(e) => setCustomExternal(e.target.checked)}
                />
                Externo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={customOpenNewTab}
                  onChange={(e) => setCustomOpenNewTab(e.target.checked)}
                />
                Abrir en nueva pestaña
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addExternalLink}
                  className="rounded bg-indigo-600 px-3 py-1 text-sm text-white"
                >
                  Añadir
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddExternal(false)}
                  className="rounded border px-3 py-1 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lista ordenable de enlaces */}
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 lg:col-span-2 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="font-medium text-gray-900 dark:text-white">
            Enlaces del navbar
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Arrastra desde cualquier parte del ítem. Suelta sobre otro para submenú, o sobre uno principal para sacarlo.
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={links.flatMap((l, pi) => [
                `item-${pi}`,
                ...(l.children ?? []).map((_, ci) => `item-${pi}-c${ci}`),
              ])}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {links.map((link, index) => (
                  <SortableLinkItem
                    key={`item-${index}`}
                    id={`item-${index}`}
                    link={link}
                    index={index}
                    isEditing={editingId === `item-${index}`}
                    onEdit={() => setEditingId(`item-${index}`)}
                    onDoneEdit={() => setEditingId(null)}
                    onUpdate={(u) => updateLink(index, u)}
                    onRemove={() => removeLink(index)}
                    onAddSubmenu={() => addSubmenu(index)}
                    onUpdateChild={(ci, u) => updateChild(index, ci, u)}
                    onRemoveChild={(ci) => removeChild(index, ci)}
                    onPromoteChild={(ci) => promoteChild(index, ci)}
                    onAddChild={(c) => addChildLink(index, c)}
                    editingChildId={editingChildId}
                    setEditingChildId={setEditingChildId}
                    availablePages={availablePages}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}

function SortableLinkItem({
  id,
  link,
  index,
  isEditing,
  onEdit,
  onDoneEdit,
  onUpdate,
  onRemove,
  onAddSubmenu,
  onUpdateChild,
  onRemoveChild,
  onPromoteChild,
  onAddChild,
  editingChildId,
  setEditingChildId,
  availablePages,
}: {
  id: string;
  link: NavBarLink;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onDoneEdit: () => void;
  onUpdate: (u: Partial<NavBarLink>) => void;
  onRemove: () => void;
  onAddSubmenu: () => void;
  onUpdateChild: (ci: number, u: Partial<NavBarLink>) => void;
  onRemoveChild: (ci: number) => void;
  onPromoteChild: (ci: number) => void;
  onAddChild: (c: NavBarLink) => void;
  editingChildId: string | null;
  setEditingChildId: (id: string | null) => void;
  availablePages: Array<{ path: string; i18nKey: I18nKey | null; suggestedName: string }>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const stopDrag = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border dark:border-gray-600 ${
        isDragging
          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-gray-700'
          : 'border-gray-200 bg-white dark:bg-gray-800'
      }`}
    >
      <div
        className="flex cursor-grab items-center gap-2 p-3 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <svg className="h-5 w-5 flex-shrink-0 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path d="M7 2a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2h2zm6 0a2 2 0 012 2v12a2 2 0 01-2 2h-2a2 2 0 01-2-2V4a2 2 0 012-2h2z" />
        </svg>
        {isEditing ? (
          <div className="flex-1" onPointerDown={stopDrag}>
            <LinkEditForm
              link={link}
              onSave={(u) => {
                onUpdate(u);
                onDoneEdit();
              }}
              onCancel={onDoneEdit}
            />
          </div>
        ) : (
          <>
            <div className="flex-1">
              <span className="font-medium">{link.name}</span>
              <span className="ml-2 text-xs text-gray-500">
                {link.url || '(dropdown)'}
                {link.external && ' [ext]'}
              </span>
            </div>
            <div className="flex flex-1 justify-end gap-1" onPointerDown={stopDrag}>
              <button
                type="button"
                onClick={onEdit}
                className="rounded px-2 py-1 text-sm text-indigo-600 hover:bg-indigo-50"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={onAddSubmenu}
                className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
              >
                Submenú
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
              >
                Eliminar
              </button>
            </div>
          </>
        )}
      </div>
      {Array.isArray(link.children) && (
        <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-600">
          <p className="mb-2 text-xs font-medium text-gray-500">
            Sub-items (arrastra para reordenar)
          </p>
          <div className="space-y-2 pl-4">
            {link.children.map((child, ci) => (
              <SortableChildItem
                key={`item-${index}-c${ci}`}
                id={`item-${index}-c${ci}`}
                child={child}
                isEditing={editingChildId === `item-${index}-c${ci}`}
                onEdit={() => setEditingChildId(`item-${index}-c${ci}`)}
                onDoneEdit={() => setEditingChildId(null)}
                onUpdate={(u) => onUpdateChild(ci, u)}
                onRemove={() => onRemoveChild(ci)}
                onPromote={() => onPromoteChild(ci)}
              />
            ))}
            <select
              className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700"
              onChange={(e) => {
                const val = e.target.value;
                e.target.value = '';
                if (!val) return;
                const p = availablePages.find((x) => x.path === val);
                if (p) {
                  onAddChild({
                    name: p.i18nKey ? i18n(p.i18nKey) : p.suggestedName,
                    url: p.path,
                  });
                }
              }}
            >
              <option value="">+ Añadir sub-item</option>
              {availablePages.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.i18nKey ? i18n(p.i18nKey) : p.suggestedName}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableChildItem({
  id,
  child,
  isEditing,
  onEdit,
  onDoneEdit,
  onUpdate,
  onRemove,
  onPromote,
}: {
  id: string;
  child: NavBarLink;
  isEditing: boolean;
  onEdit: () => void;
  onDoneEdit: () => void;
  onUpdate: (u: Partial<NavBarLink>) => void;
  onRemove: () => void;
  onPromote: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const stopDrag = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex cursor-grab items-center gap-2 rounded py-1.5 pl-2 active:cursor-grabbing ${
        isDragging
          ? 'bg-indigo-100/50 dark:bg-gray-600'
          : 'bg-gray-50 dark:bg-gray-700/50'
      }`}
      {...attributes}
      {...listeners}
    >
      <svg className="h-4 w-4 flex-shrink-0 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
        <path d="M7 2a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2h2zm6 0a2 2 0 012 2v12a2 2 0 01-2 2h-2a2 2 0 01-2-2V4a2 2 0 012-2h2z" />
      </svg>
      {isEditing ? (
        <div className="flex-1" onPointerDown={stopDrag}>
          <LinkEditForm
            link={child}
            onSave={(u) => {
              onUpdate(u);
              onDoneEdit();
            }}
            onCancel={onDoneEdit}
          />
        </div>
      ) : (
        <>
          <span className="flex-1 text-sm">{child.name}</span>
          <div className="flex gap-1" onPointerDown={stopDrag}>
            <button
              type="button"
              onClick={onEdit}
              className="rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={onPromote}
              className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
              title="Sacar a nivel principal"
            >
              Sacar
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="text-xs text-red-600 hover:underline"
            >
              Quitar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function LinkEditForm({
  link,
  onSave,
  onCancel,
}: {
  link: NavBarLink;
  onSave: (u: Partial<NavBarLink>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(link.name);
  const [url, setUrl] = useState(link.url);
  const [external, setExternal] = useState(link.external ?? false);
  const [openInNewTab, setOpenInNewTab] = useState(link.openInNewTab ?? false);

  return (
    <div className="flex flex-1 flex-wrap items-center gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre"
        className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
      />
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="URL"
        className="w-32 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
      />
      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={external}
          onChange={(e) => setExternal(e.target.checked)}
        />
        Externo
      </label>
      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={openInNewTab}
          onChange={(e) => setOpenInNewTab(e.target.checked)}
        />
        Nueva pestaña
      </label>
      <button
        type="button"
        onClick={() => onSave({ name, url, external, openInNewTab })}
        className="rounded bg-indigo-600 px-2 py-1 text-xs text-white"
      >
        OK
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded border px-2 py-1 text-xs"
      >
        Cancelar
      </button>
    </div>
  );
}
