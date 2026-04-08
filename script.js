import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

// 1. FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAA3Wevu6dpu8fSraSplCM7y6QDYGxrOpU",
  authDomain: "bsit-1c-attendance.firebaseapp.com",
  databaseURL: "https://bsit-1c-attendance-default-rtdb.asia-southeast1.firebasedatabase.app", // ADD THIS LINE
  projectId: "bsit-1c-attendance",
  storageBucket: "bsit-1c-attendance.firebasestorage.app",
  messagingSenderId: "935043253740",
  appId: "1:935043253740:web:c48c12af9d07b22eee2cc9"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const DATE_ID = new Date().toISOString().slice(0, 10);
const attendanceRef = ref(db, 'attendance/' + DATE_ID);

let records = [];

// 2. STUDENT DATA
const DEFAULT_STUDENTS = [
  { id: '25-0321', name: 'Jemica Arceo', initials: 'JA' },
  { id: '25-0032', name: 'Bryan Apostol', initials: 'BA' },
  { id: '25-0319', name: 'Jush Ancheta', initials: 'JA' },
  { id: '25-0293', name: 'Kezia Balubar', initials: 'KB' },
  { id: '25-0461', name: 'Jamil Bayabao', initials: 'JB' },
  { id: '25-0328', name: 'Jeremy Besa', initials: 'JB' },
  { id: '25-0193', name: 'Princess Bergonia', initials: 'PB' },
  { id: '25-0157', name: 'Julian Bello', initials: 'JB' },
  { id: '25-0294', name: 'Christian Jeff Bricia', initials: 'CB' },
  { id: '25-0158', name: 'Jester Bumanglag', initials: 'JB' },
  { id: '25-0332', name: 'King Jb Cabasag', initials: 'JB' },
  { id: '25-0194', name: 'Alyssa Cacal', initials: 'AC' },
  { id: '25-0195', name: 'Darlene Cabreros', initials: 'DC' },
  { id: '25-0807', name: 'Roger Carpio', initials: 'RC' },
  { id: '25-0302', name: 'Rose Cañeza', initials: 'RC' },
  { id: '25-0841', name: 'Aldrin Dela Cruz', initials: 'AD' },
  { id: '25-0209', name: 'Ivy Del Rosario', initials: 'ID' },
  { id: '25-0876', name: 'Cesar Faustino', initials: 'CF' },
  { id: '25-0292', name: 'Edelyn Fernandez', initials: 'EF' },
  { id: '25-0356', name: 'Andrew Gaudan', initials: 'AG' },
  { id: '25-0349', name: 'Prince Jhon Olvidado', initials: 'PJ' },
  { id: '25-0350', name: 'Christopher Madamba', initials: 'CM' },
  { id: '25-0182', name: 'Darwin Magbual', initials: 'DM' },
  { id: '25-0288', name: 'Oyo Boy Martinez', initials: 'OM' },
  { id: '25-0359', name: 'Amelia Julian', initials: 'AJ' },
  { id: '25-0171', name: 'Francis John Pinto', initials: 'FP' },
  { id: '25-0361', name: 'Krisjay Portugal', initials: 'KP' },
  { id: '25-0460', name: 'Melmar Ranque', initials: 'MR' },
  { id: '25-0942', name: 'Adrian Ramos', initials: 'AR' },
  { id: '25-0327', name: 'Ellaisa Ramos', initials: 'ER' },
  { id: '25-0947', name: 'Aaron Reyes', initials: 'AR' },
  { id: '25-0310', name: 'Mark Ruel Santiago', initials: 'MS' },
  { id: '25-0181', name: 'Jaypee Santos', initials: 'JS' },
  { id: '25-0330', name: 'Erica Soto', initials: 'ES' },
  { id: '25-0337', name: 'Maria Hezekiah Mae Still', initials: 'MH' },
  { id: '25-0842', name: 'Paul Junarc Tayag', initials: 'PT' },
  { id: '25-0344', name: 'May Ann Tadeo', initials: 'MT' },
  { id: '25-0761', name: 'Mark Angelo Tolentino', initials: 'AT' },
  { id: '25-0320', name: 'Aisha Viñas', initials: 'AV' },
  { id: '25-0341', name: 'Rhian Villanueva', initials: 'RV' },
  { id: '25-0751', name: 'Reymond Estardo', initials: 'RE' },
];

