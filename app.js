// Main assistant logic - Full Smart English Mode (Female voice chosen)
// Session key: tony_session
const session = JSON.parse(localStorage.getItem('tony_session') || 'null');
if(!session){ location.href = 'main.html'; }

document.getElementById('userLabel').textContent = session.user;

const micBtn = document.getElementById('micBtn');
const micText = document.getElementById('micText');
const transcriptDiv = document.getElementById('transcript');
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const showHistoryBtn = document.getElementById('showHistoryBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const manualInput = document.getElementById('manualInput');
const sendManual = document.getElementById('sendManual');
const logoutBtn = document.getElementById('logoutBtn');

logoutBtn?.addEventListener('click', ()=>{ localStorage.removeItem('tony_session'); location.href='main.html'; });

const STORAGE_KEY = `tony_history_${session.user}`;

function loadHistory(){ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
function saveHistory(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }

function addHistory(cmd){ const h = loadHistory(); h.unshift({cmd,ts:new Date().toISOString()}); if(h.length>200) h.pop(); saveHistory(h); }

function renderHistory(){ historyList.innerHTML=''; const h = loadHistory(); if(h.length===0){ historyList.innerHTML='<li class="muted">No commands yet.</li>'; return; }
  h.forEach((item,i)=>{ const li = document.createElement('li'); li.innerHTML = `<div class="hcmd"><strong>${item.cmd}</strong><div class="hts">${new Date(item.ts).toLocaleString()}</div></div><div class="hactions"> <button data-i="${i}" class="small">Delete</button></div>`; historyList.appendChild(li); });
  historyList.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',(e)=>{
    const idx = parseInt(btn.getAttribute('data-i'));
    const arr = loadHistory(); arr.splice(idx,1); saveHistory(arr); renderHistory();
  }));
}

showHistoryBtn.addEventListener('click', ()=>{ historyPanel.classList.toggle('hidden'); renderHistory(); });
clearHistoryBtn.addEventListener('click', ()=>{ if(confirm('Clear all history?')){ saveHistory([]); renderHistory(); speak('History cleared'); } });

sendManual.addEventListener('click', ()=>{ const t = manualInput.value.trim(); if(!t)return; processCommand(t); manualInput.value=''; });
manualInput.addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ sendManual.click(); } });

// female voice selection helper
let preferredVoice = null;
function selectPreferredVoice(){
  const voices = speechSynthesis.getVoices();
  if(!voices || voices.length===0) return null;
  // prefer known female voice names
  const preferNames = [
    'Google UK English Female', 'Google US English', 'Microsoft Zira', 'Samantha', 'English (United Kingdom) Female',
    'Female'
  ];
  for(const name of preferNames){
    const found = voices.find(v=> v.name.includes(name) || (v.lang && v.lang.toLowerCase().includes('en') && v.name.toLowerCase().includes('female')));
    if(found) return found;
  }
  // fallback to any voice with 'female' in name
  const female = voices.find(v=> /female/i.test(v.name));
  if(female) return female;
  // else return first voice
  return voices[0];
}
function ensureVoiceReady(cb){
  let v = selectPreferredVoice();
  if(v){ preferredVoice = v; if(cb) cb(); return; }
  // voices may load asynchronously
  speechSynthesis.onvoiceschanged = ()=>{ preferredVoice = selectPreferredVoice(); if(cb) cb(); };
}

// speech synthesis wrapper
function speak(text){
  try{
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    if(preferredVoice) u.voice = preferredVoice;
    u.rate = 1.0;
    u.pitch = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }catch(e){ console.warn('TTS error', e); }
}

// show suggestions click handlers
function setupSuggestions(){
  document.querySelectorAll('.sug').forEach(btn=>{
    btn.onclick = ()=>{ processCommand(btn.textContent.replace(/^[^\w]*/,'').trim()); };
  });
}

// typewriter helper
function typeWrite(el, text, i=0){
  el.textContent = text.substring(0,i);
  if(i < text.length) setTimeout(()=>typeWrite(el, text, i+1), 25);
}

// Quick helper to open URLs
function openURL(url){
  window.open(url, '_blank');
}

// speech recognition setup (English)
let recognition = null; let recognizing=false;
function initRecognition(){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition){ console.warn('SpeechRecognition not available'); return null; }
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = ()=>{ recognizing=true; micText.textContent='Listening...'; micBtn.classList.add('listening'); };
  recognition.onend = ()=>{ recognizing=false; micText.textContent='Start Listening'; micBtn.classList.remove('listening'); };
  recognition.onerror = (e)=>{ console.error('rec error',e); recognizing=false; micText.textContent='Start Listening'; micBtn.classList.remove('listening'); };
  recognition.onresult = (ev)=>{
    const txt = ev.results[0][0].transcript.trim();
    transcriptDiv.textContent = txt;
    processCommand(txt);
  };
  return recognition;
}

micBtn.addEventListener('click', async ()=>{
  if(!recognition) initRecognition();
  try{
    if(!recognizing){ recognition.start(); } else { recognition.stop(); }
  }catch(err){ console.warn(err); }
});

