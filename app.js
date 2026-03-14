let umapData = null;
let groups = [];

async function loadUmap() {
  const res = await fetch("./umap.json");
  umapData = await res.json();
  groups = [...new Set(umapData.map(d => d.group))].sort();
  renderPlots(null, "UMAP");
  document.getElementById("status").textContent = "UMAP loaded. Enter a gene.";
}

function renderPlots(exprValues, title) {
  const n = groups.length;
  const ncols = Math.min(n, 3);
  const nrows = Math.ceil(n / ncols);

  const globalMax = exprValues ? Math.max(...Object.values(exprValues)) : 1;
  const globalMin = 0;

  const traces = [];
  const annotations = [];

  groups.forEach((grp, i) => {
    const cells = umapData.filter(d => d.group === grp);
    const axSuffix = i === 0 ? "" : String(i + 1);

    const colors = exprValues
      ? cells.map(d => exprValues[d.cell] ?? 0)
      : cells.map(() => 0);

    traces.push({
      x: cells.map(d => d.UMAP_1),
      y: cells.map(d => d.UMAP_2),
      mode: "markers",
      type: "scattergl",
      name: grp,
      text: cells.map(d => `${d.cell}<br>${grp}`),
      hoverinfo: "text",
      xaxis: `x${axSuffix}`,
      yaxis: `y${axSuffix}`,
      showlegend: false,
      marker: {
        size: 3,
        color: colors,
        colorscale: "Viridis",
        cmin: globalMin,
        cmax: globalMax,
        showscale: i === n - 1,
        colorbar: { title: "Expr", thickness: 12, len: 0.5, y: 0.5 }
      }
    });

    annotations.push({
      text: `<b>${grp}</b>`,
      xref: `x${axSuffix} domain`,
      yref: `y${axSuffix} domain`,
      x: 0.5, y: 1.08,
      showarrow: false,
      font: { size: 13 }
    });
  });

  const layout = {
    grid: { rows: nrows, columns: ncols, pattern: "independent" },
    annotations,
    title: { text: title, font: { size: 16 } },
    margin: { l: 40, r: 80, t: 60, b: 40 },
    showlegend: false,
    height: nrows * 380,
    paper_bgcolor: "#fff",
    plot_bgcolor: "#f8f8f8"
  };

  Plotly.newPlot("plot", traces, layout, { responsive: true });
}

async function loadGene() {
  const gene = document.getElementById("geneInput").value.trim();
  if (!gene || !umapData) return;

  document.getElementById("status").textContent = `Loading ${gene}...`;

  try {
    const res = await fetch(`./genes/${gene}.json`);
    if (!res.ok) throw new Error("not found");

    const geneData = await res.json();

    // Build cell -> expression lookup (values array matches umap order)
    const exprMap = {};
    umapData.forEach((d, i) => { exprMap[d.cell] = geneData.values[i]; });

    renderPlots(exprMap, `${geneData.gene} — split by group`);
    document.getElementById("status").textContent = `${geneData.gene} loaded`;
  } catch (err) {
    document.getElementById("status").textContent = `Gene not found: ${gene}`;
  }
}

document.getElementById("loadBtn").addEventListener("click", loadGene);
document.getElementById("geneInput").addEventListener("keydown", e => {
  if (e.key === "Enter") loadGene();
});

loadUmap();
