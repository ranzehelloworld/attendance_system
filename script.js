const { jsPDF } = window.jspdf;
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, get, update } from "firebase/database";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged, 
    signOut 
} from "firebase/auth";

// 1. FIREBASE INITIALIZATION
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
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 2. STATE ENVIRONMENT CONTROLLERS
const DATE_ID = new Date().toISOString().slice(0, 10);
let currentUser = null;
let currentClassInfo = null;
let records = []; 
let databaseDisconnectListener = null;

// DOM View Targets
const screens = {
    login: document.getElementById('login-screen'),
    onboarding: document.getElementById('onboarding-screen'),
    main: document.getElementById('main-content'),
    step1: document.getElementById('onboarding-step-1'),
    step2: document.getElementById('onboarding-step-2')
};

// 3. SECURE AUTHENTICATION HUB
onAuthStateChanged(auth, async (user) => {
    if (databaseDisconnectListener) {
        databaseDisconnectListener();
        databaseDisconnectListener = null;
    }

    if (user) {
        currentUser = user;
        screens.login.classList.add('hidden');
        
        // Push current user avatar to UI components
        const dashboardAvatar = document.getElementById('dashboard-avatar');
        if (dashboardAvatar) dashboardAvatar.src = user.photoURL || '';
        document.getElementById('user-avatar').src = user.photoURL || '';
        
        const userProfileSnapshot = await get(ref(db, `users/${user.uid}/profile`));
        const profile = userProfileSnapshot.val();

        if (profile && profile.setupComplete) {
            currentClassInfo = profile.classInfo;
            // Pre-fill profile name field
            document.getElementById('profile-name').value = profile.displayName || user.displayName || '';
            mountMainDashboard();
        } else {
            document.getElementById('profile-name').value = user.displayName || '';
            
            screens.onboarding.classList.remove('hidden');
            screens.step1.classList.remove('hidden');
            screens.step2.classList.add('hidden');
            screens.main.classList.add('hidden');
        }
    } else {
        currentUser = null;
        currentClassInfo = null;
        records = []; 
        screens.login.classList.remove('hidden');
        screens.onboarding.classList.add('hidden');
        screens.main.classList.add('hidden');
    }
});

window.handleGoogleLogin = function() {
    signInWithPopup(auth, provider).catch(error => {
        const errorEl = document.getElementById('login-error');
        errorEl.innerText = `Auth Error: ${error.message}`;
        errorEl.classList.remove('hidden');
    });
};

window.handleLogout = function() {
    signOut(auth).then(() => showToast("Session Closed")); 
};

// 4. ONBOARDING & MOBILE CLIPBOARD SANITIZER
window.skipProfileCustomization = function() {
    screens.step1.classList.add('hidden');
    screens.step2.classList.remove('hidden');
};

window.saveProfileCustomization = async function() {
    const updatedName = document.getElementById('profile-name').value.trim();
    if (!updatedName) return showToast("Name field cannot be blank");
    
    await set(ref(db, `users/${currentUser.uid}/profile/name`), updatedName);
    screens.step1.classList.add('hidden');
    screens.step2.classList.remove('hidden');
};

