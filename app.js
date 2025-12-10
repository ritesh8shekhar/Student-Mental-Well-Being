// app.js — Advanced static wellbeing app (localStorage + Chart.js + CSV export)

const storageKey = 'wellbeing_entries_v1';
const moods = ['Happy','Neutral','Stressed','Sad','Excited'];
const quotes = [
  "Believe in yourself!",
  "Every day is a new beginning.",
  "You are stronger than you think.",
  "Small steps lead to big changes.",
  "Keep going, you’re doing great!",
  "Progress, not perfection."
];

// DOM elements
const moodSelect = document.getElementById('moodSelect');
const intensity = document.getElementById('intensity');
const intVal = document.getElementById('intVal');
const saveBtn = document.getElementById('saveBtn');
const saveMsg = document.getElementById('saveMsg');
const historyTableBody = document.querySelector('#historyTable tbody');
const clearAllBtn = document.getElementById('clearAll');
const exportCSVBtn = document.getElementById('exportCSV');
const quoteBtn = document.getElementById('quoteBtn');
const quoteText = document.getElementById('quoteText');

// modal
const relaxBtn = document.getElementById('relaxBtn');
const relaxModal = document.getElementById('relaxModal');
const closeModal = document.getElementById('closeModal');
const startBreath = document.getElementById('startBreath');
const stopBreath = document.getElementById('stopBreath');
const breathCircle = document.getElementById('breathCircle');
const breathText = document.getElementById('breathText');

// chart
const ctx = document.getElementById('moodChart').getContext('2d');
let chart;

// helpers
function nowISO() {
  return new Date().toISOString();
}
function readEntries() {
  return JSON.parse(localStorage.getItem(storageKey) || '[]');
}
function writeEntries(arr) {
  localStorage.setItem(storageKey, JSON.stringify(arr));
}
function showMsg(text, t = 2000) {
  saveMsg.innerText = text;
  setTimeout(()=>{ saveMsg.innerText = ''; }, t);
}

// render history
function renderHistory() {
  const arr = readEntries();
  historyTableBody.innerHTML = '';
  arr.slice().reverse().forEach((e, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date(e.time).toLocaleString()}</td>
      <td>${e.mood}</td>
      <td>${e.intensity}</td>
      <td><button data-id="${e.time}" class="delBtn">Delete</button></td>
    `;
    historyTableBody.appendChild(tr);
  });
  // attach delete events
  document.querySelectorAll('.delBtn').forEach(btn=>{
    btn.addEventListener('click', (ev)=>{
      const id = ev.target.dataset.id;
      deleteEntry(id);
    });
  });
  updateChart();
}

// add entry
function addEntry(mood, intensityVal) {
  const arr = readEntries();
  const entry = { time: nowISO(), mood, intensity: intensityVal };
  arr.push(entry);
  writeEntries(arr);
  renderHistory();
  showMsg('Mood saved!');
}

// delete
function deleteEntry(id) {
  let arr = readEntries();
  arr = arr.filter(x => x.time !== id);
  writeEntries(arr);
  renderHistory();
}

// clear
clearAllBtn.addEventListener('click', ()=> {
  if (!confirm('Clear all mood entries?')) return;
  localStorage.removeItem(storageKey);
  renderHistory();
});

// export CSV
exportCSVBtn.addEventListener('click', ()=> {
  const entries = readEntries();
  if (entries.length === 0) { alert('No entries to export'); return; }
  const rows = [['time','mood','intensity']];
  entries.forEach(e => rows.push([e.time, e.mood, e.intensity]));
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'mood_history.csv';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

// quote
quoteBtn.addEventListener('click', ()=> {
  const q = quotes[Math.floor(Math.random()*quotes.length)];
  quoteText.innerText = q;
});

// intensity UI
intVal.innerText = intensity.value;
intensity.addEventListener('input', ()=> intVal.innerText = intensity.value);

// save
saveBtn.addEventListener('click', ()=> {
  const mood = moodSelect.value;
  const val = parseInt(intensity.value, 10);
  addEntry(mood, val);
});

// Chart: count-based by mood + average intensity trend
function updateChart() {
  const entries = readEntries();
  const counts = moods.map(m => entries.filter(e => e.mood === m).length);
  // average intensity per mood (or 0)
  const avgs = moods.map(m => {
    const sel = entries.filter(e => e.mood === m);
    if (sel.length === 0) return 0;
    return Math.round((sel.reduce((s,x)=>s+x.intensity,0)/sel.length)*10)/10;
  });

  const labels = moods;
  if (!chart) {
    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Count', data: counts, yAxisID: 'y', backgroundColor: 'rgba(107,43,138,0.7)' },
          { label: 'Avg Intensity', data: avgs, type: 'line', yAxisID: 'y1', tension: 0.3, borderColor: '#ff7a7a' }
        ]
      },
      options: {
        scales: {
          y: { beginAtZero:true, position: 'left' },
          y1: { beginAtZero:true, position:'right', grid: { drawOnChartArea:false } }
        },
        responsive: true,
        plugins: { legend: { position: 'top' } }
      }
    });
  } else {
    chart.data.datasets[0].data = counts;
    chart.data.datasets[1].data = avgs;
    chart.update();
  }
}

// delete handler helper
function attachDeleteDelegation() {
  // handled by renderHistory (buttons added after render)
}

// Relaxation modal & breathing
relaxBtn.addEventListener('click', ()=> relaxModal.classList.remove('hidden'));
closeModal.addEventListener('click', ()=> stopBreathingAndClose());
let breathInterval = null;
startBreath.addEventListener('click', startBreathing);
stopBreath.addEventListener('click', stopBreathingAndClose);

function startBreathing() {
  if (breathInterval) return;
  breathText.innerText = 'Inhale (4s)';
  let phase = 0; // 0 inhale,1 hold,2 exhale
  const phases = ['Inhale (4s)','Hold (4s)','Exhale (4s)'];
  breathCircle.style.transition = 'transform 4s ease-in-out';
  breathCircle.style.transform = 'scale(1.0)';
  breathInterval = setInterval(()=> {
    phase = (phase+1)%3;
    breathText.innerText = phases[phase];
    // animate scale: inhale -> 1.0, hold->1.0, exhale->0.6
    if (phase === 0) breathCircle.style.transform = 'scale(1.0)';
    if (phase === 2) breathCircle.style.transform = 'scale(0.6)';
  }, 4000);
}

function stopBreathingAndClose() {
  if (breathInterval) { clearInterval(breathInterval); breathInterval = null; }
  breathText.innerText = 'Click Start';
  breathCircle.style.transform = 'scale(0.6)';
  relaxModal.classList.add('hidden');
}

// init
renderHistory();
updateChart();
