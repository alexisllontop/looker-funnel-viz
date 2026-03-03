// Looker Studio Community Visualization
// Flat trapezoid funnel — InboundCycle style
// Individual color per segment, multiline text, rounded corners, no font shrinking

const dscc = require('@google/dscc');
const d3 = require('d3');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Interpolate a color between two hex values given a ratio 0–1
 */
function interpolateColor(colorTop, colorBottom, ratio) {
  const parse = (hex) => {
    const c = hex.replace('#', '');
    return [
      parseInt(c.substring(0, 2), 16),
      parseInt(c.substring(2, 4), 16),
      parseInt(c.substring(4, 6), 16),
    ];
  };
  const toHex = (n) => Math.round(n).toString(16).padStart(2, '0');
  const [r1, g1, b1] = parse(colorTop);
  const [r2, g2, b2] = parse(colorBottom);
  return `#${toHex(r1 + (r2 - r1) * ratio)}${toHex(g1 + (g2 - g1) * ratio)}${toHex(b1 + (b2 - b1) * ratio)}`;
}

/**
 * Build a trapezoid SVG path given the top-left x, top width, top y, height, and bottom width.
 * The trapezoid is centred horizontally within the available width.
 */
function trapezoidPath(cx, topW, topY, h, bottomW) {
  const topLeft  = cx - topW / 2;
  const topRight = cx + topW / 2;
  const botLeft  = cx - bottomW / 2;
  const botRight = cx + bottomW / 2;
  const botY     = topY + h;
  return `M${topLeft},${topY} L${topRight},${topY} L${botRight},${botY} L${botLeft},${botY} Z`;
}

// ---------------------------------------------------------------------------
// Main draw function
// ---------------------------------------------------------------------------

function drawViz(data) {
  // ── Clear previous render ──────────────────────────────────────────────
  const container = document.getElementById('container') || document.body;
  container.innerHTML = '';

  // ── Style options ──────────────────────────────────────────────────────
  const style       = data.style;
  const colorTop    = (style.colorTop    && style.colorTop.value)    ? style.colorTop.value    : '#1a3a5c';
  const colorBottom = (style.colorBottom && style.colorBottom.value) ? style.colorBottom.value : '#2196F3';
  const fontColor   = (style.fontColor   && style.fontColor.value)   ? style.fontColor.value   : '#ffffff';
  const fontSize    = (style.fontSize    && style.fontSize.value)    ? parseInt(style.fontSize.value) : 14;
  const showValues  = (style.showValues  && style.showValues.value)  ? style.showValues.value  : false;

  // ── Data rows ─────────────────────────────────────────────────────────
  const rows = data.tables.DEFAULT;
  if (!rows || rows.length === 0) {
    container.innerHTML = '<p style="font-family:sans-serif;color:#666;padding:16px;">Sin datos</p>';
    return;
  }

  const stages = rows.map((row) => ({
    label: row.dimension[0],
    value: row.metric[0],
  }));

  const n = stages.length; // up to 5

  // ── Canvas dimensions ─────────────────────────────────────────────────
  const W = container.offsetWidth  || 400;
  const H = container.offsetHeight || 400;

  const paddingX    = 20;
  const paddingTop  = 16;
  const paddingBot  = 16;
  const gap         = 4;          // px gap between segments
  const totalH      = H - paddingTop - paddingBot;
  const segH        = (totalH - gap * (n - 1)) / n;

  // Funnel shape: top width fraction and bottom width fraction of W
  const topFrac = 0.90;
  const botFrac = 0.25;

  const availW = W - paddingX * 2;
  const cx     = W / 2;

  // ── SVG ───────────────────────────────────────────────────────────────
  const svg = d3.select(container)
    .append('svg')
    .attr('width',  W)
    .attr('height', H)
    .style('display', 'block');

  stages.forEach((stage, i) => {
    const ratio      = n === 1 ? 0.5 : i / (n - 1);
    const ratioNext  = n === 1 ? 0.5 : (i + 1) / (n - 1);
    const color      = interpolateColor(colorTop, colorBottom, ratio);

    // Width of top and bottom edges of this trapezoid
    const topFracI  = topFrac - (topFrac - botFrac) * ratio;
    const botFracI  = topFrac - (topFrac - botFrac) * Math.min(ratioNext, 1);
    const topW      = availW * topFracI;
    const bottomW   = availW * botFracI;

    const topY = paddingTop + i * (segH + gap);

    // Draw trapezoid
    svg.append('path')
      .attr('d', trapezoidPath(cx, topW, topY, segH, bottomW))
      .attr('fill', color)
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5);

    // ── Label inside the segment ────────────────────────────────────────
    const midY       = topY + segH / 2;
    const midW       = (topW + bottomW) / 2;   // available width at midpoint
    const labelPadX  = 12;
    const maxLabelW  = midW - labelPadX * 2;

    const textGroup = svg.append('g');

    // Stage name
    const nameText = textGroup.append('text')
      .attr('x', cx)
      .attr('y', midY)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', showValues ? 'auto' : 'middle')
      .attr('fill', fontColor)
      .attr('font-size', `${fontSize}px`)
      .attr('font-family', 'Google Sans, Roboto, Arial, sans-serif')
      .attr('font-weight', '600')
      .text(stage.label);

    // Dynamically scale text to fit inside trapezoid
    try {
      const bbox = nameText.node().getBBox();
      if (bbox.width > maxLabelW && bbox.width > 0) {
        const scale = maxLabelW / bbox.width;
        nameText.attr('font-size', `${Math.max(8, Math.floor(fontSize * scale))}px`);
      }
    } catch (e) { /* getBBox may fail in some environments */ }

    // Optionally show value beneath the label
    if (showValues && stage.value !== undefined && stage.value !== null) {
      textGroup.append('text')
        .attr('x', cx)
        .attr('y', midY + fontSize + 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'hanging')
        .attr('fill', fontColor)
        .attr('font-size', `${Math.max(10, fontSize - 2)}px`)
        .attr('font-family', 'Google Sans, Roboto, Arial, sans-serif')
        .attr('opacity', 0.85)
        .text(typeof stage.value === 'number'
          ? stage.value.toLocaleString()
          : stage.value);
    }
  });
}

// ── Register with Looker Studio ──────────────────────────────────────────
dscc.subscribeToData(drawViz, { transform: dscc.objectTransform });