// the "smart" command processor
function processCommand(raw){
  const message = String(raw || '').toLowerCase().trim();
  addHistory(message); renderHistory();

  const show = (screen, voice) => { typeWrite(transcriptDiv, screen); speak(voice || screen); };

  // time & date
  if(message.includes('time')){ const t = new Date().toLocaleTimeString(); show('🕒 Time: '+t, 'The time is '+t); return; }
  if(message.includes('date')){ const d = new Date().toLocaleDateString(); show('📅 Date: '+d, "Today's date is "+d); return; }

  // show / clear history (voice commands)
  if(message.includes('show history') || message.includes('show my history') || message.includes('show commands')){
    renderHistory();
    historyPanel.classList.remove('hidden');
    show('Showing command history','Showing your command history');
    return;
  }
  if(message.includes('clear history') || message.includes('clear my history') || message.includes('delete history')){
    saveHistory([]);
    renderHistory();
    show('History cleared','Your history has been cleared');
    return;
  }

  // open known sites or arbitrary site
  if(message.startsWith('open ') || message.includes(' open ')){
    // extract text after 'open'
    let after = raw.toLowerCase().split('open').slice(1).join('open').trim();
    if(!after){ show('Please tell me which site to open','Please specify a website to open'); return; }
    after = after.replace(/^the\s+/, '').replace(/^website\s+/, '').trim();
    let domain = after.split(' ')[0].replace(/[.,!?]/g,'').replace(/https?:\/\//,'').replace(/^www\./,'');
    const map = {
      'youtube':'https://www.youtube.com',
      'google':'https://www.google.com',
      'facebook':'https://www.facebook.com',
      'twitter':'https://twitter.com',
      'instagram':'https://www.instagram.com',
      'reddit':'https://www.reddit.com',
      'github':'https://github.com',
      'whatsapp':'https://web.whatsapp.com'
    };
    let url = map[domain];
    if(!url){
      if(domain.includes('.')) url = domain.startsWith('http')? domain : 'https://'+domain;
      else url = 'https://'+domain+'.com';
    }
    show('Opening '+domain, 'Opening '+domain);
    openURL(url);
    return;
  }

  // play <song> -> YouTube search
  if(message.startsWith('play ') || message.includes(' play ')){
    const q = raw.replace(/play\s+/i,'').trim();
    if(q){
      const qs = encodeURIComponent(q);
      show('🎶 Playing: '+q, 'Playing '+q);
      openURL('https://www.youtube.com/results?search_query='+qs);
    } else {
      show('Please say the song name','Which song would you like me to play?');
    }
    return;
  }

  // wikipedia search: "wikipedia <topic>" or "search wikipedia for india"
  if(message.startsWith('wikipedia') || message.includes('search wikipedia') || message.includes('wikipedia for')){
    // extract topic
    let topic = raw.replace(/(wikipedia|search wikipedia for|wikipedia for)/i,'').trim();
    if(!topic) { show('Please tell me the wikipedia topic','Please specify a topic'); return; }
    const q = encodeURIComponent(topic);
    show('Searching Wikipedia for '+topic, 'Searching Wikipedia for '+topic);
    openURL('https://en.wikipedia.org/wiki/Special:Search?search='+q);
    return;
  }

  // weather quick mode (default Ghaziabad)
  if(message.includes('weather')){
    const city = 'Ghaziabad';
    // Try quick fetch from wttr.in (may fail due to CORS) then fallback to Google weather
    (async ()=>{
      try{
        const r = await fetch('https://wttr.in/'+encodeURIComponent(city)+'?format=%t+%C', {mode:'cors'});
        if(r.ok){
          const txt = await r.text(); // e.g. "+30°C  Partly cloudy"
          show('Weather: '+txt, 'Current weather in '+city+' is '+ txt);
        } else {
          throw new Error('wttr response not ok');
        }
      }catch(e){
        // fallback: open Google weather
        show('Opening weather for '+city,'Opening weather for '+city);
        openURL('https://www.google.com/search?q=weather+'+encodeURIComponent(city));
      }
    })();
    return;
  }

  // open WhatsApp quick
  if(message.includes('whatsapp')){
    show('Opening WhatsApp Web','Opening WhatsApp Web');
    openURL('https://web.whatsapp.com');
    return;
  }
  if(message.includes('whatsapp')){
    show('Opening Instagram Web','Opening Instagram Web');
    openURL('https://www.instagram.com/');
    return;
  }

  // show some small conversation & jokes
  if(message.includes('who are you') || message.includes('what are you')){
    show('🤖 I am Tony, your virtual assistant','I am Tony, your virtual assistant');
    return;
  }
  if(message.includes('how are you')){
    show('😊 I am doing great! How can I help?','I am doing great! How can I help you?');
    return;
  }
  if(message.includes('thank') || message.includes('thanks')){
    show('👍 You are welcome','You are most welcome');
    return;
  }
  if(message.includes('joke') || message.includes('tell me a joke')){
    show('😂 Why did the developer go broke? Because he used up all his cache.','Here is a joke for you');
    return;
  }

  // default: search web
  show('🔎 Searching: '+raw, 'I did not understand. Searching the web for '+raw);
  openURL('https://www.google.com/search?q='+encodeURIComponent(raw));
}

// small alias (used by speech onresult)
function process(txt){ processCommand(txt); }

// on load: setup voice & suggestions & events
ensureVoiceReady(()=>{
  // apply selected voice
  console.log('Preferred voice selected:', preferredVoice && preferredVoice.name);
});
setupSuggestions();
document.addEventListener('DOMContentLoaded', ()=>{
  ensureVoiceReady(()=> speak('Hello boss! Tony here. How can I help?'));
});

// init recognition + render history
initRecognition();
renderHistory();
