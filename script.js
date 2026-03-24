const STORAGE_KEY = "crm_data_v1";
const EXPIRE_HOURS = 24;

let data = [];
let editId = null;

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  const parsed = JSON.parse(raw);
  const now = Date.now();

  return parsed.filter(item => now - item.createdAt < EXPIRE_HOURS * 60 * 60 * 1000);
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function render() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  data.forEach(item => {
    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <div><strong>${item.name}</strong> (${item.phone})</div>
      <div>${item.address}</div>
      <div>狀態：${item.status}</div>
      <button onclick="editItem('${item.id}')">編輯</button>
      <button onclick="deleteItem('${item.id}')">刪除</button>
    `;

    list.appendChild(div);
  });
}

function addOrUpdate() {
  const name = document.getElementById("name").value;
  const phone = document.getElementById("phone").value;
  const address = document.getElementById("address").value;
  const status = document.getElementById("status").value;

  if (!name) return alert("請輸入名稱");

  if (editId) {
    const item = data.find(i => i.id === editId);
    item.name = name;
    item.phone = phone;
    item.address = address;
    item.status = status;
    editId = null;
  } else {
    data.push({
      id: Date.now().toString(),
      name,
      phone,
      address,
      status,
      createdAt: Date.now()
    });
  }

  saveData();
  render();
  clearForm();
}

function editItem(id) {
  const item = data.find(i => i.id === id);

  document.getElementById("name").value = item.name;
  document.getElementById("phone").value = item.phone;
  document.getElementById("address").value = item.address;
  document.getElementById("status").value = item.status;

  editId = id;
}

function deleteItem(id) {
  if (!confirm("確定刪除？")) return;
  data = data.filter(i => i.id !== id);
  saveData();
  render();
}

function clearForm() {
  document.getElementById("name").value = "";
  document.getElementById("phone").value = "";
  document.getElementById("address").value = "";
  document.getElementById("status").value = "未聯絡";
}

function init() {
  data = loadData();
  saveData();
  render();
}

init();
