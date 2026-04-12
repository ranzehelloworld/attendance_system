const { jsPDF } = window.jspdf;
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";

const auth = getAuth(app);

// 1. Check if user is logged in
onAuthStateChanged(auth, (user) => {
  const loginScreen = document.getElementById('login-screen');
  const mainContent = document.getElementById('main-content');
  
  if (user) {
    loginScreen.classList.add('hidden');
    mainContent.classList.remove('hidden');
  } else {
    loginScreen.classList.remove('hidden');
    mainContent.classList.add('hidden');
  }
});

// 2. Login function
window.handleLogin = function() {
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-pass').value;
  const errorEl = document.getElementById('login-error');

  signInWithEmailAndPassword(auth, email, pass)
    .catch(error => {
      errorEl.innerText = "Invalid Credentials";
      errorEl.classList.remove('hidden');
    });
};

// 1. FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAA3Wevu6dpu8fSraSplCM7y6QDYGxrOpU",
  authDomain: "bsit-1c-attendance.firebaseapp.com",
  databaseURL: "https://bsit-1c-attendance-default-rtdb.asia-southeast1.firebasedatabase.app",
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

// 2. MASTERLIST
const DEFAULT_STUDENTS = [
  { id: '1', name: 'Jemica Arceo' }, { id: '2', name: 'Bryan Apostol' },
  { id: '3', name: 'Jush Ancheta' }, { id: '4', name: 'Kezia Balubar' },
  { id: '5', name: 'Jamil Bayabao' }, { id: '6', name: 'Jeremy Besa' },
  { id: '7', name: 'Princess Bergonia' }, { id: '8', name: 'Julian Bello' },
  { id: '9', name: 'Christian Jeff Bricia' }, { id: '10', name: 'Jester Bumanglag' },
  { id: '11', name: 'King Jb Cabasag' }, { id: '12', name: 'Alyssa Cacal' },
  { id: '13', name: 'Darlene Cabreros' }, { id: '14', name: 'Roger Carpio' },
  { id: '15', name: 'Rose Cañeza' }, { id: '16', name: 'Aldrin Dela Cruz' },
  { id: '17', name: 'Ivy Del Rosario' }, { id: '18', name: 'Cesar Faustino' },
  { id: '19', name: 'Edelyn Fernandez' }, { id: '20', name: 'Andrew Gaudan' },
  { id: '21', name: 'Prince Jhon Olvidado' }, { id: '22', name: 'Christopher Madamba' },
  { id: '23', name: 'Darwin Magbual' }, { id: '24', name: 'Oyo Boy Martinez' },
  { id: '25', name: 'Amelia Julian' }, { id: '26', name: 'Francis John Pinto' },
  { id: '27', name: 'Krisjay Portugal' }, { id: '28', name: 'Melmar Ranque' },
  { id: '29', name: 'Adrian Ramos' }, { id: '30', name: 'Ellaisa Ramos' },
  { id: '31', name: 'Aaron Reyes' }, { id: '32', name: 'Mark Ruel Santiago' },
  { id: '33', name: 'Jaypee Santos' }, { id: '34', name: 'Erica Soto' },
  { id: '35', name: 'Maria Hezekiah Mae Still' }, { id: '36', name: 'Paul Junarc Tayag' },
  { id: '37', name: 'May Ann Tadeo' }, { id: '38', name: 'Mark Angelo Tolentino' },
  { id: '39', name: 'Aisha Viñas' }, { id: '40', name: 'Rhian Villanueva' },
  { id: '41', name: 'Reymond Estardo' }
];

// 3. HELPERS
function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// Function for static timestamp when checkbox is clicked
function getStaticTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  rec[field] = checked ? getStaticTime() : '';
  saveData(records);
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
  let csv = "Name,Status,In,Out\n";
  records.forEach(r => {
    csv += `"${r.name}",${r.timeInChecked?'PRESENT':'ABSENT'},${r.timeIn||'--'},${r.timeOut||'--'}\n`;
  });
  const link = document.createElement("a");
  link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
  link.download = `BSIT 1C ${event} Attendance ${DATE_ID}.csv`;
  link.click();
}

