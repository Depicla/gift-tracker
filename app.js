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

// === HELPER FUNCTIONS (Caricamento Dati) ===
async function loadPeopleCache() {
    const s = await window.dbSdk.getDocs(window.dbSdk.collection(window.db, "persone"));
    state.peopleCache = [];
    s.forEach(d => state.peopleCache.push({id: d.id, ...d.data()}));
}

async function checkAndAddPerson(name, relation) {
    const q = window.dbSdk.query(window.dbSdk.collection(window.db, "persone"), window.dbSdk.where("name", "==", name));
    const snap = await window.dbSdk.getDocs(q);
    if(snap.empty) {
        await window.dbSdk.addDoc(window.dbSdk.collection(window.db, "persone"), { name: name, relation: relation || "Altro" });
        await loadPeopleCache();
    }
}

async function processAndSaveContacts(namesStr, relation) {
    if (!namesStr) return;
    const names = namesStr.split(',').map(s => s.trim()).filter(s => s !== "" && s !== "Io" && s !== "Claudio" && s !== "Giovanna" && s !== "Isabel");
    for (let name of names) { await checkAndAddPerson(name, relation); }
}

async function loadPeopleDatalist() {
    const d = document.getElementById('peopleDatalist');
    d.innerHTML = "";
    const s = await window.dbSdk.getDocs(window.dbSdk.collection(window.db, "persone"));
    s.forEach(x => d.innerHTML += `<option value="${x.data().name}">`)
}

function populateTagSelect(id, arr) {
    const s = document.getElementById(id);
    if(s) { s.innerHTML = ""; arr.forEach(x => s.innerHTML += `<option value="${x}">${x}</option>`) }
}

// === RESET FORM AGGRESSIVO ===
function resetForms() {
    ['giftDesc', 'giftAmount', 'giftNotes', 'quickDesc', 'quickAmount', 'quickNotes'].forEach(id => {
        if(document.getElementById(id)) document.getElementById(id).value = "";
    });
    
    ['giftTag', 'giftType', 'quickTag', 'quickType'].forEach(id => {
        if(document.getElementById(id)) document.getElementById(id).selectedIndex = 0;
    });

    state.giftId = null;
    if(document.getElementById('giftIdHidden')) document.getElementById('giftIdHidden').value = "";
    if(document.getElementById('quickEventIdHidden')) document.getElementById('quickEventIdHidden').value = "";
    
    ['giftFileBase64', 'quickFileBase64'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = ""; });
    ['imgPreview', 'quickImgPreview'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).style.display = 'none'; });
}

// === NUOVA FUNZIONE: PREPARA NUOVO REGALO (DALLA LISTA) ===
window.prepareNewGift = function() {
    resetForms(); 
    setupAddGiftForm(); 
    window.navTo('aggiungi_regalo');
};

// === NAVIGAZIONE CORE (Riscritto) ===
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
                if(!state.giftId) { resetForms(); setupQuickGiftForm(); } 
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
                // prepareNewGift resetta, editGiftSetup no.
                backBtn.onclick = () => window.navTo('evento_dettaglio');
                break;
            case 'analisi': document.getElementById('analysisPage').classList.add('active'); backBtn.classList.add('hidden'); window.calculateAnalysis(); break;
            case 'rubrica': document.getElementById('peoplePage').classList.add('active'); backBtn.classList.add('hidden'); loadPeopleList(); populateTagSelect('newPersonRelation', state.personTags); break;
            case 'settings': document.getElementById('settingsPage').classList.add('active'); backBtn.classList.add('hidden'); renderTagsSettings(); break;
            case 'person_detail': document.getElementById('personDetailPage').classList.add('active'); backBtn.onclick = () => window.navTo('rubrica'); window.togglePersonView('fatti'); break;
        }
    }
};

// === SELEZIONE EVENTI (FIXATO) ===
window.selectCategory = function(cat) { 
    state.category = cat; 
    window.navTo('lista_eventi'); 
};

