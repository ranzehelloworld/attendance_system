const { jsPDF } = window.jspdf;
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

// 2. MASTERLIST
const DEFAULT_STUDENTS = [
  { id: '1', name: 'Jemica Arceo', initials: 'JA' },
  { id: '2', name: 'Bryan Apostol', initials: 'BA' },
  { id: '3', name: 'Jush Ancheta', initials: 'JA' },
  { id: '4', name: 'Kezia Balubar', initials: 'KB' },
  { id: '5', name: 'Jamil Bayabao', initials: 'JB' },
  { id: '6', name: 'Jeremy Besa', initials: 'JB' },
  { id: '7', name: 'Princess Bergonia', initials: 'PB' },
  { id: '8', name: 'Julian Bello', initials: 'JB' },
  { id: '9', name: 'Christian Jeff Bricia', initials: 'CB' },
  { id: '10', name: 'Jester Bumanglag', initials: 'JB' },
  { id: '11', name: 'King Jb Cabasag', initials: 'JB' },
  { id: '12', name: 'Alyssa Cacal', initials: 'AC' },
  { id: '13', name: 'Darlene Cabreros', initials: 'DC' },
  { id: '14', name: 'Roger Carpio', initials: 'RC' },
  { id: '15', name: 'Rose Cañeza', initials: 'RC' },
  { id: '16', name: 'Aldrin Dela Cruz', initials: 'AD' },
  { id: '17', name: 'Ivy Del Rosario', initials: 'ID' },
  { id: '18', name: 'Cesar Faustino', initials: 'CF' },
  { id: '19', name: 'Edelyn Fernandez', initials: 'EF' },
  { id: '20', name: 'Andrew Gaudan', initials: 'AG' },
  { id: '21', name: 'Prince Jhon Olvidado', initials: 'PJ' },
  { id: '22', name: 'Christopher Madamba', initials: 'CM' },
  { id: '23', name: 'Darwin Magbual', initials: 'DM' },
  { id: '24', name: 'Oyo Boy Martinez', initials: 'OM' },
  { id: '25', name: 'Amelia Julian', initials: 'AJ' },
  { id: '26', name: 'Francis John Pinto', initials: 'FP' },
  { id: '27', name: 'Krisjay Portugal', initials: 'KP' },
  { id: '28', name: 'Melmar Ranque', initials: 'MR' },
  { id: '29', name: 'Adrian Ramos', initials: 'AR' },
  { id: '30', name: 'Ellaisa Ramos', initials: 'ER' },
  { id: '31', name: 'Aaron Reyes', initials: 'AR' },
  { id: '32', name: 'Mark Ruel Santiago', initials: 'MS' },
  { id: '33', name: 'Jaypee Santos', initials: 'JS' },
  { id: '34', name: 'Erica Soto', initials: 'ES' },
  { id: '35', name: 'Maria Hezekiah Mae Still', initials: 'MH' },
  { id: '36', name: 'Paul Junarc Tayag', initials: 'PT' },
  { id: '37', name: 'May Ann Tadeo', initials: 'MT' },
  { id: '38', name: 'Mark Angelo Tolentino', initials: 'AT' },
  { id: '39', name: 'Aisha Viñas', initials: 'AV' },
  { id: '40', name: 'Rhian Villanueva', initials: 'RV' },
  { id: '41', name: 'Reymond Estardo', initials: 'RE' },
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
    
    // 1. Create a "virtual" image to pre-load the file
    const img = new Image();
    img.src = 'iict-logo.png'; // Updated to match your GitHub filename
    
    img.onload = function() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // 2. Add the Image (now that we are sure it's loaded)
        // addImage(img, format, x, y, width, height)
        doc.addImage(img, 'PNG', 14, 10, 20, 20);

        // 3. Header Text (Purple: 156, 77, 185)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(156, 77, 185); 
        doc.text("BSIT 1C | ATTENDANCE REPORT", 38, 20);

        doc.setFontSize(10);
        doc.setTextColor(100); 
        doc.text(`Event: ${eventName}`, 38, 27);
        doc.text(`Date: ${DATE_ID}`, 38, 32);

        // --- Rest of your autoTable code goes here ---
        const tableData = records.map(r => [
            r.name,
            r.timeInChecked ? 'PRESENT' : 'ABSENT',
            r.timeIn || '--',
            r.timeOut || '--'
        ]);

        doc.autoTable({
            startY: 40,
            head: [['Student Name', 'Status', 'Time In', 'Time Out']],
            body: tableData,
            theme: 'grid',
            headStyles: { 
                fillColor: [156, 77, 185], 
                textColor: [255, 255, 255], 
                fontSize: 10,
                halign: 'center' 
            },
            styles: { font: "helvetica", fontSize: 9, cellPadding: 3 },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 1) {
                    if (data.cell.raw === 'PRESENT') {
                        data.cell.styles.textColor = [76, 175, 80]; // IICT Green
                    } else {
                        data.cell.styles.textColor = [183, 28, 28]; // Red
                    }
                }
            }
        });

        doc.save(`BSIT1C_${eventName}_${DATE_ID}.pdf`);
    };

    // Error handling if the image fails to load
    img.onerror = function() {
        alert("Could not load logo. Please check if iict-logo.png exists in your folder.");
    };
};



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
          </div>
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
            <input class="bg-transparent border-none text-[0.7rem] w-16 text-center text-secondary" value="${rec.timeIn}" placeholder="--:--" readonly>
          </div>
          <div class="flex flex-col items-center gap-1">
            <span class="text-[0.5rem] text-outline uppercase">Out</span>
            <label class="relative inline-flex items-center cursor-pointer scale-90">
              <input type="checkbox" class="sr-only peer" ${rec.timeOutChecked ? 'checked' : ''} onchange="window.handleTimeCheck('${rec.id}', 'timeOut', this.checked)">
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

// 6. RENDER LOGIC (CLOCK & STATS)
function updateClock() {
  const d = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;

  // Added :${String(d.getSeconds()).padStart(2,'0')} for the ticking effect
  const timeString = `${String(h).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  
  // Updating your specific HTML IDs
  document.getElementById('clock-time').textContent = timeString;
  document.getElementById('clock-ampm').textContent = ampm;
  document.getElementById('clock-date').textContent = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// Start the real-time loop
setInterval(updateClock, 1000);
updateClock(); // Run immediately so it doesn't show "--:--" for the first second

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
