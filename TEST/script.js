import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/11.8.0/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.8.0/firebase-analytics.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCI3Vb9KpGKHeZwQe_pRy_fNgWm9znu4IU",
  authDomain: "hr-coin-253bc.firebaseapp.com",
  projectId: "hr-coin-253bc",
  storageBucket: "hr-coin-253bc.appspot.com",
  messagingSenderId: "54944189886",
  appId: "1:54944189886:web:a892cb00d43a4a57b6fdef",
  measurementId: "G-86YQ8GQSY5",
  databaseURL: "https://hr-coin-253bc-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
getAnalytics(app);
const db = getDatabase(app);

// Список имён рекрутеров
const allowedNames = [
  'Иван', 'Мария', 'Антон', 'Светлана', 'Дмитрий', 'Ольга', 'Павел', 'Елена'
];

let users = {};         // Вся база рекрутеров
let avatarPreviewData = null;
let currentUser = null;

// Загрузка всех рекрутеров из Firebase
async function loadUsers(callback) {
  const usersRef = ref(db, 'users');
  const snapshot = await get(usersRef);
  users = snapshot.exists() ? snapshot.val() : {};
  if (callback) callback();
}

// Сохранение всех рекрутеров в Firebase
function saveUsers() {
  return set(ref(db, 'users'), users);
}

// После любого изменения данных — сразу обновляем в базе
function syncAndRender(cb) {
  saveUsers().then(() => {
    if (cb) cb();
  });
}

// Вход
function login() {
  document.getElementById('username').blur();
  const username = document.getElementById('username').value.trim();

  if (!username) {
    showError('Введите имя');
    return false;
  }

  // Спецдоступ для админа
  if (username === 'vlasovadmin') {
    loadUsers(() => {
      document.getElementById('login-panel').classList.add('hidden');
      document.getElementById('admin-panel').classList.remove('hidden');
      renderAdminPanel();
    });
    return false;
  }

  const allowed = allowedNames.some(n => n.toLowerCase() === username.toLowerCase());
  if (!allowed) {
    showError('Доступ запрещён. Ваше имя не в списке.');
    return false;
  }

  // Загружаем общие данные, затем работаем
  loadUsers(() => {
    // Если пользователя нет — создать
    if (!users[username]) {
      users[username] = {
        coins: 0,
        candidates: [],
        gifts: [],
        avatar: ''
      };
      saveUsers();
    }
    currentUser = username;
    updateDashboardAvatar();
    document.getElementById('user-welcome').innerText = currentUser;
    document.getElementById('login-panel').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    showTab('stats');
  });
  return false;
}

