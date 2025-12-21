let state = {
    mode: 'fatti',
    familyMember: 'Me',
    category: '',
    eventId: null,
    giftId: null,
    eventData: {},
    tags: ["Generico", "Soldi", "Elettronica", "Abbigliamento", "Casa", "Giocattoli", "Viaggio", "Esperienza"],
    personTags: ["Amico", "Familiare", "Stretto", "Collega", "Altro"],
    peopleCache: []
};

window.onload = function() {
    loadTags();
    loadPeopleCache();
    if(localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
};

// === NAVIGAZIONE ===
window.navTo = function(pageId) {
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    const header = document.getElementById('mainHeader');
    const nav = document.getElementById('mainNav');
    const backBtn = document.getElementById('backBtn');

    if (pageId === 'home') {
        document.getElementById('homePage').classList.add('active');
        header.classList.add('hide-in-home');
        nav.classList.add('hide-in-home');
    } else {
        header.classList.remove('hide-in-home');
        nav.classList.remove('hide-in-home');
        backBtn.classList.remove('hidden');
        backBtn.onclick = () => window.navTo('section_home');
        
        if(pageId === 'start') { window.navTo('home'); return; }
        if(pageId === 'section_home') {
            if(state.mode === 'ricevuti') pageId = 'ricevuti_famiglia';
            else pageId = 'fatti_categorie';
        }

        switch(pageId) {
            case 'ricevuti_famiglia':
                state.mode = 'ricevuti';
                document.getElementById('familyPage').classList.add('active');
                loadFamilyMembers();
                backBtn.onclick = () => window.navTo('start');
                break;
            case 'fatti_categorie':
                state.mode = 'fatti';
                state.familyMember = 'Me'; 
                document.getElementById('categoriesPage').classList.add('active');
                loadUnifiedCategories();
                backBtn.onclick = () => window.navTo('start');
                break;
            case 'ricevuti_categorie':
                document.getElementById('categoriesPage').classList.add('active');
                loadUnifiedCategories();
                backBtn.onclick = () => window.navTo('ricevuti_famiglia');
                break;
            case 'lista_eventi':
                document.getElementById('eventsListPage').classList.add('active');
                document.getElementById('currentCatName').innerText = state.category;
                backBtn.onclick = () => window.navTo(state.mode === 'fatti' ? 'fatti_categorie' : 'ricevuti_categorie');
                loadEvents();
                break;
            case 'crea_evento':
                document.getElementById('createEventPage').classList.add('active');
                document.getElementById('eventNameInput').value = "";
                document.getElementById('eventDateInput').value = new Date().toISOString().split('T')[0];
                backBtn.onclick = () => window.navTo('lista_eventi');
                break;
            case 'quick_gift':
                document.getElementById('quickGiftPage').classList.add('active');
                setupQuickGiftForm();
                backBtn.onclick = () => window.navTo('lista_eventi');
                break;
            case 'evento_dettaglio':
                document.getElementById('singleEventPage').classList.add('active');
                document.getElementById('detailEventName').innerText = state.eventData.name || "Dettaglio";
                document.getElementById('detailEventInfo').innerText = state.eventData.date || "";
                backBtn.onclick = () => window.navTo('lista_eventi');
                loadGifts();
                break;
            case 'aggiungi_regalo':
                document.getElementById('addGiftPage').classList.add('active');
                setupAddGiftForm();
                backBtn.onclick = () => window.navTo('evento_dettaglio');
                break;
            case 'analisi': document.getElementById('analysisPage').classList.add('active'); backBtn.classList.add('hidden'); window.calculateAnalysis(); break;
            case 'rubrica': document.getElementById('peoplePage').classList.add('active'); backBtn.classList.add('hidden'); loadPeopleList(); populateTagSelect('newPersonRelation', state.personTags); break;
            case 'settings': document.getElementById('settingsPage').classList.add('active'); backBtn.classList.add('hidden'); renderTagsSettings(); break;
            case 'person_detail': document.getElementById('personDetailPage').classList.add('active'); backBtn.onclick = () => window.navTo('rubrica'); window.togglePersonView('fatti'); break;
        }
    }
};

window.selectCategory = (cat) => { state.category = cat; window.navTo('lista_eventi'); };

// === RUBRICA E RICERCA FUZZY ===
async function loadPeopleCache() {
    const snap = await window.dbSdk.getDocs(window.dbSdk.collection(window.db, "persone"));
    state.peopleCache = [];
    snap.forEach(d => state.peopleCache.push({id: d.id, ...d.data()}));
}

// Funzione di filtro per la barra di ricerca
window.filterPeople = function() {
    const term = document.getElementById('searchPeopleInput').value.toLowerCase();
    const filtered = state.peopleCache.filter(p => p.name.toLowerCase().includes(term));
    renderPeopleList(filtered);
}

// Renderizza lista (usato sia da load che da filter)
function renderPeopleList(list) {
    const c = document.getElementById('peopleListContainer');
    c.innerHTML = "";
    
    list.sort((a,b) => a.name.localeCompare(b.name));
    
    list.forEach(p => {
        const div = document.createElement('div');
        div.className = 'cat-item';
        div.innerHTML = `
            <div onclick="openPersonAnalysis('${p.name}')" style="flex-grow:1;">
                <strong>${p.name}</strong> <span class="tag-pill">${p.relation || 'Altro'}</span>
            </div>
            <div class="cat-actions">
                <div class="btn-icon" onclick="editPerson('${p.id}','${p.name}','${p.relation}')">✏️</div>
                <div class="btn-icon text-red" onclick="deletePerson('${p.id}')">🗑</div>
            </div>`;
        c.appendChild(div);
    });
}

async function loadPeopleList() {
    document.getElementById('peopleListContainer').innerHTML = "Caricamento...";
    await loadPeopleCache();
    renderPeopleList(state.peopleCache);
}

// === FIX MODIFICA REGALO (Popola PRIMA i tag, POI i valori) ===
window.editGiftSetup = async(id) => {
    state.giftId = id; 
    
    // 1. Vai alla pagina
    window.navTo('aggiungi_regalo');
    
    // 2. Assicura che le select siano popolate
    populateTagSelect('giftTag', state.tags);
    populateTagSelect('giftRelation', state.personTags);

    // 3. Recupera dati e imposta valori
    const d = await window.getDocById("regali", id);
    if(d) {
        document.getElementById('giftSender').value = d.sender || "";
        document.getElementById('giftPerson').value = d.recipient || d.person;
        document.getElementById('giftDesc').value = d.desc;
        document.getElementById('giftAmount').value = d.amount;
        document.getElementById('giftNotes').value = d.notes;
        
        // Imposta i valori delle select DOPO averle popolate
        document.getElementById('giftTag').value = d.tag;
        document.getElementById('giftType').value = d.type; // Oggetto/Busta
        
        document.getElementById('giftFileBase64').value = d.file||"";
        if(d.file){
            document.getElementById('imgPreview').src=d.file; 
            document.getElementById('imgPreview').style.display='block';
        }
        document.getElementById('giftIdHidden').value = id;
    }
};

// ... Resto Funzioni (Standard) ...
async function checkAndAddPerson(name, relation) {
    const q = window.dbSdk.query(window.dbSdk.collection(window.db, "persone"), window.dbSdk.where("name", "==", name));
    const snap = await window.dbSdk.getDocs(q);
    if(snap.empty) {
        await window.dbSdk.addDoc(window.dbSdk.collection(window.db, "persone"), { name: name, relation: relation || "Altro" });
        await loadPeopleCache();
    }
}
window.addPerson = async () => {
    const name = document.getElementById('newPersonName').value;
    const relation = document.getElementById('newPersonRelation').value;
    if(!name) return alert("Inserisci un nome!");
    try {
        await window.dbSdk.addDoc(window.dbSdk.collection(window.db, "persone"), { name: name, relation: relation || "Altro" });
        await loadPeopleCache();
        document.getElementById('newPersonName').value = "";
        loadPeopleList();
        alert("Aggiunto!");
    } catch(e) { alert("Errore: " + e.message); }
};
window.deletePerson = async (id) => { if(confirm("Eliminare contatto?")) { await window.dbSdk.deleteDoc(window.dbSdk.doc(window.db, "persone", id)); loadPeopleList(); loadPeopleCache(); } };
window.editPerson = async (id, oldName, oldRel) => { const newName = prompt("Modifica nome:", oldName); if(newName && newName !== oldName) { await window.dbSdk.updateDoc(window.dbSdk.doc(window.db, "persone", id), { name: newName }); loadPeopleList(); loadPeopleCache(); } };

// Reset Form (con pulizia totale)
function setupQuickGiftForm() {
    document.getElementById('quickDesc').value = "";
    document.getElementById('quickAmount').value = "";
    document.getElementById('quickTag').selectedIndex = 0;
    document.getElementById('quickType').selectedIndex = 0;
    
    const qSender = document.getElementById('quickSender');
    const qPerson = document.getElementById('quickPerson');
    
    if(state.mode === 'fatti') { qSender.value = "Claudio"; qPerson.value = ""; } 
    else { qSender.value = ""; qPerson.value = state.familyMember; }

    if(state.eventId) { 
        document.getElementById('quickEventName').value = state.eventData.name;
        document.getElementById('quickDateInput').value = state.eventData.date;
        document.getElementById('quickEventIdHidden').value = state.eventId;
    } else {
        document.getElementById('quickEventName').value = "";
        document.getElementById('quickDateInput').value = new Date().toISOString().split('T')[0];
        document.getElementById('quickEventIdHidden').value = "";
    }
    loadPeopleDatalist();
    populateTagSelect('quickTag', state.tags);
    populateTagSelect('quickRelation', state.personTags);
}

function setupAddGiftForm() {
    document.getElementById('giftDesc').value = "";
    document.getElementById('giftAmount').value = "";
    document.getElementById('giftNotes').value = "";
    document.getElementById('giftFileBase64').value = "";
    document.getElementById('imgPreview').style.display = 'none';
    document.getElementById('giftIdHidden').value = ""; 

    const gSender = document.getElementById('giftSender');
    const gPerson = document.getElementById('giftPerson');
    
    if(state.mode === 'fatti') { gSender.value = "Claudio"; gPerson.value = ""; } 
    else { gSender.value = ""; gPerson.value = state.familyMember; }
    
    loadPeopleDatalist();
    // Importante: popolare le select PRIMA che l'utente possa vederle vuote
    populateTagSelect('giftTag', state.tags);
    populateTagSelect('giftRelation', state.personTags);
}

// ... Altre funzioni essenziali (Copia-incolla) ...
window.openTypeModal=()=>{document.getElementById('typeModal').style.display='flex'}; window.goToSingle=()=>{state.eventId=null;document.getElementById('typeModal').style.display='none';window.navTo('quick_gift')}; window.goToGroup=()=>{document.getElementById('typeModal').style.display='none';window.navTo('crea_evento')};
window.togglePersonView = function(view) { if(view === 'fatti') { document.getElementById('histFattiContainer').style.display = 'block'; document.getElementById('histRicevutiContainer').style.display = 'none'; } else { document.getElementById('histFattiContainer').style.display = 'none'; document.getElementById('histRicevutiContainer').style.display = 'block'; } };
window.openPersonAnalysis = async function(name) { document.getElementById('personDetailTitle').innerText = name; window.navTo('person_detail'); const md = document.getElementById('personGiftsMade'); const rd = document.getElementById('personGiftsReceived'); md.innerHTML = "Caricamento..."; rd.innerHTML = "Caricamento..."; const qS = window.dbSdk.query(window.dbSdk.collection(window.db, "regali"), window.dbSdk.where("sender", "==", name)); const sS = await window.dbSdk.getDocs(qS); const qR = window.dbSdk.query(window.dbSdk.collection(window.db, "regali"), window.dbSdk.where("recipient", "==", name)); const sR = await window.dbSdk.getDocs(qR); md.innerHTML = ""; rd.innerHTML = ""; let sv = 0, rv = 0; if(sS.empty) md.innerHTML = "<small>Nessun regalo fatto.</small>"; sS.forEach(d => { const dt = d.data(); sv += dt.amount; md.innerHTML += createGiftCard(dt, d.id, 'sender'); }); if(sR.empty) rd.innerHTML = "<small>Nessun regalo ricevuto.</small>"; sR.forEach(d => { const dt = d.data(); rv += dt.amount; rd.innerHTML += createGiftCard(dt, d.id, 'recipient'); }); document.getElementById('personBalance').innerText = `Ha Fatto: € ${sv} | Ha Ricevuto: € ${rv}`; };
function createGiftCard(dt, id, context) { const arrow = context === 'sender' ? `A: <strong>${dt.recipient}</strong>` : `Da: <strong>${dt.sender}</strong>`; const color = context === 'sender' ? '#FF9A9E' : '#a18cd1'; return `<div class="event-compact" onclick="editGiftSetup('${id}')" style="cursor:pointer;border-left:4px solid ${color}"><div style="flex-grow:1;"><div style="font-weight:bold;font-size:14px;">${dt.desc}</div><div style="font-size:11px;color:#666;">${dt.eventName} (${dt.year})</div><div style="font-size:11px;margin-top:2px;">${arrow}</div></div><div style="font-weight:bold;">€ ${dt.amount}</div></div>`}
window.handleQuickGift = async function(addAnother) { const date = document.getElementById('quickDateInput').value; const evName = document.getElementById('quickEventName').value; const sender = document.getElementById('quickSender').value; const recipient = document.getElementById('quickPerson').value; const relation = document.getElementById('quickRelation').value; const desc = document.getElementById('quickDesc').value; const amount = parseFloat(document.getElementById('quickAmount').value) || 0; const type = document.getElementById('quickType').value; const tag = document.getElementById('quickTag').value; const evId = document.getElementById('quickEventIdHidden').value; if(!recipient || !evName) return alert("Compila tutto"); try { let evRefId = state.eventId || evId; if(!evRefId) { const evRef = await window.dbSdk.addDoc(window.dbSdk.collection(window.db, "eventi"), { mode: state.mode, category: state.category, familyMember: state.familyMember, name: evName, date: date, type: 'singolo', createdAt: new Date().toISOString() }); evRefId = evRef.id; state.eventId = evRefId; state.eventData = { name: evName, date: date }; } else { await window.dbSdk.updateDoc(window.dbSdk.doc(window.db, "eventi", evRefId), { name: evName, date: date }); } await window.dbSdk.addDoc(window.dbSdk.collection(window.db, "regali"), { eventId: evRefId, eventName: evName, person: recipient, sender: sender, recipient: recipient, desc, amount, tag, type, mode: state.mode, year: date.split('-')[0], createdAt: new Date().toISOString() }); if(state.mode === 'fatti' && recipient !== 'Io') await checkAndAddPerson(recipient, relation); if(state.mode === 'ricevuti' && sender !== 'Io') await checkAndAddPerson(sender, relation); if(addAnother) { alert("Salvato!"); document.getElementById('quickDesc').value = ""; document.getElementById('quickAmount').value = ""; } else { alert("Salvato!"); window.navTo('lista_eventi'); } } catch(err) { alert(err.message); } };
window.handleSaveGift = async function(addAnother) { const sender = document.getElementById('giftSender').value; const recipient = document.getElementById('giftPerson').value; const relation = document.getElementById('giftRelation').value; const amount = parseFloat(document.getElementById('giftAmount').value) || 0; const id = document.getElementById('giftIdHidden').value; if(!recipient) return alert("Nome obbligatorio"); try { const payload = { eventId: state.eventId, eventName: state.eventData.name || "Evento", person: recipient, sender: sender, recipient: recipient, desc: document.getElementById('giftDesc').value || "Oggetto", amount, tag: document.getElementById('giftTag').value, type: document.getElementById('giftType').value, notes: document.getElementById('giftNotes').value, file: document.getElementById('giftFileBase64').value, mode: state.mode, year: state.eventData.date.split('-')[0], createdAt: new Date().toISOString() }; if(id) await window.dbSdk.updateDoc(window.dbSdk.doc(window.db, "regali", id), payload); else { await window.dbSdk.addDoc(window.dbSdk.collection(window.db, "regali"), payload); if(state.mode === 'fatti' && recipient !== 'Io') await checkAndAddPerson(recipient, relation); if(state.mode === 'ricevuti' && sender !== 'Io') await checkAndAddPerson(sender, relation); } if(addAnother) { alert("Salvato!"); document.getElementById('giftDesc').value = ""; document.getElementById('giftAmount').value = ""; state.giftId = null; } else { window.navTo('evento_dettaglio'); } } catch(err) { alert(err.message); } };
function loadTags() { const t = localStorage.getItem('customTags'); if(t) state.tags = JSON.parse(t); const pt = localStorage.getItem('personTags'); if(pt) state.personTags = JSON.parse(pt); }
function populateTagSelect(id,arr){const s=document.getElementById(id);if(s){s.innerHTML="";arr.forEach(x=>s.innerHTML+=`<option value="${x}">${x}</option>`)}}
window.promptAddTag = function(type) { const t = prompt("Nuovo Tag:"); if(t && t.trim() !== "") { if(type === 'gift') { if(!state.tags.includes(t)) state.tags.push(t); localStorage.setItem('customTags', JSON.stringify(state.tags)); } else { if(!state.personTags.includes(t)) state.personTags.push(t); localStorage.setItem('personTags', JSON.stringify(state.personTags)); } renderTagsSettings(); } };
window.resetTags = function(type) { if(confirm("Ripristinare i tag?")) { if(type === 'gift') localStorage.removeItem('customTags'); else localStorage.removeItem('personTags'); window.location.reload(); } };
function renderTagsSettings() { document.getElementById('tagsList').innerHTML = state.tags.map(t => `<span class="tag-pill">${t}</span>`).join(' '); document.getElementById('peopleTagsList').innerHTML = state.personTags.map(t => `<span class="tag-pill" style="background:#e0f7fa; color:#006064;">${t}</span>`).join(' '); }
window.wipeDatabase=async()=>{if(prompt("SCRIVI 'CANCELLA'")!=="CANCELLA")return;document.body.style.opacity="0.5";const cs=["eventi","regali","persone","famiglia","categorie"];try{for(let c of cs){const s=await window.dbSdk.getDocs(window.dbSdk.collection(window.db,c));for(let d of s.docs)await window.dbSdk.deleteDoc(window.dbSdk.doc(window.db,c,d.id))}alert("Reset!");window.location.reload()}catch(e){alert(e);document.body.style.opacity="1"}};
async function loadUnifiedCategories(){const l=document.getElementById('unifiedCatList');l.innerHTML="Caricamento...";const d=["Natale","Compleanno","Matrimonio","Laurea","Battesimo"];const s=await window.dbSdk.getDocs(window.dbSdk.collection(window.db,"categorie"));if(s.empty){for(let c of d)await window.dbSdk.addDoc(window.dbSdk.collection(window.db,"categorie"),{name:c});return loadUnifiedCategories()}let a=[];s.forEach(d=>a.push({id:d.id,name:d.data().name}));a.sort((x,y)=>x.name.localeCompare(y.name));l.innerHTML="";a.forEach(c=>{const v=document.createElement('div');v.className='cat-item';v.innerHTML=`<div class="cat-name" onclick="window.selectCategory('${c.name}')">${c.name}</div><div class="cat-actions"><div class="btn-icon" onclick="editCategory('${c.id}','${c.name}')">✏️</div></div>`;l.appendChild(v)})}
window.createCustomCategory=async()=>{const c=prompt("Nome:");if(c)await window.dbSdk.addDoc(window.dbSdk.collection(window.db,"categorie"),{name:c});loadUnifiedCategories()}; window.editCategory=async(i,o)=>{const n=prompt("Modifica (vuoto=elimina):",o);if(n===null)return;if(n===""){if(confirm("Elimina?"))await window.dbSdk.deleteDoc(window.dbSdk.doc(window.db,"categorie",i))}else await window.dbSdk.updateDoc(window.dbSdk.doc(window.db,"categorie",i),{name:n});loadUnifiedCategories()};
window.handleSaveEventContainer=async(e)=>{e.preventDefault();const n=document.getElementById('eventNameInput').value;const d=document.getElementById('eventDateInput').value;const i=document.getElementById('eventIdHidden').value;const p={mode:state.mode,category:state.category,familyMember:state.familyMember,name:n,date:d,type:'multiplo',createdAt:new Date().toISOString()};if(i)await window.dbSdk.updateDoc(window.dbSdk.doc(window.db,"eventi",i),p);else await window.dbSdk.addDoc(window.dbSdk.collection(window.db,"eventi"),p);window.navTo('lista_eventi')};
window.deleteEvent=async(id)=>{if(confirm("Eliminare evento?"))await window.dbSdk.deleteDoc(window.dbSdk.doc(window.db,"eventi",id));loadEvents()};
window.openEvent=(id,name,date)=>{state.eventId=id;state.eventData={name,date};window.navTo('evento_dettaglio')};
window.editEventSetup=(id,name,date,type)=>{state.eventId=id;state.eventData={name,date};if(type==='singolo'){window.navTo('quick_gift');}else{window.navTo('crea_evento');document.getElementById('eventNameInput').value=name;document.getElementById('eventDateInput').value=date;document.getElementById('eventIdHidden').value=id}};
window.deleteGift=async(id)=>{if(confirm("Eliminare?"))await window.dbSdk.deleteDoc(window.dbSdk.doc(window.db,"regali",id));loadGifts()};
window.getDocById=async(col,id)=>{const s=await window.dbSdk.getDocs(window.dbSdk.query(window.dbSdk.collection(window.db,col)));let f=null;s.forEach(d=>{if(d.id===id)f=d.data()});return f};
window.handleFileSelect=function(e){const f=e.target.files[0];if(f){const r=new FileReader();r.onload=function(ev){document.getElementById('giftFileBase64').value=ev.target.result;document.getElementById('imgPreview').src=ev.target.result;document.getElementById('imgPreview').style.display='block'};r.readAsDataURL(f)}};
async function loadPeopleDatalist(){const d=document.getElementById('peopleDatalist');d.innerHTML="";const s=await window.dbSdk.getDocs(window.dbSdk.collection(window.db,"persone"));s.forEach(x=>d.innerHTML+=`<option value="${x.data().name}">`)}
window.autoSelectRelation=(n,id)=>{const p=state.peopleCache.find(x=>x.name.toLowerCase()===n.toLowerCase());const s=document.getElementById(id);if(p&&p.relation){s.value=p.relation;s.style.border="2px solid green";setTimeout(()=>s.style.border="none",1000)}}
window.calculateAnalysis=async()=>{const y=document.getElementById('analysisYear').value;const s=await window.dbSdk.getDocs(window.dbSdk.query(window.dbSdk.collection(window.db,"regali"),window.dbSdk.where("year","==",y)));let sp=0,re=0,ts={},fs={};s.forEach(d=>{const v=d.data().amount;const t=d.data().tag||"Altro";if(d.data().mode==='fatti'){sp+=v;if(!ts[t])ts[t]=0;ts[t]+=v}else{re+=v;const m=d.data().recipient||"Sconosciuto";if(!fs[m])fs[m]=0;fs[m]+=v}});document.getElementById('totalSpent').innerText="€ "+sp.toFixed(2);const c=document.getElementById('tagAnalysisChart');c.innerHTML="";for(let[t,v]of Object.entries(ts)){c.innerHTML+=`<div style="margin-bottom:5px">${t} (€ ${v})</div><div style="background:var(--primary);height:10px;border-radius:5px;width:${(v/sp)*100}%"></div>`};const fc=document.getElementById('familyStatsContainer');fc.innerHTML="";for(let[m,v]of Object.entries(fs)){fc.innerHTML+=`<div class="card" style="padding:10px;display:flex;justify-content:space-between"><strong>${m}</strong><span>€ ${v.toFixed(2)}</span></div>`}};
window.exportData=async()=>{alert("Backup...");const cs=["eventi","regali","persone","famiglia","categorie"];let b={};for(let c of cs){const s=await window.dbSdk.getDocs(window.dbSdk.collection(window.db,c));b[c]=[];s.forEach(d=>b[c].push({id:d.id,...d.data()}))}const u=URL.createObjectURL(new Blob([JSON.stringify(b)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='backup.json';a.click()};
window.importData=(e)=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=async(ev)=>{const d=JSON.parse(ev.target.result);const b=window.dbSdk.writeBatch(window.db);for(let c in d)for(let i of d[c]){const{id,...dt}=i;b.set(window.dbSdk.doc(window.db,c,id),dt)}await b.commit();alert("Fatto!");window.location.reload()};r.readAsText(f)};
async function loadEvents(){const c=document.getElementById('eventsListContainer');c.innerHTML="Caricamento...";try{let q=window.dbSdk.query(window.dbSdk.collection(window.db,"eventi"),window.dbSdk.where("mode","==",state.mode),window.dbSdk.where("category","==",state.category),window.dbSdk.orderBy("date","desc"));if(state.mode==='ricevuti')q=window.dbSdk.query(q,window.dbSdk.where("familyMember","==",state.familyMember));const snap=await window.dbSdk.getDocs(q);c.innerHTML="";if(snap.empty){c.innerHTML="<p align='center' style='color:#999'>Nessun evento.</p>";return}snap.forEach(d=>{const data=d.data();const div=document.createElement('div');div.className='event-compact';div.innerHTML=`<div style="flex-grow:1;" onclick="openEvent('${d.id}','${data.name}','${data.date}')"><div class="ev-title">${data.name}</div><div class="ev-date">📅 ${data.date}</div></div><div class="ev-actions"><div class="btn-icon" style="color:blue;" onclick="editEventSetup('${d.id}','${data.name}','${data.date}','${data.type}')">✏️</div><div class="btn-icon" style="color:red;" onclick="deleteEvent('${d.id}')">🗑</div></div>`;c.appendChild(div)})}catch(e){console.error(e)}};
async function loadGifts(){const c=document.getElementById('giftsContainer');c.innerHTML="...";const snap=await window.dbSdk.getDocs(window.dbSdk.query(window.dbSdk.collection(window.db,"regali"),window.dbSdk.where("eventId","==",state.eventId)));c.innerHTML="";let t=0;snap.forEach(d=>{const dt=d.data();t+=dt.amount;const h=`<div class="event-compact" onclick="editGiftSetup('${d.id}')" style="cursor:pointer; border-left-color:${state.mode==='fatti'?'#FF9A9E':'#a18cd1'}"><div style="flex-grow:1;"><div style="font-weight:bold;">${dt.desc}</div><div style="font-size:11px;color:#666;">Da: ${dt.sender} ⮕ A: ${dt.recipient}</div></div><div style="font-weight:bold;">€ ${dt.amount}</div><div class="btn-icon text-red" style="margin-left:10px;" onclick="event.stopPropagation(); deleteGift('${d.id}')">🗑</div></div>`;c.innerHTML+=h});c.innerHTML+=`<div style="text-align:right;font-size:18px;font-weight:bold;margin-top:10px;">Totale: € ${t.toFixed(2)}</div>`}
async function loadFamilyMembers(){const c=document.getElementById('familyListContainer');c.innerHTML="...";const snap=await window.dbSdk.getDocs(window.dbSdk.collection(window.db,"famiglia"));c.innerHTML="";if(snap.empty){["Claudio","Giovanna","Isabel"].forEach(async name=>{await window.dbSdk.addDoc(window.dbSdk.collection(window.db,"famiglia"),{name})});return setTimeout(loadFamilyMembers,500)}snap.forEach(d=>{const div=document.createElement('div');div.className='cat-item';div.innerHTML=`<div class="cat-name" onclick="window.selectFamilyMember('${d.data().name}')">👤 ${d.data().name}</div><div class="cat-actions"><div class="btn-icon" onclick="editFamilyMember('${d.id}','${d.data().name}')">✏️</div><div class="btn-icon text-red" onclick="deleteFamilyMember('${d.id}')">🗑</div></div>`;c.appendChild(div)})}
window.selectFamilyMember=(n)=>{state.familyMember=n;window.navTo('ricevuti_categorie')}; window.editFamilyMember=async(id,old)=>{const n=prompt("Nome:",old);if(n&&n!==old){await window.dbSdk.updateDoc(window.dbSdk.doc(window.db,"famiglia",id),{name:n});loadFamilyMembers()}}; window.deleteFamilyMember=async(id)=>{if(confirm("Eliminare?")){await window.dbSdk.deleteDoc(window.dbSdk.doc(window.db,"famiglia",id));loadFamilyMembers()}}; window.promptAddFamilyMember=async()=>{const n=prompt("Nome:");if(n)await window.dbSdk.addDoc(window.dbSdk.collection(window.db,"famiglia"),{name:n});loadFamilyMembers()};
window.appendSender=(id)=>{const v=prompt("Chi altro?");if(v)document.getElementById(id).value+=", "+v};
window.toggleTheme=()=>{document.body.classList.toggle('dark-mode');localStorage.setItem('theme',document.body.classList.contains('dark-mode')?'dark':'light')};