window.processClassSetup = async function() {
    const course = document.getElementById('class-course').value.trim().toUpperCase();
    const year = document.getElementById('class-year').value;
    const section = document.getElementById('class-section').value.trim().toUpperCase();
    const major = document.getElementById('class-major').value.trim() || 'N/A';
    const rawPasteData = document.getElementById('class-paste-box').value;
    const updatedProfileName = document.getElementById('profile-name').value.trim();

    if (!course || !section || !rawPasteData.trim() || !updatedProfileName) {
        return showToast("Please check mandatory fields & data values!");
    }

    const lines = rawPasteData.split('\n');
    let generatedRoster = [];

    lines.forEach(line => {
        let cleanName = line.trim();
        if (!cleanName) return; 

        // Strip index numbering (e.g., "1. John Doe", "02) Jane")
        cleanName = cleanName.replace(/^\d+[\s\.\)\-,\/]+/g, '').trim();

        if (cleanName.length > 2) {
            // FIX: Create a unique, deterministic ID based on the lowercased alphanumeric name.
            // This prevents key assignment shifting during sorting.
            const uniqueId = `student_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
            
            // Check for explicit duplicate inputs within the paste box entry
            if (!generatedRoster.some(s => s.id === uniqueId)) {
                generatedRoster.push({
                    id: uniqueId,
                    name: cleanName
                });
            }
        }
    });

    if (generatedRoster.length === 0) {
        return showToast("Could not parse valid student names from input!");
    }

    const classInfoObj = { course, year, section, major };

    // Atomically commit master student profiles and demographic blocks
    await set(ref(db, `users/${currentUser.uid}/student_list`), generatedRoster);
    await set(ref(db, `users/${currentUser.uid}/profile`), {
        setupComplete: true,
        displayName: updatedProfileName,
        classInfo: classInfoObj
    });

    currentClassInfo = classInfoObj;
    screens.onboarding.classList.add('hidden');
    mountMainDashboard();
};

// 5. BOOTSTRAPPING USER ATOM DATABASE PATHS
function mountMainDashboard() {
    screens.main.classList.remove('hidden');

    const sectionTitle = `${currentClassInfo.course} ${currentClassInfo.year.charAt(0)}${currentClassInfo.section}`;
    document.getElementById('org-name').innerText = sectionTitle;
    document.getElementById('class-display-badge').innerText = sectionTitle;
    document.getElementById('org-subtitle').innerText = `Major: ${currentClassInfo.major} • Attendance System`;

    const rosterRef = ref(db, `users/${currentUser.uid}/student_list`);
    const attendanceRef = ref(db, `users/${currentUser.uid}/attendance/${DATE_ID}`);

    if (databaseDisconnectListener) databaseDisconnectListener();

    databaseDisconnectListener = onValue(attendanceRef, async (snapshot) => {
        const dbData = snapshot.val();
        
        const rosterSnapshot = await get(rosterRef);
        const masterRoster = rosterSnapshot.val() || [];

        // Alphabetize roster items safely by last word string segments
        const sortedRoster = [...masterRoster].sort((a, b) => 
            a.name.split(" ").pop().localeCompare(b.name.split(" ").pop()) 
        );

        const defaultDataTemplate = sortedRoster.map(s => ({
            ...s, timeInChecked: false, timeIn: '', timeOutChecked: false, timeOut: '' 
        }));

        if (!dbData) {
            records = defaultDataTemplate;
            set(attendanceRef, records); 
        } else {
            // FIX: Map database matches using our stable string IDs
            records = defaultDataTemplate.map(s => {
                const match = dbData.find(r => r.id === s.id); 
                return match ? { ...s, ...match } : s;
            });
            
            // Clean dynamic structural sizing modifications seamlessly
            const structuralCheck = dbData.map(r => r.id).join(',');
            const currentCheck = records.map(r => r.id).join(',');
            if (structuralCheck !== currentCheck) {
                set(attendanceRef, records);
            }
        }
        renderTable();
    });
}

// 6. ACTION HANDLERS & UPDATERS
function getStaticTime() {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); 
}

function showToast(msg) { 
  const t = document.getElementById('toast');
  if(t) {
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }
}

window.handleTimeCheck = function(id, field, checked) { 
  const rec = records.find(r => r.id === id);
  if (!rec) return;
  const checkedField = field === 'timeIn' ? 'timeInChecked' : 'timeOutChecked';
  rec[checkedField] = checked;
  rec[field] = checked ? getStaticTime() : '';
  
  const attendanceRef = ref(db, `users/${currentUser.uid}/attendance/${DATE_ID}`);
  set(attendanceRef, records);
  showToast(checked ? "Attendance Recorded" : "Attendance Removed"); 
};

window.handleManualTimeChange = function(id, field, value) { 
    const rec = records.find(r => r.id === id);
    if (!rec) return;
    rec[field] = value;
    
    const attendanceRef = ref(db, `users/${currentUser.uid}/attendance/${DATE_ID}`);
    set(attendanceRef, records);
    showToast("Time Manually Updated"); 
};

function updateStats() { 
  const present = records.filter(r => r.timeInChecked).length; 
  const rate = records.length > 0 ? Math.round((present / records.length) * 100) : 0; 
  
  const els = {
    total: document.getElementById('total-count'),
    pres: document.getElementById('stat-present'),
    abs: document.getElementById('stat-absent'),
    rate: document.getElementById('stat-rate'),
    bar: document.getElementById('rate-bar-fill')
  };

  if(els.total) els.total.textContent = records.length; 
  if(els.pres) els.pres.textContent = String(present).padStart(2, '0'); 
  if(els.abs) els.abs.textContent = String(records.length - present).padStart(2, '0'); 
  if(els.rate) els.rate.textContent = `${rate}%`; 
  if(els.bar) els.bar.style.width = `${rate}%`; 
}

// 7. REPORT COMPILING & RESET ACTIONS
function computeFourStateStatus(r) {
    if (r.timeInChecked && r.timeOutChecked) {
        return "PRESENT";
    } else if (r.timeInChecked && !r.timeOutChecked) {
        return "INCOMPLETE (Missing Out)";
    } else if (!r.timeInChecked && r.timeOutChecked) {
        return "INCOMPLETE (Missing In)";
    } else {
        return "ABSENT";
    }
}

window.exportCSV = function() { 
    const event = document.getElementById('event-name').value || 'Attendance'; 
    
    // Build identical clean naming for file download tracking
    let sectionFileTitle = `${currentClassInfo.course}_${currentClassInfo.year.charAt(0)}${currentClassInfo.section}`;
    if (currentClassInfo.major && currentClassInfo.major !== 'N/A') {
        sectionFileTitle += `_${currentClassInfo.major.replace(/\s+/g, '_').toUpperCase()}`;
    }
    
    let csv = "Name,Status,Time In,Time Out\n"; 
    records.forEach(r => {
        const calculatedStatus = computeFourStateStatus(r);
        csv += `"${r.name}",${calculatedStatus},${r.timeIn || '--'},${r.timeOut || '--'}\n`; 
    });
    
    const link = document.createElement("a"); 
    link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv); 
    link.download = `${sectionFileTitle}_${event}_${DATE_ID}.csv`;
    link.click(); 

    window.resetData(); 
};

window.exportPDF = function() { 
    const eventName = document.getElementById('event-name').value || 'Attendance'; 
    
    // Compile a dynamic, adaptive title string based on whether a Major is active
    let sectionTitle = `${currentClassInfo.course} ${currentClassInfo.year.charAt(0)}${currentClassInfo.section}`;
    if (currentClassInfo.major && currentClassInfo.major !== 'N/A') {
        sectionTitle += ` ${currentClassInfo.major.toUpperCase()}`;
    }
    
    const img = new Image(); 
    img.src = 'iict-logo.png'; 
    img.onload = function() { 
        const doc = new jsPDF(); 
        
        doc.addImage(img, 'PNG', 14, 10, 20, 20); 
        doc.setFont("helvetica", "bold"); 
        doc.setFontSize(16); 
        doc.setTextColor(156, 77, 185);  
        
        // This will now print: "BSIT 2C WEB | ATTENDANCE REPORT"
        doc.text(`${sectionTitle} | ATTENDANCE REPORT`, 38, 20);
        
        doc.setFontSize(10); 
        doc.setTextColor(100);  
        doc.text(`Event: ${eventName}`, 38, 27); 
        doc.text(`Date: ${DATE_ID}`, 38, 32); 

        const tableData = records.map(r => [ 
            r.name, 
            computeFourStateStatus(r), 
            r.timeIn || '--', 
            r.timeOut || '--' 
        ]);

        doc.autoTable({ 
            startY: 40, 
            head: [['Name', 'Status', 'Time In', 'Time Out']], 
            body: tableData, 
            theme: 'grid', 
            headStyles: { fillColor: [156, 77, 185] }, 
            didParseCell: function(data) { 
                if (data.section === 'body' && data.column.index === 1) {
                    if (data.cell.raw === 'PRESENT') {
                        data.cell.styles.textColor = [76, 175, 80]; 
                    } else if (data.cell.raw.includes('INCOMPLETE')) {
                        data.cell.styles.textColor = [255, 152, 0]; 
                    } else {
                        data.cell.styles.textColor = [183, 28, 28]; 
                    }
                }
            }
        });

        // Save the file with the optimized name formatting
        doc.save(`${sectionTitle} ${eventName} Attendance ${DATE_ID}.pdf`); 
        window.resetData(); 
    };
};

window.resetData = function() { 
    const cleanedRecords = records.map(r => ({ 
        ...r,
        timeInChecked: false, 
        timeIn: '', 
        timeOutChecked: false, 
        timeOut: '' 
    }));

    const attendanceRef = ref(db, `users/${currentUser.uid}/attendance/${DATE_ID}`);
    set(attendanceRef, cleanedRecords) 
        .then(() => showToast("Report Saved & Session Cleared"))
        .catch((error) => console.error("Reset structural error:", error));
};

// 8. ELEMENT RENDER AND SEARCH FILTER
window.filterStudents = function() {
    const query = document.getElementById('student-search').value.toLowerCase();
    const rows = document.querySelectorAll('#student-table-body tr');
    
    records.forEach((rec, index) => {
        const matches = rec.name.toLowerCase().includes(query);
        if (rows[index]) {
            rows[index].style.display = matches ? '' : 'none';
        }
    });
};

function renderTable() { 
  const tbody = document.getElementById('student-table-body'); 
  if (!tbody) return; 
  tbody.innerHTML = ''; 

  records.forEach((rec) => { 
    const tr = document.createElement('tr'); 
    tr.className = "hover:bg-surface-container-high transition-colors group"; 
    tr.innerHTML = `
      <td class="px-8 py-5">
        <div class="flex items-center">
          <div class="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center mr-4 border border-outline-variant/20 text-primary">
            <span class="material-symbols-outlined">account_circle</span>
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
            <input type="text" value="${rec.timeIn || '--'}" 
                   class="bg-transparent border-none text-[0.7rem] text-secondary font-mono w-20 p-0 text-center focus:ring-0"
                   onchange="window.handleManualTimeChange('${rec.id}', 'timeIn', this.value)">
          </div>
          <div class="flex flex-col items-center gap-1">
            <span class="text-[0.5rem] text-outline uppercase">Out</span>
            <label class="relative inline-flex items-center cursor-pointer scale-90">
              <input type="checkbox" class="sr-only peer" ${rec.timeOutChecked ? 'checked' : ''} onchange="window.handleTimeCheck('${rec.id}', 'timeOut', this.checked)">
              <div class="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tertiary"></div>
            </label>
            <input type="text" value="${rec.timeOut || '--'}" 
                   class="bg-transparent border-none text-[0.7rem] text-on-surface-variant font-mono w-20 p-0 text-center focus:ring-0"
                   onchange="window.handleManualTimeChange('${rec.id}', 'timeOut', this.value)">
          </div>
        </div>
      </td>`; 
    tbody.appendChild(tr); 
  });
  updateStats(); 
}

function updateClock() { 
    const now = new Date(); 
    const timeParts = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).split(' '); 
    document.getElementById('clock-time').innerText = timeParts[0]; 
    document.getElementById('clock-ampm').innerText = timeParts[1]; 
    document.getElementById('clock-date').innerText = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); 
}
setInterval(updateClock, 1000);
updateClock();

// 9. DYNAMIC RUNTIME PROFILE SETTINGS ADJUSTMENTS
window.openSettingsOverlay = function() {
    if (!currentUser || !currentClassInfo) return;

    // Open setup overlay but ensure step-1 (profile name field layout) is visible as well!
    document.getElementById('onboarding-screen').classList.remove('hidden');
    document.getElementById('onboarding-step-1').classList.remove('hidden'); 
    document.getElementById('onboarding-step-2').classList.remove('hidden'); 

    // Update avatar image
    document.getElementById('user-avatar').src = currentUser.photoURL || '';

    // Sync state settings fields back into views
    document.getElementById('class-course').value = currentClassInfo.course || '';
    document.getElementById('class-year').value = currentClassInfo.year || '1st';
    document.getElementById('class-section').value = currentClassInfo.section || '';
    document.getElementById('class-major').value = currentClassInfo.major || 'N/A';

    // Reverse array mapping to dump names back into text entry area cleanly
    if (records && records.length > 0) {
        const textRosterList = records.map((r, i) => `${i + 1}. ${r.name}`).join('\n');
        document.getElementById('class-paste-box').value = textRosterList;
    } else {
        document.getElementById('class-paste-box').value = '';
    }

    // Show cancel button element safely
    const cancelBtn = document.getElementById('cancel-settings-btn');
    if (cancelBtn) cancelBtn.classList.remove('hidden');
};

window.closeSettingsOverlay = function() {
    document.getElementById('onboarding-screen').classList.add('hidden');
};
