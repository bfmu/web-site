/**
 * Inicialización de la página de Analytics. Se llama al cargar /admin/analytics tanto
 * en carga directa como tras transiciones Swup (content:replace) — un <script> inline
 * dentro del .astro NO se re-ejecuta en content:replace, así que toda la lógica vive acá
 * (mismo patrón que backup-init.ts, posts-init.ts, etc).
 */
import * as echarts from 'echarts';
import { feature } from 'topojson-client';
import worldTopology from 'world-atlas/countries-110m.json';
import * as isoCountries from 'i18n-iso-countries';
import isoCountriesEn from 'i18n-iso-countries/langs/en.json';
import {
  getAnalyticsStats,
  getAnalyticsRecentVisits,
  getVisitorSessions,
  getEngagementStats,
  type AnalyticsRecentVisit,
} from './admin-api';

isoCountries.registerLocale(isoCountriesEn);

// El nombre en inglés que da i18n-iso-countries no siempre coincide textualmente
// con el properties.name del topojson de world-atlas (ej. "Russian Federation" vs
// "Russia") — sin esta corrección esos países no pintan en el mapa aunque tengan datos.
const COUNTRY_NAME_OVERRIDES: Record<string, string> = {
  BA: 'Bosnia and Herz.',
  BN: 'Brunei',
  CF: 'Central African Rep.',
  CN: 'China',
  CG: 'Congo',
  CD: 'Dem. Rep. Congo',
  CI: "Côte d'Ivoire",
  CZ: 'Czechia',
  DO: 'Dominican Rep.',
  GQ: 'Eq. Guinea',
  FK: 'Falkland Is.',
  TF: 'Fr. S. Antarctic Lands',
  GM: 'Gambia',
  IR: 'Iran',
  LA: 'Laos',
  MD: 'Moldova',
  MK: 'Macedonia',
  PS: 'Palestine',
  RU: 'Russia',
  SB: 'Solomon Is.',
  SZ: 'eSwatini',
  SY: 'Syria',
  TW: 'Taiwan',
  TZ: 'Tanzania',
  TR: 'Turkey',
  EH: 'W. Sahara',
  SS: 'S. Sudan',
};

function countryCodeToMapName(isoAlpha2: string): string | undefined {
  return COUNTRY_NAME_OVERRIDES[isoAlpha2] ?? isoCountries.getName(isoAlpha2, 'en');
}

const WORLD_MAP_NAME = 'world';
let worldMapRegistered = false;
function ensureWorldMapRegistered(): void {
  if (worldMapRegistered) return;
  const geoJson = feature(
    worldTopology as any,
    (worldTopology as any).objects.countries,
  ) as any;
  echarts.registerMap(WORLD_MAP_NAME, geoJson);
  worldMapRegistered = true;
}

let analyticsListenersAttached = false;
let charts: Record<string, echarts.ECharts> = {};
let resizeListenerAttached = false;

function disposeCharts(): void {
  Object.values(charts).forEach((c) => c.dispose());
  charts = {};
}

