// Minimal dependency-free SVG bar chart with hover tooltip.
// data: [{ label, value }]
const Charts = (() => {
  const NS = "http://www.w3.org/2000/svg";

  function el(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function renderBarChart(container, data, opts = {}) {
    container.innerHTML = "";

    if (!data.length) {
      const p = document.createElement("p");
      p.className = "empty-msg";
      p.style.margin = "20px 0";
      p.textContent = opts.emptyText || "표시할 데이터가 없어요.";
      container.appendChild(p);
      return;
    }

    const width = Math.max(container.clientWidth || 320, data.length * (opts.minBarSlot || 44));
    const height = opts.height || 200;
    const padding = { top: 16, right: 12, bottom: 28, left: 30 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    const maxVal = Math.max(1, ...data.map((d) => d.value));
    // "nice" max for gridlines
    const niceMax = Math.ceil(maxVal / 5) * 5 || 5;

    const svg = el("svg", {
      viewBox: `0 0 ${width} ${height}`,
      width: "100%",
      height,
      role: "img",
      "aria-label": opts.ariaLabel || "차트",
    });

    const rootStyle = getComputedStyle(document.documentElement);
    const gridColor = rootStyle.getPropertyValue("--grid").trim() || "#e1e0d9";
    const axisColor = rootStyle.getPropertyValue("--axis").trim() || "#c3c2b7";
    const mutedColor = rootStyle.getPropertyValue("--text-muted").trim() || "#898781";
    const barColor = opts.color || rootStyle.getPropertyValue("--accent").trim() || "#2a78d6";

    // gridlines (4 steps)
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const y = padding.top + (plotH * i) / steps;
      const line = el("line", {
        x1: padding.left,
        x2: width - padding.right,
        y1: y,
        y2: y,
        stroke: gridColor,
        "stroke-width": 1,
      });
      svg.appendChild(line);

      const val = Math.round(niceMax - (niceMax * i) / steps);
      const label = el("text", {
        x: padding.left - 6,
        y: y + 4,
        "text-anchor": "end",
        "font-size": 10,
        fill: mutedColor,
      });
      label.textContent = val;
      svg.appendChild(label);
    }

    // baseline
    svg.appendChild(
      el("line", {
        x1: padding.left,
        x2: width - padding.right,
        y1: padding.top + plotH,
        y2: padding.top + plotH,
        stroke: axisColor,
        "stroke-width": 1,
      })
    );

    const slot = plotW / data.length;
    const barW = Math.min(28, slot * 0.5);

    const tooltip = document.createElement("div");
    tooltip.className = "bar-tooltip";
    container.style.position = "relative";

    data.forEach((d, i) => {
      const cx = padding.left + slot * i + slot / 2;
      const barH = Math.max(2, (d.value / niceMax) * plotH);
      const y = padding.top + plotH - barH;
      const radius = Math.min(4, barW / 2);

      const rect = el("path", {
        d: roundedTopRectPath(cx - barW / 2, y, barW, barH, radius),
        fill: barColor,
      });
      rect.style.cursor = "default";
      rect.addEventListener("mouseenter", (e) => showTip(e, d));
      rect.addEventListener("mousemove", (e) => showTip(e, d));
      rect.addEventListener("mouseleave", hideTip);
      svg.appendChild(rect);

      const label = el("text", {
        x: cx,
        y: height - 8,
        "text-anchor": "middle",
        "font-size": 10,
        fill: mutedColor,
      });
      label.textContent = d.label;
      svg.appendChild(label);
    });

    function showTip(e, d) {
      const rectBox = container.getBoundingClientRect();
      tooltip.textContent = `${d.label}: ${d.value}건`;
      tooltip.style.left = `${e.clientX - rectBox.left}px`;
      tooltip.style.top = `${e.clientY - rectBox.top}px`;
      tooltip.style.opacity = "1";
    }
    function hideTip() {
      tooltip.style.opacity = "0";
    }

    container.appendChild(svg);
    container.appendChild(tooltip);
  }

  function roundedTopRectPath(x, y, w, h, r) {
    r = Math.min(r, h);
    return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
  }

  return { renderBarChart };
})();
