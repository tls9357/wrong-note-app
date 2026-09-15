(() => {
  let entries = [];
  let currentMode = "text";
  let currentPhotoData = null; // dataURL of compressed photo (add/edit form)
  let editingId = null;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function todayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function formatDateLabel(iso) {
    const [, m, d] = iso.split("-");
    return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
  }

  function formatDateFull(iso) {
    const [y, m, d] = iso.split("-");
    return `${y}.${m}.${d}`;
  }

  // ---------- Tabs ----------
  function initTabs() {
    $$(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });
  }

  function switchTab(tab) {
    $$(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    $$(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === `tab-${tab}`));
    if (tab === "stats") renderStats();
    if (tab === "list") renderList();
  }

  // ---------- Data loading ----------
  async function loadEntries() {
    entries = await NoteDB.getAll();
    entries.sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  }

  // ---------- List rendering ----------
  function renderList() {
    const listEl = $("#entryList");
    const emptyMsg = $("#emptyMsg");
    const query = $("#searchInput").value.trim().toLowerCase();

    let filtered = entries.filter((e) => {
      if (query) {
        const hay = `${e.problemText || ""} ${e.memo || ""} ${e.tag || ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    listEl.innerHTML = "";
    emptyMsg.hidden = entries.length !== 0;

    if (entries.length !== 0 && filtered.length === 0) {
      const p = document.createElement("p");
      p.className = "empty-msg";
      p.textContent = "조건에 맞는 오답이 없어요.";
      listEl.appendChild(p);
      return;
    }

    filtered.forEach((entry) => {
      const card = document.createElement("div");
      card.className = "entry-card";
      card.addEventListener("click", () => openDetail(entry.id));

      if (entry.mode === "photo" && entry.imageData) {
        const img = document.createElement("img");
        img.className = "entry-thumb";
        img.src = entry.imageData;
        img.alt = "";
        card.appendChild(img);
      } else {
        const ph = document.createElement("div");
        ph.className = "entry-thumb-placeholder";
        ph.textContent = "✍️";
        card.appendChild(ph);
      }

      const main = document.createElement("div");
      main.className = "entry-main";
      main.innerHTML = `
        <div class="entry-top">
          <span class="entry-subject">${escapeHtml(entry.tag || "단원 미지정")}</span>
          <span class="entry-date">${formatDateLabel(entry.date)}</span>
        </div>
        <div class="entry-snippet">${escapeHtml(entry.problemText || (entry.mode === "photo" ? "(사진 문제)" : ""))}</div>
      `;
      card.appendChild(main);
      listEl.appendChild(card);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Detail modal ----------
  function openDetail(id) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    const modal = $("#detailModal");
    const body = $("#modalBody");

    body.innerHTML = `
      <div class="detail-row"><div class="k">날짜</div><div class="v">${formatDateFull(entry.date)}</div></div>
      ${entry.tag ? `<div class="detail-row"><div class="k">단원/태그</div><div class="v">${escapeHtml(entry.tag)}</div></div>` : ""}
      ${
        entry.mode === "photo" && entry.imageData
          ? `<div class="detail-row"><div class="k">문제 사진</div><img src="${entry.imageData}" alt="문제 사진" /></div>`
          : `<div class="detail-row"><div class="k">문제</div><div class="v">${escapeHtml(entry.problemText || "")}</div></div>`
      }
      <div class="detail-row"><div class="k">정답</div><div class="v">${escapeHtml(entry.correctAnswer || "")}</div></div>
      ${entry.myAnswer ? `<div class="detail-row"><div class="k">내가 쓴 답</div><div class="v">${escapeHtml(entry.myAnswer)}</div></div>` : ""}
      ${entry.memo ? `<div class="detail-row"><div class="k">해설/메모</div><div class="v">${escapeHtml(entry.memo)}</div></div>` : ""}
      <div class="detail-actions">
        <button class="secondary-btn" id="editEntryBtn">수정</button>
        <button class="danger-btn" id="deleteEntryBtn">삭제</button>
      </div>
    `;

    $("#editEntryBtn").addEventListener("click", () => {
      closeDetail();
      startEdit(entry);
    });
    $("#deleteEntryBtn").addEventListener("click", async () => {
      if (confirm("이 오답을 삭제할까요?")) {
        await NoteDB.remove(entry.id);
        await loadEntries();
        closeDetail();
        renderList();
      }
    });

    modal.hidden = false;
  }

  function closeDetail() {
    $("#detailModal").hidden = true;
  }

  // ---------- Form: mode / subject toggles ----------
  function initFormControls() {
    $$(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => setMode(btn.dataset.mode));
    });

    $("#problemPhoto").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const compressed = await ImageUtil.compress(file);
      currentPhotoData = compressed;
      $("#photoPreviewImg").src = compressed;
      $("#photoPreview").hidden = false;
    });

    $("#removePhotoBtn").addEventListener("click", () => {
      currentPhotoData = null;
      $("#problemPhoto").value = "";
      $("#photoPreview").hidden = true;
    });

    $("#cancelEditBtn").addEventListener("click", () => resetForm());

    $("#entryForm").addEventListener("submit", handleSubmit);
  }

  function setMode(mode) {
    currentMode = mode;
    $$(".mode-btn").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
    $("#modeText").hidden = mode !== "text";
    $("#modePhoto").hidden = mode !== "photo";
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const date = $("#entryDate").value || todayISO();
    const tag = $("#entryTag").value.trim();
    const correctAnswer = $("#correctAnswer").value.trim();
    const myAnswer = $("#myAnswer").value.trim();
    const memo = $("#memo").value.trim();
    const problemText = $("#problemText").value.trim();

    if (currentMode === "text" && !problemText) {
      alert("문제 내용을 입력해주세요.");
      return;
    }
    if (currentMode === "photo" && !currentPhotoData) {
      alert("문제 사진을 등록해주세요.");
      return;
    }

    const entry = {
      date,
      tag,
      mode: currentMode,
      problemText: currentMode === "text" ? problemText : "",
      imageData: currentMode === "photo" ? currentPhotoData : null,
      correctAnswer,
      myAnswer,
      memo,
      createdAt: Date.now(),
    };

    if (editingId != null) {
      entry.id = editingId;
      await NoteDB.put(entry);
    } else {
      await NoteDB.add(entry);
    }

    await loadEntries();
    resetForm();
    switchTab("list");
  }

  function startEdit(entry) {
    editingId = entry.id;
    $("#submitBtn").textContent = "오답 수정 완료";
    $("#cancelEditBtn").hidden = false;

    $("#entryDate").value = entry.date;
    $("#entryTag").value = entry.tag || "";
    $("#correctAnswer").value = entry.correctAnswer || "";
    $("#myAnswer").value = entry.myAnswer || "";
    $("#memo").value = entry.memo || "";
    $("#problemText").value = entry.problemText || "";

    setMode(entry.mode);
    if (entry.mode === "photo" && entry.imageData) {
      currentPhotoData = entry.imageData;
      $("#photoPreviewImg").src = entry.imageData;
      $("#photoPreview").hidden = false;
    } else {
      currentPhotoData = null;
      $("#photoPreview").hidden = true;
    }

    switchTab("add");
  }

  function resetForm() {
    editingId = null;
    $("#submitBtn").textContent = "오답 저장";
    $("#cancelEditBtn").hidden = true;
    $("#entryForm").reset();
    $("#entryDate").value = todayISO();
    currentPhotoData = null;
    $("#photoPreview").hidden = true;
    setMode("text");
  }

  // ---------- Stats ----------
  function renderStats() {
    const tiles = $("#statTiles");
    const total = entries.length;

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 6);
    const weekAgoISO = weekAgo.toISOString().slice(0, 10);
    const thisWeekCount = entries.filter((e) => e.date >= weekAgoISO).length;

    const byTag = {};
    entries.forEach((e) => {
      const key = e.tag || "단원 미지정";
      byTag[key] = (byTag[key] || 0) + 1;
    });
    const topTag = Object.entries(byTag).sort((a, b) => b[1] - a[1])[0];

    tiles.innerHTML = `
      <div class="stat-tile"><div class="value">${total}</div><div class="label">전체 오답</div></div>
      <div class="stat-tile"><div class="value">${thisWeekCount}</div><div class="label">최근 7일</div></div>
      <div class="stat-tile"><div class="value">${topTag ? topTag[0] : "-"}</div><div class="label">가장 많이 틀린 단원</div></div>
    `;

    const tagData = Object.entries(byTag)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));
    Charts.renderBarChart($("#tagChart"), tagData, {
      ariaLabel: "단원별 오답 수",
      emptyText: "등록된 오답이 없어요.",
    });

    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const countByDay = {};
    entries.forEach((e) => {
      if (days.includes(e.date)) countByDay[e.date] = (countByDay[e.date] || 0) + 1;
    });
    const trendData = days.map((d) => ({ label: formatDateLabel(d), value: countByDay[d] || 0 }));
    Charts.renderBarChart($("#trendChart"), trendData, {
      ariaLabel: "최근 14일 오답 등록 추이",
      minBarSlot: 26,
      color: getComputedStyle(document.documentElement).getPropertyValue("--accent-2").trim(),
    });
  }

  // ---------- 유형 분석 ----------
  // For now: only 마플시너지 can be the "currently solving" workbook, and only
  // 쎈 is available as a "find similar type" target. Listed as id arrays so more
  // workbooks can be added later without reworking this logic.
  const SOURCE_WORKBOOK_IDS = ["mapl-synergy-common2", "rpm-common2"];
  const TARGET_WORKBOOK_IDS = ["ssen-common2"];

  // Maps a workbookId to its full problem-content lookup (text/choices/figure),
  // used for worksheet generation. Only workbooks with extracted content appear here.
  const PROBLEM_CONTENT_BY_WORKBOOK = {
    "ssen-common2": typeof SSEN_PROBLEMS !== "undefined" ? SSEN_PROBLEMS : {},
  };

  const CIRCLED_DIGITS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"];

  function initAnalyzeTab() {
    const sourceSel = $("#sourceWorkbookSelect");
    sourceSel.innerHTML = "";
    SOURCE_WORKBOOK_IDS.forEach((id) => {
      const wb = MATH_WORKBOOKS[id];
      if (!wb) return;
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = wb.name;
      sourceSel.appendChild(opt);
    });

    const targetChips = $("#targetWorkbookChips");
    targetChips.innerHTML = "";
    TARGET_WORKBOOK_IDS.forEach((id) => {
      const wb = MATH_WORKBOOKS[id];
      if (!wb) return;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip active";
      chip.dataset.workbook = id;
      chip.textContent = wb.name;
      chip.addEventListener("click", () => chip.classList.toggle("active"));
      targetChips.appendChild(chip);
    });

    $("#analyzeBtn").addEventListener("click", () => {
      const workbookId = sourceSel.value;
      const targetIds = $$("#targetWorkbookChips .chip.active").map((c) => c.dataset.workbook);
      const raw = $("#wrongNumbersInput").value;
      const result = TypeAnalysis.analyze(workbookId, raw);
      renderAnalyzeResult(result, workbookId, targetIds);
    });

    $("#worksheetCloseBtn").addEventListener("click", closeWorksheet);
    $("#worksheetPrintBtn").addEventListener("click", () => window.print());
  }

  function renderAnalyzeResult(result, workbookId, targetIds) {
    const el = $("#analyzeResult");

    if (result.totalInput === 0) {
      el.innerHTML = "";
      return;
    }

    let html = `<div class="analyze-summary">입력 ${result.totalInput}개 · 매칭 ${result.matchedCount}개${
      result.duplicates.length ? ` · 중복 ${result.duplicates.length}개` : ""
    }${result.notFound.length ? ` · 찾을 수 없음 ${result.notFound.length}개` : ""}</div>`;

    // per-target-workbook combined cross-book worksheet number set
    const crossByWorkbook = new Map(); // workbookId -> { name, numbers: Set }

    if (result.groups.length) {
      html += '<div id="analyzeChart" class="chart-holder" style="margin-bottom:14px;"></div>';
      result.groups.forEach((g) => {
        const crossResults = targetIds
          .map((targetId) => TypeAnalysis.findCrossRefNumbers(workbookId, targetId, g.section, g.type))
          .filter((c) => c && c.numbers.length);

        crossResults.forEach((cross) => {
          if (!crossByWorkbook.has(cross.workbookId)) {
            crossByWorkbook.set(cross.workbookId, { name: cross.workbookName, numbers: new Set() });
          }
          cross.numbers.forEach((n) => crossByWorkbook.get(cross.workbookId).numbers.add(n));
        });

        html += `
          <div class="type-group">
            <div class="type-group-main">
              <div class="type-group-name">${escapeHtml(g.type)}</div>
              <div class="type-group-path">${escapeHtml(g.chapter)} &gt; ${escapeHtml(g.section)}</div>
              <div class="type-group-numbers">${g.numbers.map(escapeHtml).join(", ")}</div>
              ${crossResults
                .map(
                  (cross) =>
                    `<div class="cross-ref"><span class="cross-ref-label">🔗 ${escapeHtml(cross.workbookName)} 유사문제 (${escapeHtml(cross.section)} · ${escapeHtml(cross.type)})</span><div class="type-group-numbers">${cross.numbers.map(escapeHtml).join(", ")}</div></div>`
                )
                .join("")}
            </div>
            <div class="type-group-count">${g.count}</div>
          </div>
        `;
      });
    } else {
      html += `<p class="empty-msg">매칭된 문제가 없어요.</p>`;
    }

    if (result.notFound.length) {
      html += `
        <div class="notfound-box">
          <div class="k">문제집에서 찾을 수 없는 번호</div>
          <div>${result.notFound.map(escapeHtml).join(", ")}</div>
        </div>
      `;
    }

    crossByWorkbook.forEach((info, targetWorkbookId) => {
      const sortedNumbers = Array.from(info.numbers).sort();
      const hasContent = !!PROBLEM_CONTENT_BY_WORKBOOK[targetWorkbookId];
      html += `
        <div class="worksheet-box">
          <div class="k">📄 학습지용 ${escapeHtml(info.name)} 문제 번호 (${sortedNumbers.length}개)</div>
          <textarea class="worksheet-numbers" readonly onclick="this.select()">${sortedNumbers.join(", ")}</textarea>
          ${
            hasContent
              ? `<button type="button" class="primary-btn make-worksheet-btn" data-workbook="${escapeHtml(targetWorkbookId)}" data-numbers="${escapeHtml(sortedNumbers.join(","))}">📄 학습지 만들기 (PDF)</button>`
              : `<p class="worksheet-hint">이 문제집은 아직 인쇄용 문제 내용이 준비되지 않았어요.</p>`
          }
        </div>
      `;
    });

    el.innerHTML = html;

    if (result.groups.length) {
      const chartData = result.groups.map((g) => ({ label: g.type, value: g.count }));
      Charts.renderBarChart($("#analyzeChart"), chartData, { ariaLabel: "유형별 오답 개수" });
    }

    $$(".make-worksheet-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const workbookId2 = btn.dataset.workbook;
        const numbers = btn.dataset.numbers.split(",").filter(Boolean);
        openWorksheet(workbookId2, numbers);
      });
    });
  }

  // ---------- 학습지 (인쇄용 A4, 4문제/페이지) ----------
  function renderMathHtml(text) {
    return escapeHtml(text || "");
  }

  function openWorksheet(workbookId, numbers) {
    const problems = PROBLEM_CONTENT_BY_WORKBOOK[workbookId] || {};
    const pages = [];
    for (let i = 0; i < numbers.length; i += 4) {
      pages.push(numbers.slice(i, i + 4));
    }

    const pagesHtml = pages
      .map((pageNums) => {
        const cellsHtml = pageNums
          .map((num) => {
            const p = problems[num];
            if (!p) {
              return `<div class="worksheet-cell"><div class="ws-num">${escapeHtml(num)}</div><p class="ws-missing">문제 내용을 찾을 수 없어요.</p></div>`;
            }
            const choicesHtml = p.choices
              ? `<ol class="ws-choices">${p.choices
                  .map((c, idx) => `<li>${CIRCLED_DIGITS[idx] || `(${idx + 1})`} ${renderMathHtml(c)}</li>`)
                  .join("")}</ol>`
              : "";
            const figureHtml = p.figure ? `<img class="ws-figure" src="${escapeHtml("data/" + p.figure)}" alt="문제 ${escapeHtml(num)} 그림" />` : "";
            return `
              <div class="worksheet-cell">
                <div class="ws-num">${escapeHtml(num)}</div>
                <div class="ws-text">${renderMathHtml(p.text)}</div>
                ${figureHtml}
                ${choicesHtml}
              </div>
            `;
          })
          .join("");
        return `<div class="worksheet-page">${cellsHtml}</div>`;
      })
      .join("");

    $("#worksheetContent").innerHTML = pagesHtml;
    $("#worksheetModal").hidden = false;

    if (window.renderMathInElement) {
      window.renderMathInElement($("#worksheetContent"), {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
        throwOnError: false,
      });
    }
  }

  function closeWorksheet() {
    $("#worksheetModal").hidden = true;
    $("#worksheetContent").innerHTML = "";
  }

  // ---------- Init ----------
  async function init() {
    initTabs();
    initFormControls();
    initAnalyzeTab();
    $("#searchInput").addEventListener("input", renderList);
    $("#modalClose").addEventListener("click", closeDetail);
    $("#detailModal").addEventListener("click", (e) => {
      if (e.target.id === "detailModal") closeDetail();
    });
    $("#worksheetModal").addEventListener("click", (e) => {
      if (e.target.id === "worksheetModal") closeWorksheet();
    });

    $("#entryDate").value = todayISO();

    await loadEntries();
    renderList();
  }

  document.addEventListener("DOMContentLoaded", init);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch((err) => {
        console.warn("service worker registration failed:", err);
      });
    });
  }
})();