export function initAnalyticsPage(): void {
  if (typeof window === 'undefined') return;
  const isAnalyticsPage = window.location.pathname.replace(/\/$/, '').endsWith('/admin/analytics');

  if (!isAnalyticsPage) {
    analyticsListenersAttached = false;
    disposeCharts();
    return;
  }

  const cardsEl = document.getElementById('analytics-stats-cards');
  if (!cardsEl) return;

  // Los charts quedan atados a nodos DOM viejos tras un content:replace — siempre
  // se disponen y se recrean, aunque los listeners de los controles sí se guarden
  // una sola vez por entrada a la página.
  disposeCharts();

  const topPagesEl = document.getElementById('analytics-top-pages-body');
  const topLocationsEl = document.getElementById('analytics-top-locations-body');
  const recentVisitsEl = document.getElementById('analytics-recent-visits-body');
  const rangeSelect = document.getElementById('analytics-range') as HTMLSelectElement | null;
  const loadMoreBtn = document.getElementById('analytics-load-more') as HTMLButtonElement | null;

  if (!topPagesEl || !topLocationsEl || !recentVisitsEl) return;

  const PAGE_SIZE = 20;
  let visitsLoaded = 0;
  let allLoadedVisits: AnalyticsRecentVisit[] = [];

  const isDark = () => document.documentElement.classList.contains('dark');
  const axisTextColor = () => (isDark() ? '#9ca3af' : '#6b7280');
  const gridLineColor = () => (isDark() ? '#374151' : '#e5e7eb');

  function getChart(id: string): echarts.ECharts {
    if (!charts[id]) {
      const el = document.getElementById(id);
      if (!el) throw new Error(`Chart container ${id} not found`);
      charts[id] = echarts.init(el);
    }
    return charts[id];
  }

  if (!resizeListenerAttached) {
    window.addEventListener('resize', () => {
      Object.values(charts).forEach((c) => c.resize());
    });
    resizeListenerAttached = true;
  }

  function escapeHtml(value: string | undefined | null): string {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
  }

  function renderVisitRow(v: AnalyticsRecentVisit): string {
    const loc = [v.city, v.country].filter(Boolean).join(', ') || '—';
    const dateStr = new Date(v.createdAt).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    return `
      <div class="px-6 py-3 text-sm">
        <div class="flex justify-between gap-2">
          <span class="font-mono text-gray-700 dark:text-gray-300">${escapeHtml(v.ip)}</span>
          <span class="shrink-0 text-gray-500 dark:text-gray-400">${dateStr}</span>
        </div>
        <div class="mt-1 truncate text-gray-600 dark:text-gray-400">${escapeHtml(v.path)}</div>
        <div class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-gray-500 dark:text-gray-500">
          <span>${escapeHtml(loc)}</span>
          <span>·</span>
          <span>${escapeHtml(v.device)}</span>
          <span>·</span>
          <span class="truncate">${escapeHtml(v.referrer)}</span>
        </div>
      </div>
    `;
  }

  function renderViewsChart(dailyViews: { date: string; count: number }[]): void {
    const chart = getChart('analytics-chart-views');
    chart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 20, bottom: 60 },
      xAxis: {
        type: 'category',
        data: dailyViews.map((d) => d.date.slice(5).replace('-', '/')),
        axisLine: { lineStyle: { color: gridLineColor() } },
        axisLabel: { color: axisTextColor() },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: gridLineColor() } },
        axisLabel: { color: axisTextColor() },
      },
      dataZoom: [{ type: 'slider', height: 20, bottom: 10 }, { type: 'inside' }],
      series: [
        {
          type: 'line',
          data: dailyViews.map((d) => d.count),
          smooth: true,
          areaStyle: { opacity: 0.15 },
          itemStyle: { color: '#6366f1' },
          lineStyle: { color: '#6366f1' },
        },
      ],
    });
  }

  function renderSankeyChart(sessions: { paths: string[] }[]): void {
    const chart = getChart('analytics-chart-sankey');
    const edgeCounts = new Map<string, number>();

    for (const session of sessions) {
      if (session.paths.length < 2) continue; // bounce, no aporta transiciones
      for (let i = 0; i < session.paths.length - 1; i++) {
        const key = `${session.paths[i]}→${session.paths[i + 1]}`;
        edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
      }
    }

    const nodeNames = new Set<string>();
    const links = Array.from(edgeCounts.entries()).map(([key, value]) => {
      const [source, target] = key.split('→');
      nodeNames.add(source);
      nodeNames.add(target);
      return { source, target, value };
    });

    if (links.length === 0) {
      chart.setOption({
        title: {
          text: 'Sin suficientes sesiones multi-página todavía',
          left: 'center',
          top: 'middle',
          textStyle: { fontSize: 13, color: axisTextColor(), fontWeight: 'normal' },
        },
        series: [],
      });
      return;
    }

    chart.setOption({
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'sankey',
          emphasis: { focus: 'adjacency' },
          data: Array.from(nodeNames).map((name) => ({ name })),
          links,
          label: { color: axisTextColor(), fontSize: 11 },
          lineStyle: { color: 'gradient', curveness: 0.5 },
        },
      ],
    });
  }

  function renderWorldMapChart(
    countryCounts: { country: string; count: number }[],
    cityCounts: { city: string; country: string; lat: number; lng: number; count: number }[],
  ): void {
    ensureWorldMapRegistered();
    const chart = getChart('analytics-chart-worldmap');

    const countryData = countryCounts
      .map((c) => ({ name: countryCodeToMapName(c.country), value: c.count }))
      .filter((d): d is { name: string; value: number } => !!d.name);

    const maxCountry = Math.max(1, ...countryData.map((d) => d.value));
    const maxCity = Math.max(1, ...cityCounts.map((c) => c.count));

    // El "value" del scatter va como [lng, lat, count] — es el formato que espera
    // ECharts para un coordinateSystem geo, no [lat, lng] como devuelve geoip.
    const cityData = cityCounts.map((c) => ({
      name: c.city,
      value: [c.lng, c.lat, c.count],
    }));

    chart.setOption({
      tooltip: { trigger: 'item' },
      visualMap: {
        seriesIndex: 0,
        min: 0,
        max: maxCountry,
        left: 'left',
        bottom: 10,
        text: ['Más', 'Menos'],
        calculable: true,
        inRange: { color: ['#c7d2fe', '#6366f1', '#312e81'] },
        textStyle: { color: axisTextColor() },
      },
      geo: {
        map: WORLD_MAP_NAME,
        roam: true,
        emphasis: { label: { show: false }, itemStyle: { areaColor: '#818cf8' } },
        itemStyle: {
          areaColor: isDark() ? '#1f2937' : '#e5e7eb',
          borderColor: isDark() ? '#374151' : '#d1d5db',
        },
      },
      series: [
        {
          name: 'Vistas por país',
          type: 'map',
          geoIndex: 0,
          map: WORLD_MAP_NAME,
          data: countryData,
          tooltip: { formatter: (p: any) => `${p.name}: ${p.value ?? 0} vistas` },
        },
        {
          name: 'Ciudades',
          type: 'scatter',
          coordinateSystem: 'geo',
          symbolSize: (val: number[]) => 4 + (val[2] / maxCity) * 16,
          itemStyle: { color: '#f59e0b', opacity: 0.8 },
          emphasis: { itemStyle: { color: '#fbbf24' } },
          data: cityData,
          tooltip: { formatter: (p: any) => `${p.name}: ${p.value[2]} vistas` },
          z: 10,
        },
      ],
    });
  }

  function renderHeatmapChart(visits: AnalyticsRecentVisit[]): void {
    const chart = getChart('analytics-chart-heatmap');
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const counts: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

    for (const v of visits) {
      const d = new Date(v.createdAt);
      counts[d.getDay()][d.getHours()] += 1;
    }

    const data: [number, number, number][] = [];
    let max = 1;
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const value = counts[day][hour];
        if (value > max) max = value;
        data.push([hour, day, value]);
      }
    }

    chart.setOption({
      tooltip: { position: 'top' },
      grid: { left: 50, right: 20, top: 20, bottom: 30 },
      xAxis: {
        type: 'category',
        data: Array.from({ length: 24 }, (_, h) => h),
        splitArea: { show: true },
        axisLabel: { color: axisTextColor(), interval: 2 },
      },
      yAxis: {
        type: 'category',
        data: dayNames,
        splitArea: { show: true },
        axisLabel: { color: axisTextColor() },
      },
      visualMap: {
        min: 0,
        max,
        show: false,
        inRange: { color: ['#eef2ff', '#6366f1'] },
      },
      series: [
        {
          type: 'heatmap',
          data,
          itemStyle: { borderColor: isDark() ? '#1f2937' : '#fff', borderWidth: 1 },
        },
      ],
    });
  }

  function renderHorizontalBar(
    chartId: string,
    items: { label: string; value: number }[],
    valueSuffix: string,
  ): void {
    const chart = getChart(chartId);
    const top = items.slice(0, 8).reverse();

    if (top.length === 0) {
      chart.setOption({
        title: {
          text: 'Sin datos todavía',
          left: 'center',
          top: 'middle',
          textStyle: { fontSize: 12, color: axisTextColor(), fontWeight: 'normal' },
        },
        series: [],
      });
      return;
    }

    chart.setOption({
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v}${valueSuffix}` },
      grid: { left: 90, right: 30, top: 10, bottom: 10, containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { color: axisTextColor() },
        splitLine: { lineStyle: { color: gridLineColor() } },
      },
      yAxis: {
        type: 'category',
        data: top.map((i) => i.label),
        axisLabel: {
          color: axisTextColor(),
          width: 80,
          overflow: 'truncate',
        },
      },
      series: [
        {
          type: 'bar',
          data: top.map((i) => Math.round(i.value * 10) / 10),
          itemStyle: { color: '#6366f1', borderRadius: [0, 4, 4, 0] },
        },
      ],
    });
  }

  async function loadAnalytics(days: number): Promise<void> {
    if (!cardsEl || !topPagesEl || !topLocationsEl || !recentVisitsEl) return;

    try {
      const [stats, sessions, engagement] = await Promise.all([
        getAnalyticsStats(days),
        getVisitorSessions(days).catch(() => []),
        getEngagementStats(days).catch(() => ({
          avgTimeOnPageByPath: [],
          avgScrollDepthByPath: [],
          topClickedElements: [],
        })),
      ]);

      const bounces = sessions.filter((s) => s.pageCount === 1).length;

      cardsEl.innerHTML = `
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total visitas</p>
          <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">${stats.totalPageViews.toLocaleString()}</p>
        </div>
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Visitantes únicos (${stats.rangeDays}d)</p>
          <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">${stats.uniqueVisitors.toLocaleString()}</p>
        </div>
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Sesiones con journey (${stats.rangeDays}d)</p>
          <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">${sessions.length.toLocaleString()}</p>
        </div>
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Sesiones de una sola página</p>
          <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">${bounces.toLocaleString()}</p>
        </div>
      `;

      // Cada gráfico se renderiza de forma aislada: si uno tira (ej. sankey con
      // un dataset degenerado), no debe tumbar el resto de la página.
      const safeRender = (label: string, fn: () => void) => {
        try {
          fn();
        } catch (err) {
          console.error(`Error rendering chart "${label}":`, err);
        }
      };

      safeRender('views', () => renderViewsChart(stats.dailyViews));
      safeRender('sankey', () => renderSankeyChart(sessions));
      safeRender('worldmap', () => renderWorldMapChart(stats.countryCounts, stats.cityCounts));
      safeRender('time', () =>
        renderHorizontalBar(
          'analytics-chart-time',
          engagement.avgTimeOnPageByPath.map((p) => ({ label: p.path, value: p.avgSeconds })),
          's',
        ),
      );
      safeRender('scroll', () =>
        renderHorizontalBar(
          'analytics-chart-scroll',
          engagement.avgScrollDepthByPath.map((p) => ({ label: p.path, value: p.avgPercent })),
          '%',
        ),
      );
      safeRender('clicks', () =>
        renderHorizontalBar(
          'analytics-chart-clicks',
          engagement.topClickedElements.map((c) => ({ label: c.label, value: c.count })),
          '',
        ),
      );

      topPagesEl.innerHTML = stats.topPages.length > 0
        ? stats.topPages.map((p) => `
          <div class="flex justify-between px-6 py-3">
            <span class="truncate text-sm text-gray-900 dark:text-white" title="${escapeHtml(p.path)}">${escapeHtml(p.path) || '/'}</span>
            <span class="ml-2 shrink-0 text-sm font-medium text-gray-600 dark:text-gray-400">${p.count.toLocaleString()}</span>
          </div>
        `).join('')
        : '<div class="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No hay datos</div>';

      topLocationsEl.innerHTML = stats.topLocations.length > 0
        ? stats.topLocations.map((l) => `
          <div class="flex justify-between px-6 py-3">
            <span class="text-sm text-gray-900 dark:text-white">${l.city ? `${escapeHtml(l.city)}, ` : ''}${escapeHtml(l.country)}</span>
            <span class="ml-2 shrink-0 text-sm font-medium text-gray-600 dark:text-gray-400">${l.count.toLocaleString()}</span>
          </div>
        `).join('')
        : '<div class="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No hay datos</div>';

      allLoadedVisits = stats.recentVisits;
      recentVisitsEl.innerHTML = stats.recentVisits.length > 0
        ? stats.recentVisits.map(renderVisitRow).join('')
        : '<div class="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No hay visitas recientes</div>';
      renderHeatmapChart(allLoadedVisits);

      visitsLoaded = stats.recentVisits.length;
      if (loadMoreBtn) {
        loadMoreBtn.style.display = stats.recentVisits.length < PAGE_SIZE ? 'none' : '';
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Cargar más';
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      cardsEl.innerHTML = '<div class="col-span-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">Error al cargar analytics. Verifica que estés autenticado como admin.</div>';
      topPagesEl.innerHTML = '<div class="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">—</div>';
      topLocationsEl.innerHTML = '<div class="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">—</div>';
      recentVisitsEl.innerHTML = '<div class="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">—</div>';
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    }
  }

  if (!analyticsListenersAttached) {
    analyticsListenersAttached = true;

    rangeSelect?.addEventListener('change', () => {
      loadAnalytics(parseInt(rangeSelect.value, 10) || 30);
    });

    loadMoreBtn?.addEventListener('click', async () => {
      if (!recentVisitsEl) return;
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = 'Cargando…';
      try {
        const more = await getAnalyticsRecentVisits(visitsLoaded, PAGE_SIZE);
        if (more.length > 0) {
          recentVisitsEl.insertAdjacentHTML('beforeend', more.map(renderVisitRow).join(''));
          visitsLoaded += more.length;
          allLoadedVisits = allLoadedVisits.concat(more);
          renderHeatmapChart(allLoadedVisits);
        }
        if (more.length < PAGE_SIZE) {
          loadMoreBtn.style.display = 'none';
        } else {
          loadMoreBtn.disabled = false;
          loadMoreBtn.textContent = 'Cargar más';
        }
      } catch (err) {
        console.error('Error loading more visits:', err);
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Reintentar';
      }
    });
  }

  loadAnalytics(parseInt(rangeSelect?.value ?? '30', 10) || 30);
}