// Админ-панель
function renderAdminPanel() {
  const table = document.getElementById('admin-user-list');
  table.innerHTML = '';
  Object.entries(users).forEach(([name, u]) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="border px-4 py-2">${name}</td>
      <td class="border px-4 py-2">${u.coins}</td>
      <td class="border px-4 py-2">${(u.candidates || []).length}</td>
      <td class="border px-4 py-2">${(u.gifts || []).join(', ')}</td>
      <td class="border px-4 py-2 text-center">
        <button onclick="deleteUser('${name}')" class="bg-red-500 text-white px-2 py-1 rounded">Удалить</button>
      </td>`;
    table.appendChild(row);
  });
}

// Удаление юзера админом
function deleteUser(name) {
  delete users[name];
  syncAndRender(renderAdminPanel);
}

// Личный кабинет
function showTab(tab) {
  const content = document.getElementById('content');
  const user = users[currentUser];
  content.classList.remove('animate__fadeInUp');
  void content.offsetWidth; // restart animation
  content.classList.add('animate__fadeInUp');
  if (tab === 'stats') {
    const totalCandidates = user.candidates.length;
    const closedCandidates = user.candidates.filter(c => c.status && c.status !== '').length;
    content.innerHTML = `
      <div class="bg-white p-6 rounded-xl shadow animate__animated animate__fadeInUp">
        <h3 class="text-xl font-bold mb-4">📊 Статистика</h3>
        <p>Баллы: <strong>${user.coins}</strong></p>
        <p>Кандидатов всего: <strong>${totalCandidates}</strong></p>
        <p>Кандидатов закрыто: <strong>${closedCandidates}</strong></p>
      </div>`;
  } else if (tab === 'gifts') {
    content.innerHTML = `
      <div class="bg-white p-6 rounded-xl shadow animate__animated animate__fadeInUp">
        <h3 class="text-xl font-bold mb-4">🎁 Мои подарки</h3>
        <ul class="list-disc pl-5">${user.gifts.map(g => `<li>${g}</li>`).join('') || '<li>Нет подарков</li>'}</ul>
      </div>`;
  } else if (tab === 'shop') {
    content.innerHTML = `
      <div class="bg-white p-6 rounded-xl shadow animate__animated animate__fadeInUp">
        <h3 class="text-xl font-bold mb-4">🛍 Магазин</h3>
        <ul class="space-y-4">
          <li>☕ Кофе — 100 Coin <button onclick="buyGift('Кофе', 100)" class="bg-blue-500 text-white px-3 py-1 rounded ml-2">Купить</button></li>
          <li>📚 Книга — 200 Coin <button onclick="buyGift('Книга', 200)" class="bg-blue-500 text-white px-3 py-1 rounded ml-2">Купить</button></li>
          <li>🏝 Выходной — 500 Coin <button onclick="buyGift('Выходной', 500)" class="bg-blue-500 text-white px-3 py-1 rounded ml-2">Купить</button></li>
        </ul>
      </div>`;
  } else if (tab === 'candidates') {
    content.innerHTML = `
      <div class="bg-white p-6 rounded-xl shadow animate__animated animate__fadeInUp">
        <h3 class="text-xl font-bold mb-4">👥 Кандидаты</h3>
        <form id="candidate-form" onsubmit="addCandidate(); return false;">
          <input id="newCandidate" class="border p-2 rounded w-full mb-4" placeholder="Имя кандидата" autocomplete="off" />
          <button type="submit" class="bg-indigo-500 text-white px-4 py-2 rounded">Добавить</button>
        </form>
        <div id="candidateList" class="mt-4 space-y-2"></div>
      </div>`;
    renderCandidates();
  } else if (tab === 'guide') {
    content.innerHTML = `
      <div class="bg-white p-6 rounded-xl shadow animate__animated animate__fadeInUp">
        <h3 class="text-xl font-bold mb-4">ℹ️ Как пользоваться сайтом</h3>
        <ul class="list-disc pl-5 space-y-2 text-left">
          <li>💡 Добавляй кандидатов через вкладку "Кандидаты".</li>
          <li>✅ Присваивай статус, чтобы заработать баллы (HR Coins).</li>
          <li>🎁 Трать баллы в магазине на подарки!</li>
          <li>📊 Отслеживай прогресс во вкладке "Статистика".</li>
          <li>🧹 Удаляй кандидатов — баллы возвращаются.</li>
          <li>🛠 Админ видит всех пользователей и может удалять их.</li>
        </ul>
        <div class="mt-4 text-center">
          <img src="https://cdn-icons-png.flaticon.com/512/4712/4712102.png" alt="Guide" class="w-24 mx-auto animate__animated animate__pulse animate__infinite" />
        </div>
      </div>`;
  } else if (tab === 'rating') {
    // Для рейтинга нужен свежий users
    loadUsers(() => {
      const userList = Object.entries(users)
        .filter(([name]) => name !== 'vlasovadmin')
        .map(([name, u]) => ({
          name,
          coins: u.coins,
          closed: (u.candidates || []).filter(c => c.status && c.status !== '').length
        }))
        .sort((a, b) => b.closed - a.closed);

      content.innerHTML = `
        <div class="bg-white p-6 rounded-xl shadow animate__animated animate__fadeInUp">
          <h3 class="text-xl font-bold mb-4">🏆 Общий рейтинг рекрутеров</h3>
          <table class="w-full table-auto">
            <thead>
              <tr>
                <th class="px-2 py-1">#</th>
                <th class="px-2 py-1">Имя</th>
                <th class="px-2 py-1">Закрытых кандидатов</th>
                <th class="px-2 py-1">Баллы</th>
              </tr>
            </thead>
            <tbody>
              ${userList.map((u, i) => `
                <tr class="${u.name === currentUser ? 'bg-indigo-100 font-bold' : ''}">
                  <td class="px-2 py-1 text-center">${i + 1}</td>
                  <td class="px-2 py-1">${u.name}</td>
                  <td class="px-2 py-1 text-center">${u.closed}</td>
                  <td class="px-2 py-1 text-center">${u.coins}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    });
  }
}

// Добавление кандидата (через форму)
function addCandidate() {
  const candidateInput = document.getElementById('newCandidate');
  const name = candidateInput.value.trim();
  if (!name) return false;
  users[currentUser].candidates.push({ name, status: null });
  syncAndRender(renderCandidates);
  candidateInput.value = '';
  candidateInput.blur();
  return false;
}

// Список кандидатов
function renderCandidates() {
  const list = document.getElementById('candidateList');
  const candidates = users[currentUser].candidates;
  list.innerHTML = candidates.map((c, i) => `
    <div class="p-3 bg-gray-100 rounded-lg flex flex-col md:flex-row justify-between items-center gap-2">
      <span><strong>${c.name}</strong></span>
      <div class="flex items-center gap-2">
        <select id="status-select-${i}" class="border rounded px-2 py-1">
          <option value="">Выбрать статус</option>
          <option value="Русский агент" ${c.status === 'Русский агент' ? 'selected' : ''}>Русский агент</option>
          <option value="Иностранный агент" ${c.status === 'Иностранный агент' ? 'selected' : ''}>Иностранный агент</option>
        </select>
        <button onclick="confirmCandidateStatus(${i})" class="bg-green-500 text-white px-2 py-1 rounded">Сохранить</button>
        ${c.closedAt ? `<span class="text-sm text-gray-500">${c.closedAt}</span>` : ''}
        <button onclick="removeCandidate(${i})" class="bg-red-500 text-white px-2 py-1 rounded">Удалить</button>
      </div>
    </div>`).join('');
}

// Сохранение статуса кандидата
function confirmCandidateStatus(index) {
  const select = document.getElementById(`status-select-${index}`);
  const newStatus = select.value;
  const candidate = users[currentUser].candidates[index];
  if (!newStatus) return;
  const now = new Date().toLocaleDateString();
  const wasStatus = candidate.status;
  if (!wasStatus || wasStatus !== newStatus) {
    if (!wasStatus) {
      const reward = newStatus === 'Иностранный агент' ? 200 : 100;
      users[currentUser].coins += reward;
      candidate.closedAt = now;
      candidate.reward = reward;
      confettiEffect();
      Swal.fire({
        title: `+${reward} HR Coin`,
        html: `<img src="https://static.vecteezy.com/system/resources/thumbnails/020/716/945/small_2x/3d-glossy-dollar-coin-golden-reflective-dollar-coin-3d-illustration-png.png" class="w-24 mx-auto animate__animated animate__rotateIn">`,
        showConfirmButton: false,
        timer: 1500
      });
    } else {
      candidate.closedAt = now;
    }
    candidate.status = newStatus;
    syncAndRender(renderCandidates);
  }
}

// Удаление кандидата
function removeCandidate(index) {
  const candidate = users[currentUser].candidates[index];
  if (candidate.reward) {
    users[currentUser].coins -= candidate.reward;
  }
  users[currentUser].candidates.splice(index, 1);
  syncAndRender(renderCandidates);
}

// Покупка подарка
function buyGift(giftName, cost) {
  if (users[currentUser].coins >= cost) {
    users[currentUser].coins -= cost;
    users[currentUser].gifts.push(giftName);
    syncAndRender(() => {
      Swal.fire('Подарок добавлен!', '', 'success');
    });
  } else {
    Swal.fire('Недостаточно баллов', '', 'error');
  }
}

// Фото профиля
function previewAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    avatarPreviewData = reader.result;
    document.getElementById('avatar').src = avatarPreviewData;
    document.getElementById('save-avatar-btn').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function uploadAvatar() {
  if (!avatarPreviewData) return;
  users[currentUser].avatar = avatarPreviewData;
  syncAndRender(() => {
    document.getElementById('save-avatar-btn').classList.add('hidden');
    Swal.fire({
      icon: 'success',
      title: 'Фото профиля обновлено!',
      timer: 1200,
      showConfirmButton: false
    });
    updateDashboardAvatar();
  });
}

function updateDashboardAvatar() {
  if (users[currentUser] && users[currentUser].avatar) {
    document.getElementById('avatar').src = users[currentUser].avatar;
  } else {
    document.getElementById('avatar').src = "https://cdn-icons-png.flaticon.com/512/219/219983.png";
  }
}

// Логаут
function logout() {
  currentUser = null;
  location.reload();
}

// Ошибки
function showError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

// Конфетти
function confettiEffect() {
  for (let i = 0; i < 20; i++) {
    const conf = document.createElement('div');
    conf.textContent = '🎉';
    conf.style.position = 'fixed';
    conf.style.left = `${Math.random() * 100}vw`;
    conf.style.top = '-5vh';
    conf.style.fontSize = '24px';
    conf.style.zIndex = 9999;
    conf.style.animation = 'drop 5s ease-out forwards';
    document.body.appendChild(conf);
    setTimeout(() => conf.remove(), 1000);
  }
}

// После загрузки страницы: загрузи данные, если надо, для админа
window.addEventListener('DOMContentLoaded', () => {
  // firebase должен быть уже инициализирован!
  // Можно подгрузить данные, если нужно что-то еще при старте
});

// Экспортируем нужные функции для использования в HTML inline-обработчиках
window.login = login;
window.logout = logout;
window.addCandidate = addCandidate;
window.confirmCandidateStatus = confirmCandidateStatus;
window.removeCandidate = removeCandidate;
window.buyGift = buyGift;
window.previewAvatar = previewAvatar;
window.uploadAvatar = uploadAvatar;
window.showTab = showTab;