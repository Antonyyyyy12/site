import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.8.0/firebase-analytics.js";
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs
} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCI3Vb9KpGKHeZwQe_pRy_fNgWm9znu4IU",
  authDomain: "hr-coin-253bc.firebaseapp.com",
  projectId: "hr-coin-253bc",
  storageBucket: "hr-coin-253bc.appspot.com",
  messagingSenderId: "54944189886",
  appId: "1:54944189886:web:a892cb00d43a4a57b6fdef",
  measurementId: "G-86YQ8GQSY5"
};
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

let currentUser = null;
let avatarPreviewData = null;

// --- UI EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-btn').addEventListener('click', login);
  document.getElementById('register-btn').addEventListener('click', register);
  document.getElementById('avatar-input').addEventListener('change', function() {
    previewAvatar(this);
  });
  document.getElementById('save-avatar-btn').addEventListener('click', uploadAvatar);
});

window.showTab = showTab;

// --- AUTH ---
async function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!username || !password) {
    showError('Пожалуйста, заполните все поля.');
    return;
  }
  if (username === 'vlasovadmin' && password === 'adminvlasovadmin') {
    document.getElementById('login-panel').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    await renderAdminPanel();
    return;
  }
  const userRef = doc(db, "users", username);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists() && userSnap.data().password === password) {
    currentUser = username;
    const userData = userSnap.data();
    if (userData.avatar) {
      document.getElementById('avatar').src = userData.avatar;
    }
    document.getElementById('user-welcome').innerText = username;
    document.getElementById('login-panel').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
  } else {
    showError('Неверный логин или пароль.');
  }
}

async function register() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!username || !password) {
    showError('Пожалуйста, заполните все поля.');
    return;
  }
  const userRef = doc(db, "users", username);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    showError('Пользователь с таким логином уже существует.');
    return;
  }
  await setDoc(userRef, {
    password,
    coins: 0,
    candidates: [],
    gifts: [],
    avatar: ''
  });
  Swal.fire({ icon: 'success', title: 'Регистрация успешна!' });
}

function showError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

// --- ADMIN ---
async function renderAdminPanel() {
  const table = document.getElementById('admin-user-list');
  table.innerHTML = '';
  const usersSnap = await getDocs(collection(db, "users"));
  usersSnap.forEach(docSnap => {
    const u = docSnap.data();
    const name = docSnap.id;
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

window.deleteUser = async function(name) {
  await deleteDoc(doc(db, "users", name));
  await renderAdminPanel();
};

// --- DASHBOARD TABS ---
async function showTab(tab) {
  const content = document.getElementById('content');
  const user = await getUserData(currentUser);
  content.classList.remove('animate__fadeInUp');
  void content.offsetWidth; // restart animation
  content.classList.add('animate__fadeInUp');
  if (tab === 'stats') {
    content.innerHTML = `
      <div class="bg-white p-6 rounded-xl shadow animate__animated animate__fadeInUp">
        <h3 class="text-xl font-bold mb-4">📊 Статистика</h3>
        <p>Баллы: <strong>${user.coins}</strong></p>
        <p>Кандидатов: <strong>${user.candidates.length}</strong></p>
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
        <input id="newCandidate" class="border p-2 rounded w-full mb-4" placeholder="Имя кандидата">
        <button id="add-candidate-btn" class="bg-indigo-500 text-white px-4 py-2 rounded">Добавить</button>
        <div id="candidateList" class="mt-4 space-y-2"></div>
      </div>`;
    document.getElementById('add-candidate-btn').onclick = addCandidate;
    await renderCandidates();
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
  }
}

async function getUserData(username) {
  const userRef = doc(db, "users", username);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? userSnap.data() : null;
}

// --- КАНДИДАТЫ ---
async function addCandidate() {
  const name = document.getElementById('newCandidate').value.trim();
  if (!name) return;
  const user = await getUserData(currentUser);
  user.candidates.push({ name, status: null });
  await updateDoc(doc(db, "users", currentUser), { candidates: user.candidates });
  await renderCandidates();
  document.getElementById('newCandidate').value = '';
}

async function renderCandidates() {
  const list = document.getElementById('candidateList');
  const user = await getUserData(currentUser);
  list.innerHTML = user.candidates.map((c, i) => `
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

window.confirmCandidateStatus = async function(index) {
  const select = document.getElementById(`status-select-${index}`);
  const newStatus = select.value;
  const user = await getUserData(currentUser);
  const candidate = user.candidates[index];
  if (!newStatus) return;
  const now = new Date().toLocaleDateString();
  const wasStatus = candidate.status;
  if (!wasStatus || wasStatus !== newStatus) {
    if (!wasStatus) {
      const reward = newStatus === 'Иностранный агент' ? 200 : 100;
      user.coins += reward;
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
    await updateDoc(doc(db, "users", currentUser), {
      candidates: user.candidates,
      coins: user.coins
    });
    await renderCandidates();
  }
};

window.removeCandidate = async function(index) {
  const user = await getUserData(currentUser);
  const candidate = user.candidates[index];
  if (candidate.reward) {
    user.coins -= candidate.reward;
  }
  user.candidates.splice(index, 1);
  await updateDoc(doc(db, "users", currentUser), {
    candidates: user.candidates,
    coins: user.coins
  });
  await renderCandidates();
};

// --- АВАТАР ---
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
async function uploadAvatar() {
  if (!avatarPreviewData) return;
  await updateDoc(doc(db, "users", currentUser), { avatar: avatarPreviewData });
  document.getElementById('save-avatar-btn').classList.add('hidden');
  Swal.fire({
    icon: 'success',
    title: 'Фото профиля обновлено!',
    timer: 1200,
    showConfirmButton: false
  });
}

// --- GIFTS ---
window.buyGift = async function(giftName, cost) {
  const user = await getUserData(currentUser);
  if (user.coins >= cost) {
    user.coins -= cost;
    user.gifts.push(giftName);
    await updateDoc(doc(db, "users", currentUser), {
      coins: user.coins,
      gifts: user.gifts
    });
    Swal.fire('Подарок добавлен!', '', 'success');
  } else {
    Swal.fire('Недостаточно баллов', '', 'error');
  }
};

// --- CONFETTI ---
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