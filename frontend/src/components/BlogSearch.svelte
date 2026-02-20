<script lang="ts">
import { onMount } from 'svelte'
import { getPostUrlBySlug } from '@utils/url-utils.ts'
import { i18n } from '@i18n/translation'
import I18nKey from '@i18n/i18nKey'
import { fetchPosts } from '@utils/api-blog'

// IDs únicos para este componente
const searchId = `blog-search-${Math.random().toString(36).substr(2, 9)}`
const searchBarId = `${searchId}-bar`
const searchPanelId = `${searchId}-panel`
const searchSwitchId = `${searchId}-switch`

let keywordDesktop = ''
let keywordMobile = ''
let result: Array<{ url: string; meta: { title: string }; excerpt: string }> = []

let search = async (keyword: string, isDesktop: boolean) => {
  let panel = document.getElementById(searchPanelId)
  if (!panel) return

  if (!keyword && isDesktop) {
    panel.classList.add('float-panel-closed')
    result = []
    return
  }

  let arr = []
  if (keyword) {
    try {
      const res = await fetchPosts({ search: keyword, limit: 10, draft: false })
      const list = res.posts || res.docs || res
      arr = list.map((post: any) => ({
        url: getPostUrlBySlug(post.slug),
        meta: { title: post.title },
        excerpt: post.description || '',
      }))
    } catch (e) {
      console.error('Error searching posts:', e)
      arr = []
    }
  }

  if (!arr.length && isDesktop) {
    panel.classList.add('float-panel-closed')
    result = []
    return
  }

  if (isDesktop) {
    panel.classList.remove('float-panel-closed')
  }
  result = arr
}

const togglePanel = () => {
  let panel = document.getElementById(searchPanelId)
  panel?.classList.toggle('float-panel-closed')
}

$: search(keywordDesktop, true)
$: search(keywordMobile, false)
</script>

<!-- search bar for desktop view -->
<div id={searchBarId} class="flex transition-all items-center h-11 rounded-lg w-full relative
      bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
">
    <svg class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
    </svg>
    <input 
        placeholder={i18n(I18nKey.search)} 
        bind:value={keywordDesktop} 
        on:focus={() => search(keywordDesktop, true)}
        class="transition-all pl-10 text-sm bg-transparent outline-0
         h-full w-full text-black/50 dark:text-white/50"
    >
</div>

<!-- toggle btn for phone/tablet view -->
<button 
    on:click={togglePanel} 
    aria-label="Search Panel" 
    id={searchSwitchId}
    class="btn-plain scale-animation lg:hidden rounded-lg w-11 h-11 active:scale-90"
>
    <svg class="text-[1.25rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
    </svg>
</button>

<!-- search panel -->
<div 
    id={searchPanelId} 
    class="float-panel float-panel-closed search-panel absolute md:w-[30rem]
    top-20 left-4 md:left-[unset] right-4 shadow-2xl rounded-2xl p-2"
>
    <!-- search bar inside panel for phone/tablet -->
    <div class="flex relative lg:hidden transition-all items-center h-11 rounded-xl
      bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
    ">
        <svg class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <input 
            placeholder={i18n(I18nKey.search)} 
            bind:value={keywordMobile}
            class="pl-10 absolute inset-0 text-sm bg-transparent outline-0
               text-black/50 dark:text-white/50"
        >
    </div>

    <!-- search results -->
    {#each result as item}
        <a 
            href={item.url} 
            on:click={togglePanel}
            class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block
       rounded-xl text-lg px-3 py-2 hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)]"
        >
            <div class="transition text-90 inline-flex font-bold group-hover:text-[var(--primary)] items-center gap-1">
                {item.meta.title}
                <svg class="transition text-[0.75rem] translate-x-0.5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            </div>
            <div class="transition text-sm text-50">
                {@html item.excerpt}
            </div>
        </a>
    {/each}
</div>

<style>
  input:focus {
    outline: 0;
  }
</style>

