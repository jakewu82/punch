const STORAGE_KEY = "crm_data_v2";
const EXPIRE_MS = 24 * 60 * 60 * 1000;

let records = [];
let editingId = null;

const el = {
  form: document.getElementById("crmForm"),
  formTitle: document.getElementById("formTitle"),
  submitBtn: document.getElementById("submitBtn"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),
  clearAllBtn: document.getElementById("clearAllBtn"),
  exportCsvBtn: document.getElementById("exportCsvBtn"),
  searchInput: document.getElementById("searchInput"),
  filterStatus: document.getElementById("filterStatus"),
  list: document.getElementById("list"),
  emptyState: document.getElementById("emptyState"),
  stats: document.getElementById("stats"),
  storageHint: document.getElementById("storageHint"),
  name: document.getElementById("name"),
  phone: document.getElementById("phone"),
  address: document.getElementById("address"),
  status: document.getElementById("status"),
  note: document.getElementById("note"),
};

function safeParse(raw) {
  try { return JSON.parse(raw); } catch { return []; }
}

function loadRecords() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = safeParse(raw);
  const now = Date.now();
  const valid = Array.isArray(parsed)
    ? parsed.filter(item => item && item.createdAt && now - item.createdAt < EXPIRE_MS)
    : [];
  records = valid;
  persistRecords();
}

function persistRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  updateStorageHint();
}

function updateStorageHint() {
  if (!records.length) {
    el.storageHint.textContent = "目前沒有暫存資料。資料會保留 24 小時。";
    return;
  }
  const latestExpireAt = Math.max(...records.map(item => item.createdAt + EXPIRE_MS));
  const diffMs = Math.max(latestExpireAt - Date.now(), 0);
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  const mins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
  el.storageHint.textContent = `目前已暫存 ${records.length} 筆資料，最晚約 ${hours} 小時 ${mins} 分後到期。`;
}

function getFilteredRecords() {
  const keyword = el.searchInput.value.trim().toLowerCase();
  const status = el.filterStatus.value;
  return records.filter(item => {
    const matchesKeyword = !keyword || [item.name, item.phone, item.address, item.note, item.status]
      .filter(Boolean)
      .some(text => String(text).toLowerCase().includes(keyword));
    const matchesStatus = !status || item.status === status;
    return matchesKeyword && matchesStatus;
  });
}

function renderStats(list) {
  const total = list.length;
  const interest = list.filter(x => x.status === "有興趣").length;
  const deal = list.filter(x => x.status === "已成交").length;
  const follow = list.filter(x => x.status === "追蹤中").length;
  el.stats.innerHTML = `
    <div class="stat"><div class="label">目前顯示</div><div class="value">${total}</div></div>
    <div class="stat"><div class="label">有興趣</div><div class="value">${interest}</div></div>
    <div class="stat"><div class="label">追蹤中</div><div class="value">${follow}</div></div>
    <div class="stat"><div class="label">已成交</div><div class="value">${deal}</div></div>
  `;
}

function renderList() {
  const list = getFilteredRecords();
  renderStats(list);
  el.list.innerHTML = "";
  el.emptyState.style.display = list.length ? "none" : "block";

  list.forEach(item => {
    const card = document.createElement("div");
    card.className = "item";
    card.innerHTML = `
      <div class="item-head">
        <div>
          <div class="item-title">${escapeHtml(item.name || "")}</div>
          <div class="meta">
            <div>電話：${escapeHtml(item.phone || "-")}</div>
            <div>地址：${escapeHtml(item.address || "-")}</div>
            <div>建立時間：${formatDate(item.createdAt)}</div>
          </div>
        </div>
        <div class="badge">${escapeHtml(item.status || "未聯絡")}</div>
      </div>
      ${item.note ? `<div class="item-note">備註：${escapeHtml(item.note)}</div>` : ""}
      <div class="item-actions">
        <button type="button" class="secondary" data-edit="${item.id}">編輯</button>
        <button type="button" class="danger" data-delete="${item.id}">刪除</button>
      </div>
    `;
    el.list.appendChild(card);
  });
}

function resetForm() {
  el.form.reset();
  el.status.value = "未聯絡";
  editingId = null;
  el.formTitle.textContent = "新增名單";
  el.submitBtn.textContent = "儲存名單";
}

function fillForm(item) {
  el.name.value = item.name || "";
  el.phone.value = item.phone || "";
  el.address.value = item.address || "";
  el.status.value = item.status || "未聯絡";
  el.note.value = item.note || "";
  editingId = item.id;
  el.formTitle.textContent = "編輯名單";
  el.submitBtn.textContent = "更新名單";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function upsertRecord(event) {
  event.preventDefault();
  const name = el.name.value.trim();
  const phone = el.phone.value.trim();
  const address = el.address.value.trim();
  const status = el.status.value;
  const note = el.note.value.trim();

  if (!name) {
    alert("請先輸入公司 / 姓名");
    el.name.focus();
    return;
  }

  if (editingId) {
    const idx = records.findIndex(item => item.id === editingId);
    if (idx !== -1) {
      records[idx] = { ...records[idx], name, phone, address, status, note, updatedAt: Date.now() };
    }
  } else {
    records.unshift({
      id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
      name, phone, address, status, note,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  persistRecords();
  renderList();
  resetForm();
}

function handleListClick(event) {
  const editId = event.target.getAttribute("data-edit");
  const deleteId = event.target.getAttribute("data-delete");

  if (editId) {
    const item = records.find(x => x.id === editId);
    if (item) fillForm(item);
    return;
  }

  if (deleteId) {
    if (!confirm("確定要刪除這筆名單嗎？")) return;
    records = records.filter(x => x.id !== deleteId);
    persistRecords();
    renderList();
    if (editingId === deleteId) resetForm();
  }
}

function clearAll() {
  if (!records.length) {
    alert("目前沒有資料可清空");
    return;
  }
  if (!confirm("確定要清空全部暫存資料嗎？")) return;
  records = [];
  localStorage.removeItem(STORAGE_KEY);
  renderList();
  resetForm();
  updateStorageHint();
}

function toCsvValue(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function exportCsv() {
  if (!records.length) {
    alert("目前沒有資料可匯出");
    return;
  }

  const headers = ["公司/姓名", "電話", "地址", "狀態", "備註", "建立時間", "更新時間"];
  const rows = records.map(item => [
    item.name, item.phone, item.address, item.status, item.note,
    formatDate(item.createdAt), formatDate(item.updatedAt)
  ]);

  const csv = [headers, ...rows].map(row => row.map(toCsvValue).join(",")).join("\r\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date();
  const fileName = `crm-export-${date.getFullYear()}${String(date.getMonth()+1).padStart(2,"0")}${String(date.getDate()).padStart(2,"0")}.csv`;
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatDate(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function bindEvents() {
  el.form.addEventListener("submit", upsertRecord);
  el.list.addEventListener("click", handleListClick);
  el.cancelEditBtn.addEventListener("click", resetForm);
  el.clearAllBtn.addEventListener("click", clearAll);
  el.exportCsvBtn.addEventListener("click", exportCsv);
  el.searchInput.addEventListener("input", renderList);
  el.filterStatus.addEventListener("change", renderList);
}

function init() {
  loadRecords();
  bindEvents();
  renderList();
  updateStorageHint();
  el.status.value = "未聯絡";
}

init();