// === FAMIGLIA RESCUE ===
async function loadFamilyMembers(){
    const c = document.getElementById('familyListContainer');
    c.innerHTML = "Caricamento...";
    try {
        const snap = await window.dbSdk.getDocs(window.dbSdk.collection(window.db, "famiglia"));
        c.innerHTML = "";
        
        if(snap.empty){
            const defaults = ["Claudio", "Giovanna", "Isabel"];
            for(const name of defaults) await window.dbSdk.addDoc(window.dbSdk.collection(window.db, "famiglia"), {name});
            setTimeout(loadFamilyMembers, 1000); 
            return;
        }

        snap.forEach(d => {
            const div = document.createElement('div');
            div.className = 'cat-item';
            div.innerHTML = `<div class="cat-name" onclick="window.selectFamilyMember('${d.data().name}')">👤 ${d.data().name}</div>
            <div class="cat-actions"><div class="btn-icon" onclick="editFamilyMember('${d.id}','${d.data().name}')">✏️</div><div class="btn-icon text-red" onclick="deleteFamilyMember('${d.id}')">🗑</div></div>`;
            c.appendChild(div);
        });
    } catch(e) { c.innerHTML = "Errore: " + e.message; }
}

// === CARICAMENTO INIZIALE ===
window.onload = async function() {
    loadTags();
    await loadPeopleCache();
    document.getElementById('appLoader').style.opacity = '0';
    setTimeout(() => { document.getElementById('appLoader').style.display = 'none'; }, 500);
    if(localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
};

// ... RESTO DEL CODICE STANDARD (Copia-Incolla da v29) ...
window.selectFamilyMember=(n)=>{state.familyMember=n;window.navTo('ricevuti_categorie')}; window.editFamilyMember=async(id,old)=>{const n=prompt("Nome:",old);if(n&&n!==old){await window.dbSdk.updateDoc(window.dbSdk.doc(window.db,"famiglia",id),{name:n});loadFamilyMembers()}}; window.deleteFamilyMember=async(id)=>{if(confirm("Eliminare?")){await window.dbSdk.deleteDoc(window.dbSdk.doc(window.db,"famiglia",id));loadFamilyMembers()}}; window.promptAddFamilyMember=async()=>{const n=prompt("Nome:");if(n)await window.dbSdk.addDoc(window.dbSdk.collection(window.db,"famiglia"),{name:n});loadFamilyMembers()};
window.appendSender=(id)=>{const v=prompt("Chi altro?");if(v)document.getElementById(id).value+=", "+v};
window.toggleTheme=()=>{document.body.classList.toggle('dark-mode');localStorage.setItem('theme',document.body.classList.contains('dark-mode')?'dark':'light')};
window.handleQuickGift=async(addAnother)=>{const date=document.getElementById('quickDateInput').value;const evName=document.getElementById('quickEventName').value;const sender=document.getElementById('quickSender').value;const recipient=document.getElementById('quickPerson').value;const relation=document.getElementById('quickRelation').value;const desc=document.getElementById('quickDesc').value;const amount=parseFloat(document.getElementById('quickAmount').value)||0;const type=document.getElementById('quickType').value;const tag=document.getElementById('quickTag').value;const evId=document.getElementById('quickEventIdHidden').value;if(!recipient||!evName)return alert("Compila tutto");try{let evRefId=state.eventId||evId;if(!evRefId){const evRef=await window.dbSdk.addDoc(window.dbSdk.collection(window.db,"eventi"),{mode:state.mode,category:state.category,familyMember:state.familyMember,name:evName,date:date,type:'singolo',createdAt:new Date().toISOString()});evRefId=evRef.id;state.eventId=evRefId;state.eventData={name:evName,date:date}}else{await window.dbSdk.updateDoc(window.dbSdk.doc(window.db,"eventi",evRefId),{name:evName,date:date})}await window.dbSdk.addDoc(window.dbSdk.collection(window.db,"regali"),{eventId:evRefId,eventName:evName,person:recipient,sender:sender,recipient:recipient,desc,amount,tag,type,notes:document.getElementById('quickNotes').value,file:document.getElementById('quickFileBase64').value,mode:state.mode,year:date.split('-')[0],createdAt:new Date().toISOString()});if(state.mode==='fatti')await processAndSaveContacts(recipient,relation);if(state.mode==='ricevuti')await processAndSaveContacts(sender,relation);if(addAnother){alert("Salvato!");resetForms();setupQuickGiftForm();}else{alert("Salvato!");window.navTo('lista_eventi')}}catch(e){alert(e.message)}};
window.handleSaveGift=async(addAnother)=>{const sender=document.getElementById('giftSender').value;const recipient=document.getElementById('giftPerson').value;const relation=document.getElementById('giftRelation').value;const amount=parseFloat(document.getElementById('giftAmount').value)||0;const id=document.getElementById('giftIdHidden').value;if(!recipient)return alert("Nome obbligatorio");try{const payload={eventId:state.eventId,eventName:state.eventData.name||"Evento",person:recipient,sender:sender,recipient:recipient,desc:document.getElementById('giftDesc').value||"Oggetto",amount,tag:document.getElementById('giftTag').value,type:document.getElementById('giftType').value,notes:document.getElementById('giftNotes').value,file:document.getElementById('giftFileBase64').value,mode:state.mode,year:state.eventData.date.split('-')[0],createdAt:new Date().toISOString()};if(id)await window.dbSdk.updateDoc(window.dbSdk.doc(window.db,"regali",id),payload);else{await window.dbSdk.addDoc(window.dbSdk.collection(window.db,"regali"),payload);if(state.mode==='fatti')await processAndSaveContacts(recipient,relation);if(state.mode==='ricevuti')await processAndSaveContacts(sender,relation)}if(addAnother){alert("Salvato!");resetForms();setupAddGiftForm();}else window.navTo('evento_dettaglio')}catch(e){alert(e.message)}};
window.promptAddTag = function(type) { const t = prompt("Nuovo Tag:"); if(t && t.trim() !== "") { if(type === 'gift') { if(!state.tags.includes(t)) state.tags.push(t); localStorage.setItem('customTags', JSON.stringify(state.tags)); } else { if(!state.personTags.includes(t)) state.personTags.push(t); localStorage.setItem('personTags', JSON.stringify(state.personTags)); } renderTagsSettings(); } };
window.deleteTag = function(type, tag) { if(confirm("Eliminare il tag '" + tag + "'?")) { if(type === 'gift') { state.tags = state.tags.filter(t => t !== tag); localStorage.setItem('customTags', JSON.stringify(state.tags)); } else { state.personTags = state.personTags.filter(t => t !== tag); localStorage.setItem('personTags', JSON.stringify(state.personTags)); } renderTagsSettings(); } };
function renderTagsSettings() { const giftTagsHtml = state.tags.map(t => `<span class="tag-pill">${t} <span onclick="window.deleteTag('gift', '${t}')" class="tag-remove">✖</span></span>`).join(' '); document.getElementById('tagsList').innerHTML = giftTagsHtml || "Nessun tag"; const personTagsHtml = state.personTags.map(t => `<span class="tag-pill" style="background:#e0f7fa; color:#006064;">${t} <span onclick="window.deleteTag('person', '${t}')" class="tag-remove">✖</span></span>`).join(' '); document.getElementById('peopleTagsList').innerHTML = personTagsHtml || "Nessun tag"; }
function loadTags() { const t = localStorage.getItem('customTags'); if(t) state.tags = JSON.parse(t); const pt = localStorage.getItem('personTags'); if(pt) state.personTags = JSON.parse(pt); }
function setupQuickGiftForm() { loadPeopleDatalist(); populateTagSelect('quickTag', state.tags); populateTagSelect('quickRelation', state.personTags); const qSender = document.getElementById('quickSender'); const qPerson = document.getElementById('quickPerson'); if(state.mode === 'fatti') { qSender.value = "Claudio"; qPerson.value = ""; } else { qSender.value = ""; qPerson.value = state.familyMember; } if(state.eventId) { document.getElementById('quickEventName').value = state.eventData.name; document.getElementById('quickDateInput').value = state.eventData.date; document.getElementById('quickEventIdHidden').value = state.eventId; } else { document.getElementById('quickEventName').value = ""; document.getElementById('quickDateInput').value = new Date().toISOString().split('T')[0]; document.getElementById('quickEventIdHidden').value = ""; } }
function setupAddGiftForm() { loadPeopleDatalist(); populateTagSelect('giftTag', state.tags); populateTagSelect('giftRelation', state.personTags); const gSender = document.getElementById('giftSender'); const gPerson = document.getElementById('giftPerson'); if(state.mode === 'fatti') { gSender.value = "Claudio"; gPerson.value = ""; } else { gSender.value = ""; gPerson.value = state.familyMember; } }
window.openAddSenderModal = function(targetId) { document.getElementById('addSenderModal').style.display = 'flex'; document.getElementById('targetInputId').value = targetId; document.getElementById('extraPersonInput').value = ""; document.getElementById('extraPersonInput').focus(); };
window.confirmAddSender = function() { const newVal = document.getElementById('extraPersonInput').value; const targetId = document.getElementById('targetInputId').value; const input = document.getElementById(targetId); if(newVal && newVal.trim() !== "") { if(input.value) input.value += ", " + newVal.trim(); else input.value = newVal.trim(); } document.getElementById('addSenderModal').style.display = 'none'; };
window.togglePersonView = function(view) { if(view === 'fatti') { document.getElementById('histFattiContainer').style.display = 'block'; document.getElementById('histRicevutiContainer').style.display = 'none'; } else { document.getElementById('histFattiContainer').style.display = 'none'; document.getElementById('histRicevutiContainer').style.display = 'block'; } };
window.openPersonAnalysis = async function(name) { document.getElementById('personDetailTitle').innerText = name; window.navTo('person_detail'); const md = document.getElementById('personGiftsMade'); const rd = document.getElementById('personGiftsReceived'); md.innerHTML = "Caricamento..."; rd.innerHTML = "Caricamento..."; const snap = await window.dbSdk.getDocs(window.dbSdk.collection(window.db, "regali")); let sentList = []; let recvList = []; let sentVal = 0, recvVal = 0; snap.forEach(d => { const dt = d.data(); const isSender = (dt.sender||"").includes(name); const isRecipient = (dt.recipient||"").includes(name); if (isSender) { sentVal += (dt.amount || 0); sentList.push({id: d.id, ...dt}); } if (isRecipient) { recvVal += (dt.amount || 0); recvList.push({id: d.id, ...dt}); } }); const sorter = (a, b) => { const dateA = a.createdAt || "1970-01-01"; const dateB = b.createdAt || "1970-01-01"; return dateB.localeCompare(dateA); }; sentList.sort(sorter); recvList.sort(sorter); md.innerHTML = sentList.length ? "" : "<small style='color:#999'>Nessun regalo fatto.</small>"; sentList.forEach(item => { md.innerHTML += createGiftCard(item, item.id, 'sender'); }); rd.innerHTML = recvList.length ? "" : "<small style='color:#999'>Nessun regalo ricevuto.</small>"; recvList.forEach(item => { rd.innerHTML += createGiftCard(item, item.id, 'recipient'); }); document.getElementById('personSentVal').innerText = "€ " + sentVal.toFixed(2); document.getElementById('personRecvVal').innerText = "€ " + recvVal.toFixed(2); };
function createGiftCard(dt, id, context) { const arrow = context === 'sender' ? `A: <strong>${dt.recipient}</strong>` : `Da: <strong>${dt.sender}</strong>`; const color = context === 'sender' ? '#FF9A9E' : '#a18cd1'; return `<div class="event-compact" onclick="editGiftSetup('${id}')" style="cursor:pointer; border-left-color:${color}"><div style="flex-grow:1;"><div style="font-size:13px; font-weight:bold;">${dt.desc}</div><div style="font-size:11px; color:#666;">${dt.eventName} (${dt.year})</div><div style="font-size:11px; margin-top:2px;">${arrow}</div></div><div style="font-weight:bold; color:#333;">€ ${dt.amount}</div></div>`}
window.openTypeModal=()=>{document.getElementById('typeModal').style.display='flex'}; window.goToSingle=()=>{state.eventId=null;document.getElementById('typeModal').style.display='none';window.navTo('quick_gift')}; window.goToGroup=()=>{document.getElementById('typeModal').style.display='none';window.navTo('crea_evento')};
window.editGiftSetup = async(id) => { state.giftId = id; window.navTo('aggiungi_regalo'); populateTagSelect('giftTag', state.tags); populateTagSelect('giftRelation', state.personTags); const d = await window.getDocById("regali", id); if(d) { document.getElementById('giftSender').value = d.sender || ""; document.getElementById('giftPerson').value = d.recipient || d.person; document.getElementById('giftDesc').value = d.desc; document.getElementById('giftAmount').value = d.amount; document.getElementById('giftNotes').value = d.notes; document.getElementById('giftTag').value = d.tag; document.getElementById('giftType').value = d.type; document.getElementById('giftFileBase64').value = d.file||""; if(d.file){document.getElementById('imgPreview').src=d.file; document.getElementById('imgPreview').style.display='block'} document.getElementById('giftIdHidden').value = id; } };
window.addPerson = async () => { const n = document.getElementById('newPersonName').value; const r = document.getElementById('newPersonRelation').value; if(!n) return alert("Inserisci un nome!"); try { await window.dbSdk.addDoc(window.dbSdk.collection(window.db, "persone"), { name: n, relation: r || "Altro" }); await loadPeopleCache(); document.getElementById('newPersonName').value = ""; loadPeopleList(); alert("Aggiunto!"); } catch(e) { alert("Errore: " + e.message); } };
window.deletePerson = async (id) => { if(confirm("Eliminare contatto?")) { await window.dbSdk.deleteDoc(window.dbSdk.doc(window.db, "persone", id)); loadPeopleList(); loadPeopleCache(); } };
window.editPerson = async (id, oldName, oldRel) => { const newName = prompt("Modifica nome:", oldName); if(newName && newName !== oldName) { await window.dbSdk.updateDoc(window.dbSdk.doc(window.db, "persone", id), { name: newName }); loadPeopleList(); loadPeopleCache(); } };
async function loadPeopleList() { const c = document.getElementById('peopleListContainer'); c.innerHTML = "Caricamento..."; await loadPeopleCache(); c.innerHTML = ""; state.peopleCache.sort((a,b) => a.name.localeCompare(b.name)); state.peopleCache.forEach(p => { const div = document.createElement('div'); div.className = 'cat-item'; div.innerHTML = `<div onclick="window.openPersonAnalysis('${p.name}')" style="flex-grow:1;"><strong>${p.name}</strong> <span class="tag-pill">${p.relation || 'Altro'}</span></div><div class="cat-actions"><div class="btn-icon" onclick="window.editPerson('${p.id}','${p.name}','${p.relation}')">✏️</div><div class="btn-icon text-red" onclick="window.deletePerson('${p.id}')">🗑</div></div>`; c.appendChild(div); }); }
window.filterPeople = function() { const term = document.getElementById('searchPeopleInput').value.toLowerCase(); const filtered = state.peopleCache.filter(p => p.name.toLowerCase().includes(term)); renderPeopleList(filtered); };
function renderPeopleList(list) { const c = document.getElementById('peopleListContainer'); c.innerHTML = ""; list.sort((a,b) => a.name.localeCompare(b.name)); list.forEach(p => { const div = document.createElement('div'); div.className = 'cat-item'; div.innerHTML = `<div onclick="window.openPersonAnalysis('${p.name}')" style="flex-grow:1;"><strong>${p.name}</strong> <span class="tag-pill">${p.relation || 'Altro'}</span></div><div class="cat-actions"><div class="btn-icon" onclick="window.editPerson('${p.id}','${p.name}','${p.relation}')">✏️</div><div class="btn-icon text-red" onclick="window.deletePerson('${p.id}')">🗑</div></div>`; c.appendChild(div); }); }
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
window.exportExcel = async () => { try { const snap = await window.dbSdk.getDocs(window.dbSdk.collection(window.db, 'regali')); let dataFatti = []; let dataRicevuti = []; snap.forEach(doc => { const d = doc.data(); const row = { DataInserimento: d.createdAt ? d.createdAt.split('T')[0] : '', AnnoRiferimento: d.year || '', Evento: d.eventName || '', Mittente: d.sender || '', Destinatario: d.recipient || '', Descrizione: d.desc || '', Importo: d.amount || 0, Tipo: d.type || '', Tag: d.tag || '', Note: d.notes || '' }; if(d.mode === 'fatti') dataFatti.push(row); else dataRicevuti.push(row); }); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataFatti.length?dataFatti:[{Info:"Vuoto"}]), "Regali Fatti"); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataRicevuti.length?dataRicevuti:[{Info:"Vuoto"}]), "Regali Ricevuti"); XLSX.writeFile(wb, "GiftTracker_Export.xlsx"); } catch (e) { alert("Errore Export: " + e.message); } };
window.exportData=async()=>{const cs=["eventi","regali","persone","famiglia","categorie"];let b={};for(let c of cs){const s=await window.dbSdk.getDocs(window.dbSdk.collection(window.db,c));b[c]=[];s.forEach(d=>b[c].push({id:d.id,...d.data()}))}const u=URL.createObjectURL(new Blob([JSON.stringify(b)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='backup.json';document.body.appendChild(a);a.click();document.body.removeChild(a);};
window.importData=(e)=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=async(ev)=>{const d=JSON.parse(ev.target.result);const b=window.dbSdk.writeBatch(window.db);for(let c in d)for(let i of d[c]){const{id,...dt}=i;b.set(window.dbSdk.doc(window.db,c,id),dt)}await b.commit();alert("Fatto!");window.location.reload()};r.readAsText(f)};
async function loadEvents(){const c=document.getElementById('eventsListContainer');c.innerHTML="Caricamento...";try{let q=window.dbSdk.query(window.dbSdk.collection(window.db,"eventi"),window.dbSdk.where("mode","==",state.mode),window.dbSdk.where("category","==",state.category),window.dbSdk.orderBy("date","desc"));if(state.mode==='ricevuti')q=window.dbSdk.query(q,window.dbSdk.where("familyMember","==",state.familyMember));const snap=await window.dbSdk.getDocs(q);c.innerHTML="";if(snap.empty){c.innerHTML="<p align='center' style='color:#999'>Nessun evento.</p>";return}snap.forEach(d=>{const data=d.data();const div=document.createElement('div');div.className='event-compact';div.innerHTML=`<div style="flex-grow:1;" onclick="openEvent('${d.id}','${data.name}','${data.date}')"><div class="ev-title">${data.name}</div><div class="ev-date">📅 ${data.date}</div></div><div class="ev-actions"><div class="btn-icon" style="color:blue;" onclick="editEventSetup('${d.id}','${data.name}','${data.date}','${data.type}')">✏️</div><div class="btn-icon" style="color:red;" onclick="deleteEvent('${d.id}')">🗑</div></div>`;c.appendChild(div)})}catch(e){console.error(e)}};
async function loadGifts(){const c=document.getElementById('giftsContainer');c.innerHTML="...";const snap=await window.dbSdk.getDocs(window.dbSdk.query(window.dbSdk.collection(window.db,"regali"),window.dbSdk.where("eventId","==",state.eventId)));c.innerHTML="";let t=0;snap.forEach(d=>{const dt=d.data();t+=dt.amount;const h=`<div class="event-compact" onclick="editGiftSetup('${d.id}')" style="cursor:pointer; border-left-color:${state.mode==='fatti'?'#FF9A9E':'#a18cd1'}"><div style="flex-grow:1;"><div style="font-weight:bold;">${dt.desc}</div><div style="font-size:11px;color:#666;">Da: ${dt.sender} ⮕ A: ${dt.recipient}</div></div><div style="font-weight:bold;">€ ${dt.amount}</div><div class="btn-icon text-red" style="margin-left:10px;" onclick="event.stopPropagation(); deleteGift('${d.id}')">🗑</div></div>`;c.innerHTML+=h});c.innerHTML+=`<div style="text-align:right;font-size:18px;font-weight:bold;margin-top:10px;">Totale: € ${t.toFixed(2)}</div>`}