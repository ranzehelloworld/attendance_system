const { jsPDF } = window.jspdf;
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, get } from "firebase/database";
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
let customAvatarBase64 = null; // Stores uploaded image raw data locally

// DOM View Targets
const screens = {
    login: document.getElementById('login-screen'),
    onboarding: document.getElementById('onboarding-screen'),
    main: document.getElementById('main-content')
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
        
        const userProfileSnapshot = await get(ref(db, `users/${user.uid}/profile`));
        const profile = userProfileSnapshot.val();

        if (profile && profile.setupComplete) {
            currentClassInfo = profile.classInfo;
            
            // Render profile image from database fallback to Google Auth photo
            const activeAvatar = profile.avatarString || user.photoURL || '';
            const dashboardAvatar = document.getElementById('dashboard-avatar');
            if (dashboardAvatar) dashboardAvatar.src = activeAvatar;
            document.getElementById('user-avatar').src = activeAvatar;
            
            document.getElementById('profile-name').value = profile.displayName || user.displayName || '';
            mountMainDashboard();
        } else {
            // Fresh account onboarding fallbacks
            document.getElementById('user-avatar').src = user.photoURL || '';
            document.getElementById('profile-name').value = user.displayName || '';
            
            screens.onboarding.classList.remove('hidden');
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

// 4. PROFILE CUSTOM IMAGE UPLOAD PROCESSING
window.triggerAvatarUpload = function() {
    document.getElementById('avatar-file-input').click();
};

window.handleAvatarSelection = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            customAvatarBase64 = e.target.result;
            document.getElementById('user-avatar').src = customAvatarBase64;
            showToast("Photo Preview Loaded");
        };
        reader.readAsDataURL(input.files[0]);
    }
};

// 5. ATOMIC SYSTEM CONFIGURATION MANAGEMENT
window.processClassSetup = async function() {
    const updatedProfileName = document.getElementById('profile-name').value.trim();
    const rawPasteData = document.getElementById('class-paste-box').value;

    if (!updatedProfileName || !rawPasteData.trim()) {
        return showToast("Profile name and student list are mandatory fields!");
    }

    const lines = rawPasteData.split('\n');
    let generatedRoster = [];

    lines.forEach(line => {
        let cleanName = line.trim();
        if (!cleanName) return; 

        // Strip index numbers / symbols (e.g., "1. John Doe", "02) Jane")
        cleanName = cleanName.replace(/^\d+[\s\.\)\-,\/]+/g, '').trim();

        if (cleanName.length > 2) {
            // Generate deterministic unique id tracking key 
            const uniqueId = `student_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
            
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

    // Preserve metadata values safely if adjusting fields from runtime dashboard settings
    const course = currentClassInfo?.course || "BSIT";
    const year = currentClassInfo?.year || "1st";
    const section = currentClassInfo?.section || "A";
    const major = currentClassInfo?.major || "N/A";
    const classInfoObj = { course, year, section, major };

    // Fetch existing profile to retain active avatar image string if no new file uploaded
    const currentProfileSnap = await get(ref(db, `users/${currentUser.uid}/profile`));
    const currentProfileData = currentProfileSnap.val() || {};
    const finalAvatar = customAvatarBase64 || currentProfileData.avatarString || currentUser.photoURL || '';

    // Atomically commit master datasets to Firebase environment
    await set(ref(db, `users/${currentUser.uid}/student_list`), generatedRoster);
    await set(ref(db, `users/${currentUser.uid}/profile`), {
        setupComplete: true,
        displayName: updatedProfileName,
        avatarString: finalAvatar,
        classInfo: classInfoObj
    });

    // Mirror current profile state adjustments to UI headers dynamically
    const dashboardAvatar = document.getElementById('dashboard-avatar');
    if (dashboardAvatar) dashboardAvatar.src = finalAvatar;

    currentClassInfo = classInfoObj;
    screens.onboarding.classList.add('hidden');
    mountMainDashboard();
    showToast("Application Settings Updated");
};

// 6. BOOTSTRAPPING USER ATOM DATABASE PATHS
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

        // Alphabetize roster items by structural surname word segment
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
            records = defaultDataTemplate.map(s => {
                const match = dbData.find(r => r.id === s.id); 
                return match ? { ...s, ...match } : s;
            });
            
            const structuralCheck = dbData.map(r => r.id).join(',');
            const currentCheck = records.map(r => r.id).join(',');
            if (structuralCheck !== currentCheck) {
                set(attendanceRef, records);
            }
        }
        renderTable();
    });
}

// 7. ACTION HANDLERS & UPDATERS
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

// 8. REPORT COMPILING & RESET ACTIONS
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

// 9. ELEMENT RENDER AND SEARCH FILTER
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

// 9. RUNTIME OVERLAY ROUTINES
window.openSettingsOverlay = async function() {
    if (!currentUser) return;

    // Open configuration layout container smoothly
    document.getElementById('onboarding-screen').classList.remove('hidden');

    const userProfileSnapshot = await get(ref(db, `users/${currentUser.uid}/profile`));
    const profile = userProfileSnapshot.val() || {};

    // Pull current user info into inputs
    document.getElementById('profile-name').value = profile.displayName || currentUser.displayName || '';
    document.getElementById('user-avatar').src = profile.avatarString || currentUser.photoURL || '';
    customAvatarBase64 = null; 

    // REMOVE INDEX NUMBERING: Formats names as a clean, line-by-line list
    if (records && records.length > 0) {
        const clearRosterList = records.map(r => r.name).join('\n');
        document.getElementById('class-paste-box').value = clearRosterList;
    } else {
        document.getElementById('class-paste-box').value = '';
    }

    const cancelBtn = document.getElementById('cancel-settings-btn');
    if (cancelBtn) cancelBtn.classList.remove('hidden');
};

window.closeSettingsOverlay = function() {
    document.getElementById('onboarding-screen').classList.add('hidden');
};
