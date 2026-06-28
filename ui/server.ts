import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { evaluateChain } from "../src/engine/index.js";
import type { Chain, Cable, Component, ListeningContext } from "../src/types.js";
import {
  networkStreamer, desktopDac, linePreamp,
  solidStateAmp, tubeAmp, desktopHeadphoneAmp,
  bookshelfSpeaker, towerSpeaker, hardToDriveSpeaker,
  highImpedanceHeadphone, planarHeadphone,
  usbCable, xlrInterconnect, speakerCable12awg, speakerCableThin,
} from "../src/seed/components.js";

const COMPONENTS: Record<string, Component> = {
  "src-streamer": networkStreamer,
  "dac-desktop": desktopDac,
  "pre-line": linePreamp,
  "amp-ss": solidStateAmp,
  "amp-tube": tubeAmp,
  "amp-hp": desktopHeadphoneAmp,
  "spk-bookshelf": bookshelfSpeaker,
  "spk-tower": towerSpeaker,
  "spk-hard": hardToDriveSpeaker,
  "hp-300": highImpedanceHeadphone,
  "hp-planar": planarHeadphone,
};

const CABLES: Record<string, Cable> = {
  "usb": usbCable,
  "xlr-interconnect": xlrInterconnect,
  "speaker-12awg": speakerCable12awg,
  "speaker-thin": speakerCableThin,
};

const CATALOG = {
  components: Object.entries(COMPONENTS).map(([id, c]) => ({
    id,
    name: c.name,
    category: c.category,
  })),
  cables: [
    { id: "none",            label: "No cable / built-in" },
    { id: "usb",             label: "USB (1.5 m)" },
    { id: "xlr-interconnect",label: "XLR Interconnect (1 m, balanced)" },
    { id: "speaker-12awg",   label: "Speaker 12 AWG (3 m)" },
    { id: "speaker-thin",    label: "Speaker 18 AWG (8 m, thin)" },
  ],
};

// ---------------------------------------------------------------------------
// HTML (embedded)
// ---------------------------------------------------------------------------

const HTML = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Phon.Audio — Chain Builder</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#f1f5f9;color:#1e293b;min-height:100vh}
a{color:inherit}

