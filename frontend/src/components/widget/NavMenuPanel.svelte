<script lang="ts">
  import Icon from '@iconify/svelte';
  import { url } from '../../utils/url-utils';
  import type { NavBarLink } from '../../types/config';

  export let links: NavBarLink[] = [];
  let expanded: Set<string> = new Set();

  function toggle(id: string) {
    expanded = new Set(expanded);
    if (expanded.has(id)) {
      expanded.delete(id);
    } else {
      expanded.add(id);
    }
  }

  function linkHref(link: NavBarLink): string {
    return link.external ? link.url : url(link.url || '#');
  }

  function linkId(link: NavBarLink, idx: number): string {
    return `nav-${idx}-${link.name}-${link.url}`;
  }
</script>

<div
  id="nav-menu-panel"
  class="float-panel float-panel-closed fixed right-4 top-14 transition-all px-2 py-2"
>
  {#each links as link, i (link.name + link.url)}
    {#if link.children && link.children.length > 0}
      {@const id = linkId(link, i)}
      <div class="py-1">
        <button
          type="button"
          class="group flex w-full justify-between items-center py-2 pl-3 pr-1 rounded-lg gap-8
            hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)] transition
            text-left font-bold text-black/75 dark:text-white/75"
          onclick={() => toggle(id)}
          aria-expanded={expanded.has(id)}
          aria-controls={id}
        >
          <span class="group-hover:text-[var(--primary)] group-active:text-[var(--primary)]">
            {link.name}
          </span>
          <Icon
            icon="material-symbols:expand-more-rounded"
            class="transition text-[1.25rem] text-[var(--primary)] {expanded.has(id) ? 'rotate-180' : ''}"
          />
        </button>
        <div
          id={id}
          class="overflow-hidden transition-all pl-3 border-l-2 border-[var(--primary)]/30 ml-2"
          class:max-h-0={!expanded.has(id)}
          class:max-h-[500px]={expanded.has(id)}
        >
          {#each link.children as child, ci}
            {#if child.children && child.children.length > 0}
              {@const childId = `nav-${i}-${ci}-${child.name}-${child.url}`}
              <div class="py-0.5">
                <button
                  type="button"
                  class="group flex w-full justify-between items-center py-1.5 pl-2 pr-1 rounded-lg gap-4
                    hover:bg-[var(--btn-plain-bg-hover)] text-left text-sm font-medium text-black/70 dark:text-white/70"
                  onclick={() => toggle(childId)}
                >
                  <span>{child.name}</span>
                  <Icon
                    icon="material-symbols:expand-more-rounded"
                    class="text-[1rem] {expanded.has(childId) ? 'rotate-180' : ''}"
                  />
                </button>
                <div
                  class="overflow-hidden pl-2 ml-1 border-l border-[var(--primary)]/20"
                  class:max-h-0={!expanded.has(childId)}
                  class:max-h-[300px]={expanded.has(childId)}
                >
                  {#each child.children as sub}
                    <a
                      href={sub.external ? sub.url : url(sub.url || '#')}
                      target={sub.openInNewTab ? '_blank' : undefined}
                      class="flex justify-between items-center py-1.5 pl-2 rounded-lg text-sm
                        hover:bg-[var(--btn-plain-bg-hover)] text-black/70 dark:text-white/70"
                    >
                      {sub.name}
                      {#if sub.external}<Icon icon="fa6-solid:arrow-up-right-from-square" class="text-[0.65rem]" />{/if}
                    </a>
                  {/each}
                </div>
              </div>
            {:else}
              <a
                href={linkHref(child)}
                target={child.openInNewTab ? '_blank' : undefined}
                class="flex justify-between items-center py-1.5 pl-2 rounded-lg text-sm
                  hover:bg-[var(--btn-plain-bg-hover)] group"
              >
                <span class="text-black/70 dark:text-white/70 group-hover:text-[var(--primary)]">{child.name}</span>
                {#if child.external}<Icon icon="fa6-solid:arrow-up-right-from-square" class="text-[0.65rem]" />{/if}
              </a>
            {/if}
          {/each}
        </div>
      </div>
    {:else}
      <a
        href={linkHref(link)}
        target={link.openInNewTab ? '_blank' : undefined}
        class="group flex justify-between items-center py-2 pl-3 pr-1 rounded-lg gap-8
          hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)] transition"
      >
        <div class="transition text-black/75 dark:text-white/75 font-bold group-hover:text-[var(--primary)] group-active:text-[var(--primary)]">
          {link.name}
        </div>
        {#if !link.external}
          <Icon icon="material-symbols:chevron-right-rounded" class="transition text-[1.25rem] text-[var(--primary)]" />
        {:else}
          <Icon icon="fa6-solid:arrow-up-right-from-square" class="transition text-[0.75rem] text-black/25 dark:text-white/25 -translate-x-1" />
        {/if}
      </a>
    {/if}
  {/each}
</div>