window.exportPDF = function() {
    const eventName = document.getElementById('event-name').value || 'Attendance';
    const img = new Image();
    img.src = 'iict-logo.png';
    img.onload = function() {
        const doc = new jsPDF();
        doc.addImage(img, 'PNG', 14, 10, 20, 20);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(156, 77, 185); 
        doc.text("BSIT 1C | ATTENDANCE REPORT", 38, 20);
        doc.setFontSize(10);
        doc.setTextColor(100); 
        doc.text(`Event: ${eventName}`, 38, 27);
        doc.text(`Date: ${DATE_ID}`, 38, 32);

        const tableData = records.map(r => [
            r.name,
            r.timeInChecked ? 'PRESENT' : 'ABSENT',
            r.timeIn || '--',
            r.timeOut || '--'
        ]);

        doc.autoTable({
            startY: 40,
            head: [['Name', 'Status', 'Time In', 'Time Out']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [156, 77, 185], halign: 'center' },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 1) {
                    data.cell.styles.textColor = data.cell.raw === 'PRESENT' ? [76, 175, 80] : [183, 28, 28];
                }
            }
        });
        doc.save(`BSIT 1C ${eventName} Attendance ${DATE_ID}.pdf`);
    };
};

// 6. RENDER & UI LOGIC
function renderTable() {
  const tbody = document.getElementById('student-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  records.forEach((rec) => {
    const init = initials(rec.name);
    const tr = document.createElement('tr');
    tr.className = "hover:bg-surface-container-high transition-colors group";
    tr.innerHTML = `
      <td class="px-8 py-5">
        <div class="flex items-center">
          <div class="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center mr-4 border border-outline-variant/20">
            <span class="text-xs font-headline font-bold text-primary">${init}</span>
          </div>
          <div class="font-headline text-on-surface group-hover:text-primary transition-colors">${rec.name}</div>
        </div>
      </td>
      <td class="px-8 py-5 text-right pr-8">
        <div class="flex items-center justify-end space-x-6">
          <div class="flex flex-col items-center gap-1">
            <span class="text-[0.5rem] text-outline uppercase">In</span>
            <label class="relative inline-flex items-center cursor-pointer scale-90">
              <input type="checkbox" class="sr-only peer" ${rec.timeInChecked ? 'checked' : ''} onchange="window.handleTimeCheck('${rec.id}', 'timeIn', this.checked)">
              <div class="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
            </label>
            <span class="text-[0.7rem] text-secondary font-mono">${rec.timeIn || '--:--'}</span>
          </div>
          <div class="flex flex-col items-center gap-1">
            <span class="text-[0.5rem] text-outline uppercase">Out</span>
            <label class="relative inline-flex items-center cursor-pointer scale-90">
              <input type="checkbox" class="sr-only peer" ${rec.timeOutChecked ? 'checked' : ''} onchange="window.handleTimeCheck('${rec.id}', 'timeOut', this.checked)">
              <div class="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tertiary"></div>
            </label>
            <span class="text-[0.7rem] text-on-surface-variant font-mono">${rec.timeOut || '--:--'}</span>
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

// LIVE CLOCK
function updateClock() {
    const now = new Date();
    
    // Format for the main clock display (12-hour with seconds)
    const timeParts = now.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
    }).split(' ');

    const timeString = timeParts[0]; // The HH:MM:SS part
    const ampm = timeParts[1];       // The AM/PM part

    document.getElementById('clock-time').innerText = timeString;
    document.getElementById('clock-ampm').innerText = ampm;

    // Format for the Date display
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    document.getElementById('clock-date').innerText = now.toLocaleDateString('en-US', options);
}

// 7. INITIALIZATION
onValue(attendanceRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        records = data; 
    } else {
        records = [...DEFAULT_STUDENTS].sort((a, b) => a.name.split(" ").pop().localeCompare(b.name.split(" ").pop()))
          .map(s => ({ ...s, timeInChecked: false, timeIn: '', timeOutChecked: false, timeOut: '' }));
    }
    renderTable();
});

// Run clock immediately and set the live interval
updateClock();
setInterval(updateClock, 1000);

// Persistence for Event Name
const eventEl = document.getElementById('event-name');
if (eventEl) {
    eventEl.addEventListener('input', () => localStorage.setItem('attendance_event_name', eventEl.value));
    const saved = localStorage.getItem('attendance_event_name');
    if (saved) eventEl.value = saved;
}