/* Header */
header{background:#0f172a;color:#f8fafc;padding:14px 24px;display:flex;align-items:baseline;gap:12px}
header h1{font-size:1.15rem;font-weight:700;letter-spacing:-.02em}
header span{font-size:.82rem;color:#94a3b8}

/* Layout */
.workspace{display:grid;grid-template-columns:210px 1fr 250px;gap:14px;padding:16px;max-width:1180px;margin:0 auto}
.panel{background:#fff;border-radius:10px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.07)}
.panel-title{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:12px}

/* Palette */
.cat-group{margin-bottom:10px}
.cat-label{font-size:.68rem;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
.comp-btn{display:block;width:100%;text-align:left;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 10px;font-size:.8rem;cursor:pointer;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:background .12s,border-color .12s}
.comp-btn:hover{background:#e2e8f0;border-color:#cbd5e1}

/* Chain */
.chain-empty{color:#94a3b8;font-size:.85rem;text-align:center;padding:36px 0}
.chain-node{display:flex;align-items:center;gap:8px;border:1px solid #e2e8f0;border-radius:8px;padding:9px 12px;background:#f8fafc}
.cat-badge{font-size:.62rem;font-weight:700;background:#e2e8f0;color:#475569;padding:2px 7px;border-radius:4px;white-space:nowrap;flex-shrink:0}
.node-name{flex:1;font-size:.83rem;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.remove-btn{background:none;border:none;color:#94a3b8;cursor:pointer;font-size:1.1rem;line-height:1;padding:0 2px;flex-shrink:0}
.remove-btn:hover{color:#ef4444}
.connector{display:flex;align-items:center;gap:6px;padding:3px 10px;color:#94a3b8;font-size:.72rem;margin:2px 0}
.connector-line{width:1px;height:14px;background:#cbd5e1;flex-shrink:0;margin-left:6px}
.cable-select{font-size:.75rem;border:1px solid #e2e8f0;border-radius:5px;padding:3px 6px;background:#fff;color:#475569;cursor:pointer}
.chain-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}

/* Buttons */
.btn{padding:7px 14px;border-radius:6px;font-size:.82rem;cursor:pointer;border:none;font-weight:500;transition:background .12s}
.btn-primary{background:#0f172a;color:#fff}
.btn-primary:hover{background:#1e293b}
.btn-primary:disabled{background:#94a3b8;cursor:not-allowed}
.btn-ghost{background:#f1f5f9;color:#475569;border:1px solid #e2e8f0}
.btn-ghost:hover{background:#e2e8f0}
.btn-demo{background:#dbeafe;color:#1d4ed8;border:1px solid #bfdbfe}
.btn-demo:hover{background:#bfdbfe}

/* Context */
.field{margin-bottom:11px}
.field label{display:block;font-size:.77rem;font-weight:500;color:#475569;margin-bottom:4px}
.field input{width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:6px 10px;font-size:.84rem;color:#1e293b}
.field input:focus{outline:2px solid #3b82f6;border-color:transparent}
#eval-btn{width:100%;margin-top:6px;padding:9px;font-size:.88rem}

/* Results */
#results-wrap{max-width:1180px;margin:0 auto 28px;padding:0 16px}
.results-panel{background:#fff;border-radius:10px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.07)}
.overall{display:inline-flex;align-items:center;gap:8px;padding:6px 16px;border-radius:7px;font-weight:700;font-size:.95rem;margin-bottom:18px}
.v-pass{background:#dcfce7;color:#15803d}
.v-info{background:#dbeafe;color:#1d4ed8}
.v-warn{background:#fef3c7;color:#b45309}
.v-fail{background:#fee2e2;color:#dc2626}
.link-block{border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;overflow:hidden}
.link-hdr{display:flex;align-items:center;gap:10px;padding:9px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
.link-names{flex:1;font-size:.86rem;font-weight:600}
.domain-tag{font-size:.68rem;font-weight:600;background:#e2e8f0;color:#475569;padding:2px 8px;border-radius:10px}
.check-row{display:flex;align-items:flex-start;gap:10px;padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:.83rem}
.check-row:last-child{border-bottom:none}
.check-icon{font-size:.95rem;line-height:1.5;flex-shrink:0;width:18px}
.check-label{font-weight:600;color:#374151;margin-bottom:2px}
.check-exp{color:#6b7280;line-height:1.45}
.sys-hdr{background:#f0f9ff;border-color:#bae6fd}
</style>
</head>
<body>
<header>
  <h1>Phon.Audio</h1>
  <span>Signal chain compatibility engine</span>
</header>

<div class="workspace">

  <!-- Palette -->
  <div class="panel">
    <div class="panel-title">Components</div>
    <div id="palette"></div>
  </div>

  <!-- Chain builder -->
  <div class="panel">
    <div class="panel-title">Chain</div>
    <div id="chain-nodes">
      <p class="chain-empty">Click a component to start building your chain</p>
    </div>
    <div class="chain-actions">
      <button class="btn btn-primary" id="eval-btn-chain">Evaluate</button>
      <button class="btn btn-demo"  id="demo-speaker-btn">Speaker demo</button>
      <button class="btn btn-demo"  id="demo-hp-btn">Headphone demo</button>
      <button class="btn btn-ghost" id="clear-btn">Clear</button>
    </div>
  </div>

  <!-- Context + evaluate -->
  <div class="panel">
    <div class="panel-title">Listening Context</div>
    <div class="field">
      <label>Target SPL (dB)</label>
      <input type="number" id="ctx-spl"   value="85"  min="60" max="120" step="1">
    </div>
    <div class="field">
      <label>Crest factor / headroom (dB)</label>
      <input type="number" id="ctx-crest" value="15"  min="6"  max="30"  step="1">
    </div>
    <div class="field">
      <label>Distance to speaker (m)</label>
      <input type="number" id="ctx-dist"  value="3"   min="0.5" max="20" step="0.5">
    </div>
    <div class="field">
      <label>Room gain (dB)</label>
      <input type="number" id="ctx-room"  value="0"   min="0"  max="12"  step="1">
    </div>
    <button class="btn btn-primary" id="eval-btn">Evaluate chain</button>
  </div>

</div>

<div id="results-wrap"></div>

<script>
const CATALOG = __CATALOG__;

// ---- State ----------------------------------------------------------------
// chain: Array<{ componentId: string, cableToNextId: string }>
let chain = [];

// ---- Constants ------------------------------------------------------------
const CAT_ORDER  = ["source","dac","preamp","power_amp","integrated","headphone_amp","speaker","headphone"];
const CAT_LABELS = {source:"Sources",dac:"DACs",preamp:"Preamps",power_amp:"Power Amps",
                    integrated:"Integrated",headphone_amp:"Headphone Amps",speaker:"Speakers",headphone:"Headphones"};
const CAT_BADGE  = {source:"SRC",dac:"DAC",preamp:"PRE",power_amp:"AMP",
                    integrated:"INT",headphone_amp:"HP-AMP",speaker:"SPK",headphone:"HP"};

const CABLE_SUGGEST = {
  "source->dac":          "usb",
  "dac->preamp":          "xlr-interconnect",
  "dac->power_amp":       "xlr-interconnect",
  "dac->integrated":      "xlr-interconnect",
  "dac->headphone_amp":   "xlr-interconnect",
  "preamp->power_amp":    "xlr-interconnect",
  "preamp->integrated":   "xlr-interconnect",
  "power_amp->speaker":   "speaker-12awg",
  "integrated->speaker":  "speaker-12awg",
  "headphone_amp->headphone": "none",
};

const DEMOS = {
  speaker: [
    {componentId:"src-streamer",   cableToNextId:"usb"},
    {componentId:"dac-desktop",    cableToNextId:"xlr-interconnect"},
    {componentId:"pre-line",       cableToNextId:"xlr-interconnect"},
    {componentId:"amp-ss",         cableToNextId:"speaker-12awg"},
    {componentId:"spk-tower",      cableToNextId:"none"},
  ],
  headphone: [
    {componentId:"src-streamer",   cableToNextId:"usb"},
    {componentId:"dac-desktop",    cableToNextId:"xlr-interconnect"},
    {componentId:"amp-hp",         cableToNextId:"none"},
    {componentId:"hp-300",         cableToNextId:"none"},
  ],
};

// ---- Palette --------------------------------------------------------------
function buildPalette() {
  const grouped = {};
  for (const c of CATALOG.components) {
    (grouped[c.category] ??= []).push(c);
  }
  const el = document.getElementById("palette");
  el.innerHTML = "";
  for (const cat of CAT_ORDER) {
    if (!grouped[cat]) continue;
    const grp = document.createElement("div");
    grp.className = "cat-group";
    const lbl = document.createElement("div");
    lbl.className = "cat-label";
    lbl.textContent = CAT_LABELS[cat] || cat;
    grp.appendChild(lbl);
    for (const c of grouped[cat]) {
      const btn = document.createElement("button");
      btn.className = "comp-btn";
      btn.textContent = c.name;
      btn.title = c.name;
      btn.onclick = () => addComponent(c.id);
      grp.appendChild(btn);
    }
    el.appendChild(grp);
  }
}

// ---- Chain mutations ------------------------------------------------------
function addComponent(id) {
  if (chain.length > 0) {
    const prev = chain[chain.length - 1];
    const prevComp = CATALOG.components.find(c => c.id === prev.componentId);
    const newComp  = CATALOG.components.find(c => c.id === id);
    const key = prevComp?.category + "->" + newComp?.category;
    prev.cableToNextId = CABLE_SUGGEST[key] || "xlr-interconnect";
  }
  chain.push({ componentId: id, cableToNextId: "none" });
  renderChain();
}

function removeComponent(idx) {
  chain.splice(idx, 1);
  renderChain();
}

function loadDemo(name) {
  chain = DEMOS[name].map(n => ({ ...n }));
  renderChain();
  document.getElementById("results-wrap").innerHTML = "";
}

// ---- Render chain ---------------------------------------------------------
function renderChain() {
  const wrap = document.getElementById("chain-nodes");
  if (chain.length === 0) {
    wrap.innerHTML = '<p class="chain-empty">Click a component to start building your chain</p>';
    return;
  }
  wrap.innerHTML = "";
  for (let i = 0; i < chain.length; i++) {
    const node = chain[i];
    const comp = CATALOG.components.find(c => c.id === node.componentId);
    if (!comp) continue;

    // Node card
    const card = document.createElement("div");
    card.className = "chain-node";

    const badge = document.createElement("span");
    badge.className = "cat-badge";
    badge.textContent = CAT_BADGE[comp.category] || comp.category.toUpperCase();

    const name = document.createElement("span");
    name.className = "node-name";
    name.textContent = comp.name;

    const rm = document.createElement("button");
    rm.className = "remove-btn";
    rm.title = "Remove";
    rm.textContent = "×";
    rm.onclick = () => removeComponent(i);

    card.append(badge, name, rm);
    wrap.appendChild(card);

    // Cable connector (between this node and the next)
    if (i < chain.length - 1) {
      const conn = document.createElement("div");
      conn.className = "connector";

      const line = document.createElement("div");
      line.className = "connector-line";

      const arrow = document.createElement("span");
      arrow.textContent = "↓";

      const sel = document.createElement("select");
      sel.className = "cable-select";
      for (const cable of CATALOG.cables) {
        const opt = document.createElement("option");
        opt.value = cable.id;
        opt.textContent = cable.label;
        if (cable.id === (node.cableToNextId || "none")) opt.selected = true;
        sel.appendChild(opt);
      }
      const idx = i; // capture
      sel.onchange = e => { chain[idx].cableToNextId = e.target.value; };

      conn.append(line, arrow, sel);
      wrap.appendChild(conn);
    }
  }
}

// ---- Evaluate -------------------------------------------------------------
function getContext() {
  return {
    targetSplDb:  parseFloat(document.getElementById("ctx-spl").value)   || 85,
    crestFactorDb:parseFloat(document.getElementById("ctx-crest").value) || 15,
    distanceM:    parseFloat(document.getElementById("ctx-dist").value)  || 3,
    roomGainDb:   parseFloat(document.getElementById("ctx-room").value)  || 0,
  };
}

async function evaluate() {
  if (chain.length < 2) {
    alert("Add at least 2 components to evaluate a chain.");
    return;
  }
  const btn1 = document.getElementById("eval-btn");
  const btn2 = document.getElementById("eval-btn-chain");
  btn1.disabled = btn2.disabled = true;
  btn1.textContent = btn2.textContent = "Evaluating…";
  try {
    const res = await fetch("/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodes: chain, context: getContext() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Evaluation failed");
    renderResults(data);
    document.getElementById("results-wrap").scrollIntoView({ behavior: "smooth" });
  } catch(e) {
    alert("Error: " + e.message);
  } finally {
    btn1.disabled = btn2.disabled = false;
    btn1.textContent = "Evaluate chain";
    btn2.textContent = "Evaluate";
  }
}

// ---- Render results -------------------------------------------------------
const VERDICT_CLASS = { pass:"v-pass", info:"v-info", warn:"v-warn", fail:"v-fail" };
const VERDICT_ICON  = { pass:"✅", info:"ℹ️", warn:"⚠️", fail:"❌" };

function makeCheckRow(r) {
  const row = document.createElement("div");
  row.className = "check-row";

  const icon = document.createElement("span");
  icon.className = "check-icon";
  icon.textContent = VERDICT_ICON[r.verdict] || "•";

  const body = document.createElement("div");
  const lbl = document.createElement("div");
  lbl.className = "check-label";
  lbl.textContent = r.label;
  const exp = document.createElement("div");
  exp.className = "check-exp";
  exp.textContent = r.explanation;
  body.append(lbl, exp);

  row.append(icon, body);
  return row;
}

function renderResults(report) {
  const wrap = document.getElementById("results-wrap");
  const panel = document.createElement("div");
  panel.className = "results-panel";

  // Overall badge
  const overall = document.createElement("div");
  overall.className = "overall " + (VERDICT_CLASS[report.overall] || "v-info");
  overall.textContent = (VERDICT_ICON[report.overall] || "") + "  Overall: " + report.overall.toUpperCase();
  panel.appendChild(overall);

  // Per-link sections
  for (const link of report.links) {
    const block = document.createElement("div");
    block.className = "link-block";

    const hdr = document.createElement("div");
    hdr.className = "link-hdr";
    const names = document.createElement("span");
    names.className = "link-names";
    names.textContent = link.from + " → " + link.to;
    const dtag = document.createElement("span");
    dtag.className = "domain-tag";
    dtag.textContent = link.domain;
    const vic = document.createElement("span");
    vic.textContent = VERDICT_ICON[link.verdict] || "";
    hdr.append(names, dtag, vic);
    block.appendChild(hdr);

    for (const r of link.results) block.appendChild(makeCheckRow(r));
    panel.appendChild(block);
  }

  // System section
  const sysBlock = document.createElement("div");
  sysBlock.className = "link-block";
  const sysHdr = document.createElement("div");
  sysHdr.className = "link-hdr sys-hdr";
  const sysTitle = document.createElement("span");
  sysTitle.className = "link-names";
  sysTitle.textContent = "System";
  sysHdr.appendChild(sysTitle);
  sysBlock.appendChild(sysHdr);
  for (const r of report.system) sysBlock.appendChild(makeCheckRow(r));
  panel.appendChild(sysBlock);

  wrap.innerHTML = "";
  wrap.appendChild(panel);
}

// ---- Wire up ---------------------------------------------------------------
document.getElementById("eval-btn").onclick       = evaluate;
document.getElementById("eval-btn-chain").onclick  = evaluate;
document.getElementById("clear-btn").onclick       = () => { chain = []; renderChain(); document.getElementById("results-wrap").innerHTML = ""; };
document.getElementById("demo-speaker-btn").onclick= () => loadDemo("speaker");
document.getElementById("demo-hp-btn").onclick     = () => loadDemo("headphone");

buildPalette();
</script>
</body>
</html>`;

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

const PORT = 3000;

http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  // Serve UI
  if (req.method === "GET" && url.pathname === "/") {
    const page = HTML.replace("__CATALOG__", JSON.stringify(CATALOG));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(page);
    return;
  }

  // Evaluate endpoint
  if (req.method === "POST" && url.pathname === "/evaluate") {
    try {
      const body = JSON.parse(await readBody(req)) as {
        nodes: { componentId: string; cableToNextId?: string }[];
        context: ListeningContext;
      };

      const nodes = body.nodes.map((n) => {
        const component = COMPONENTS[n.componentId];
        if (!component) throw new Error(`Unknown component id: "${n.componentId}"`);
        const cableId = n.cableToNextId;
        const cableToNext = (cableId && cableId !== "none") ? CABLES[cableId] : undefined;
        if (cableId && cableId !== "none" && !cableToNext) {
          throw new Error(`Unknown cable id: "${cableId}"`);
        }
        return cableToNext ? { component, cableToNext } : { component };
      });

      const chain: Chain = { context: body.context, nodes };
      const report = evaluateChain(chain);
      sendJson(res, 200, report);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      sendJson(res, 400, { error: msg });
    }
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}).listen(PORT, () => {
  console.log(`\nPhon.Audio UI  →  http://localhost:${PORT}\n`);
});
