<script lang="ts">
import type { LIGHT_DARK_MODE } from '@/types/config.ts'
import { AUTO_MODE, DARK_MODE, LIGHT_MODE } from '@constants/constants.ts'
import I18nKey from '@i18n/i18nKey'
import { i18n } from '@i18n/translation'
import Icon from '@iconify/svelte'
import {
  applyThemeToDocument,
  getStoredTheme,
  setTheme,
} from '@utils/setting-utils.ts'
import { onMount } from 'svelte'

const seq: LIGHT_DARK_MODE[] = [LIGHT_MODE, DARK_MODE, AUTO_MODE]
let mode: LIGHT_DARK_MODE = AUTO_MODE
let isOpen = false
let hideTimeout: ReturnType<typeof setTimeout> | null = null

onMount(() => {
  mode = getStoredTheme()
  const darkModePreference = window.matchMedia('(prefers-color-scheme: dark)')
  const changeThemeWhenSchemeChanged: Parameters<
    typeof darkModePreference.addEventListener<'change'>
  >[1] = e => {
    applyThemeToDocument(mode)
  }
  darkModePreference.addEventListener('change', changeThemeWhenSchemeChanged)
  return () => {
    darkModePreference.removeEventListener(
      'change',
      changeThemeWhenSchemeChanged,
    )
  }
})

function switchScheme(newMode: LIGHT_DARK_MODE) {
  mode = newMode
  setTheme(newMode)
  isOpen = false
}

function toggleScheme() {
  let i = 0
  for (; i < seq.length; i++) {
    if (seq[i] === mode) {
      break
    }
  }
  switchScheme(seq[(i + 1) % seq.length])
}

function cancelHide() {
  if (hideTimeout !== null) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
}

function showPanel() {
  cancelHide()
  isOpen = true
}

function scheduleHide() {
  cancelHide()
  hideTimeout = setTimeout(() => {
    isOpen = false
    hideTimeout = null
  }, 150)
}

function handleClick() {
  isOpen = !isOpen
  cancelHide()
}
</script>

<div class="relative z-50" on:mouseleave={scheduleHide} on:mouseenter={cancelHide}>
  <button
    aria-label="Light/Dark Mode"
    class="relative btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90 flex items-center justify-center text-gray-700 dark:text-gray-300"
    on:click={handleClick}
    on:mouseenter={showPanel}
  >
    <div class="absolute flex items-center justify-center" class:opacity-0={mode !== LIGHT_MODE}>
      <Icon icon="material-symbols:wb-sunny-outline-rounded" class="text-[1.25rem] text-gray-700 dark:text-gray-300"></Icon>
    </div>
    <div class="absolute flex items-center justify-center" class:opacity-0={mode !== DARK_MODE}>
      <Icon icon="material-symbols:dark-mode-outline-rounded" class="text-[1.25rem] text-gray-700 dark:text-gray-300"></Icon>
    </div>
    <div class="absolute flex items-center justify-center" class:opacity-0={mode !== AUTO_MODE}>
      <Icon icon="material-symbols:radio-button-partial-outline" class="text-[1.25rem] text-gray-700 dark:text-gray-300"></Icon>
    </div>
  </button>

  {#if isOpen}
    <div class="absolute top-12 right-0 z-50 mt-2">
      <div class="rounded-lg overflow-hidden bg-white dark:bg-gray-800 p-2 min-w-[180px] shadow-lg border border-gray-200 dark:border-gray-700">
        <button
          class="flex transition whitespace-nowrap items-center justify-start w-full btn-plain scale-animation rounded-lg h-9 px-3 font-medium active:scale-95 mb-0.5 text-gray-700 dark:text-gray-300"
          class:current-theme-btn={mode === LIGHT_MODE}
          on:click={() => switchScheme(LIGHT_MODE)}
        >
          <Icon icon="material-symbols:wb-sunny-outline-rounded" class="text-[1.25rem] mr-3 text-gray-700 dark:text-gray-300"></Icon>
          <span class="text-gray-700 dark:text-gray-300">{i18n(I18nKey.lightMode)}</span>
        </button>
        <button
          class="flex transition whitespace-nowrap items-center justify-start w-full btn-plain scale-animation rounded-lg h-9 px-3 font-medium active:scale-95 mb-0.5 text-gray-700 dark:text-gray-300"
          class:current-theme-btn={mode === DARK_MODE}
          on:click={() => switchScheme(DARK_MODE)}
        >
          <Icon icon="material-symbols:dark-mode-outline-rounded" class="text-[1.25rem] mr-3 text-gray-700 dark:text-gray-300"></Icon>
          <span class="text-gray-700 dark:text-gray-300">{i18n(I18nKey.darkMode)}</span>
        </button>
        <button
          class="flex transition whitespace-nowrap items-center justify-start w-full btn-plain scale-animation rounded-lg h-9 px-3 font-medium active:scale-95 text-gray-700 dark:text-gray-300"
          class:current-theme-btn={mode === AUTO_MODE}
          on:click={() => switchScheme(AUTO_MODE)}
        >
          <Icon icon="material-symbols:radio-button-partial-outline" class="text-[1.25rem] mr-3 text-gray-700 dark:text-gray-300"></Icon>
          <span class="text-gray-700 dark:text-gray-300">{i18n(I18nKey.systemMode)}</span>
        </button>
      </div>
    </div>
  {/if}
</div>

<style lang="css">
.current-theme-btn {
  background: var(--btn-plain-bg-hover);
  color: var(--primary) !important;
}

.current-theme-btn span,
.current-theme-btn .iconify {
  color: var(--primary) !important;
}
</style>