// 3. HELPERS
function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function now12h() {
  const d = new Date();
  let h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`;
}

// 4. CORE DATA LOGIC
function saveData(data) {
  set(attendanceRef, data);
}

// 5. HANDLERS
window.handleTimeCheck = function(id, field, checked) {
  const rec = records.find(r => r.id === id);
  if (!rec) return;
  
  const checkedField = field === 'timeIn' ? 'timeInChecked' : 'timeOutChecked';
  rec[checkedField] = checked;
  rec[field] = checked ? now12h() : '';
  
  saveData(records); // This pushes to Firebase
  updateStats();
  showToast(checked ? `Attendance Recorded` : `Attendance Removed`);
}

window.filterStudents = function() {
  const query = document.getElementById('student-search').value.toLowerCase();
  const rows = document.querySelectorAll('#student-table-body tr');
  rows.forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(query) ? '' : 'none';
  });
}

window.exportCSV = function() {
  const event = document.getElementById('event-name').value || 'Attendance';
  let csv = "Name,ID,Status,In,Out\n";
  records.forEach(r => {
    csv += `"${r.name}",${r.id},${r.timeInChecked?'PRESENT':'ABSENT'},${r.timeIn||'--'},${r.timeOut||'--'}\n`;
  });
  const link = document.createElement("a");
  link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
  link.download = `BSIT 1C ${event} Attendance ${DATE_ID}.csv`;
  link.click();
}

// 6. RENDER LOGIC
function renderTable() {
  const tbody = document.getElementById('student-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  records.forEach((rec) => {
    const init = rec.initials || initials(rec.name);
    const tr = document.createElement('tr');
    tr.className = "hover:bg-surface-container-high transition-colors group";
    tr.innerHTML = `
      <td class="px-8 py-5">
        <div class="flex items-center">
          <div class="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center mr-4 border border-outline-variant/20">
            <span class="text-xs font-headline font-bold text-primary">${init}</span>
          </div>
          <div>
            <div class="font-headline text-on-surface group-hover:text-primary transition-colors">${rec.name}</div>
            <div class="text-[0.65rem] font-label text-outline uppercase tracking-wider">ID: #${rec.id}</div>
          </div>
        </div>
      </td>
      <td class="px-8 py-5 text-right pr-8">
        <div class="flex items-center justify-end space-x-6">
          <div class="flex flex-col items-center gap-1">
            <span class="text-[0.5rem] text-outline uppercase">In</span>
            <label class="relative inline-flex items-center cursor-pointer scale-90">
              <input type="checkbox" class="sr-only peer" ${rec.timeInChecked ? 'checked' : ''} onchange="handleTimeCheck('${rec.id}', 'timeIn', this.checked)">
              <div class="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
            </label>
            <input class="bg-transparent border-none text-[0.7rem] w-16 text-center text-secondary" value="${rec.timeIn}" placeholder="--:--" readonly>
          </div>
          <div class="flex flex-col items-center gap-1">
            <span class="text-[0.5rem] text-outline uppercase">Out</span>
            <label class="relative inline-flex items-center cursor-pointer scale-90">
              <input type="checkbox" class="sr-only peer" ${rec.timeOutChecked ? 'checked' : ''} onchange="handleTimeCheck('${rec.id}', 'timeOut', this.checked)">
              <div class="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tertiary"></div>
            </label>
            <input class="bg-transparent border-none text-[0.7rem] w-16 text-center text-on-surface-variant" value="${rec.timeOut}" placeholder="--:--" readonly>
          </div>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
  updateStats();
}

function updateStats() {
  const present = records.filter(r => r.timeInChecked).length;
  const rate = records.length > 0 ? Math.round((present / records.length) * 100) : 0;
  document.getElementById('total-count').textContent = records.length;
  document.getElementById('stat-present').textContent = String(present).padStart(2, '0');
  document.getElementById('stat-absent').textContent = String(records.length - present).padStart(2, '0');
  document.getElementById('stat-rate').textContent = `${rate}%`;
  document.getElementById('rate-bar').style.width = `${rate}%`;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if(t) {
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }
}

function updateClock() {
  const d = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let h = d.getHours(), ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  document.getElementById('clock-time').textContent = `${String(h).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  document.getElementById('clock-ampm').textContent = ampm;
  document.getElementById('clock-date').textContent = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// 7. INITIALIZATION & SYNC
onValue(attendanceRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        records = data; 
    } else {
        const sorted = [...DEFAULT_STUDENTS].sort((a, b) => {
            const nameA = a.name.split(" ").pop().toLowerCase();
            const nameB = b.name.split(" ").pop().toLowerCase();
            return nameA < nameB ? -1 : 1;
        });
        records = sorted.map(s => ({
            ...s,
            timeInChecked: false, timeIn: '',
            timeOutChecked: false, timeOut: ''
        }));
    }
    renderTable(); // This is the most important part—it draws the table once data arrives
});

setInterval(updateClock, 1000);
updateClock();

const eventEl = document.getElementById('event-name');
if (eventEl) {
    eventEl.addEventListener('input', () => localStorage.setItem('attendance_event_name', eventEl.value));
    const saved = localStorage.getItem('attendance_event_name');
    if (saved) eventEl.value = saved;
}
