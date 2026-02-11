<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  /** Caracteres tipo Matrix (katakana, números, algunos latinos) */
  const CHARS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF';

  interface Drop {
    y: number;
    speed: number;
    length: number;
    chars: string[];
  }

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationId = 0;
  let columns: Drop[] = [];
  let fontSize = 18;
  let columnWidth = 18;
  let logicalWidth = 0;
  let logicalHeight = 0;
  let resizeObserver: ResizeObserver | null = null;
  let dpr = 1;

  function initDrops() {
    // Columnas suficientes para cubrir todo el ancho (máx 200 por rendimiento)
    const colCount = Math.min(200, Math.max(30, Math.ceil(logicalWidth / columnWidth)));
    columns = [];

    for (let i = 0; i < colCount; i++) {
      columns.push({
        y: Math.random() * logicalHeight,
        speed: 0.8 + Math.random() * 1.2,
        length: 8 + Math.floor(Math.random() * 15),
        chars: Array.from({ length: 20 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
      });
    }
  }

  function resizeCanvas() {
    if (!ctx) return;

    logicalWidth = window.innerWidth;
    logicalHeight = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(logicalWidth * dpr);
    canvas.height = Math.floor(logicalHeight * dpr);
    canvas.style.width = `${logicalWidth}px`;
    canvas.style.height = `${logicalHeight}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const newCount = Math.min(200, Math.max(30, Math.ceil(logicalWidth / columnWidth)));
    const oldLen = columns.length;

    if (newCount > oldLen) {
      for (let i = oldLen; i < newCount; i++) {
        columns.push({
          y: Math.random() * logicalHeight,
          speed: 0.8 + Math.random() * 1.2,
          length: 8 + Math.floor(Math.random() * 15),
          chars: Array.from({ length: 20 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
        });
      }
    } else if (newCount < oldLen) {
      columns.length = newCount;
    }
  }

  function draw() {
    const context = ctx;
    if (!context || !canvas) return;

    context.fillStyle = 'rgba(0, 0, 0, 0.06)';
    context.fillRect(0, 0, logicalWidth, logicalHeight);

    context.font = `${fontSize}px monospace`;

    columns.forEach((drop, i) => {
      const x = Math.floor(i * columnWidth);
      const headChar = drop.chars[Math.floor(drop.y / fontSize) % drop.chars.length];

      context.fillStyle = '#ffffff';
      context.fillText(headChar, x, Math.floor(drop.y));

      for (let j = 1; j < drop.length; j++) {
        const ty = drop.y - j * fontSize;
        if (ty < 0) break;
        const idx = (Math.floor(drop.y / fontSize) - j + drop.chars.length * 10) % drop.chars.length;
        const alpha = 1 - j / drop.length;
        context.fillStyle = `rgba(0, 255, 70, ${alpha * 0.8})`;
        context.fillText(drop.chars[idx], x, Math.floor(ty));
      }

      drop.y += drop.speed;
      if (drop.y > logicalHeight + drop.length * fontSize) {
        drop.y = -drop.length * fontSize;
      }
    });

    animationId = requestAnimationFrame(draw);
  }

  onMount(() => {
    ctx = canvas.getContext('2d');
    if (!ctx) return;

    resizeCanvas();
    initDrops();
    draw();

    resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(document.documentElement);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  });

  onDestroy(() => {
    if (animationId) cancelAnimationFrame(animationId);
  });
</script>

<div class="matrix-container">
  <canvas bind:this={canvas} class="matrix-canvas"></canvas>
</div>

<style>
  .matrix-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    min-width: 100%;
    min-height: 100%;
    z-index: -1;
    overflow: hidden;
    background: #000;
  }

  .matrix-canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
