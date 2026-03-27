document.addEventListener('DOMContentLoaded', () => {

    // === CONSTANTES & CONFIG ===
    const SUPABASE_URL = "https://gmlgffpyvesaxhckpicu.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtbGdmZnB5dmVzYXhoY2twaWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTc0MTMsImV4cCI6MjA5MDEzMzQxM30.NFitZB6eUea7T4taIt8kygaRMh8gvM0nNJx1HQB3eF0";
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    

    // Auth State
    let currentUser = null;
    let currentBusinessId = null;

    // === REFERENCIAS DOM ===
    const viewList = document.getElementById('view-list');
    const viewDetail = document.getElementById('view-detail');
    const profilesGrid = document.getElementById('profiles-grid');
    const bcText = document.getElementById('breadcrumb-text');
    
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    const logsTbody = document.getElementById('logs-table-body');
    const peopleTbody = document.getElementById('people-table-body');
    const functionsGrid = document.getElementById('functions-grid');
    
    // === AUTH SYSTEM (Supabase) ===
    const updAuthUI = () => {
        if(currentUser) {
            document.getElementById('auth-unlogged').style.display = 'none';
            document.getElementById('auth-logged').style.display = 'flex';
            document.getElementById('auth-user-email').textContent = currentUser.email;
            document.getElementById('auth-avatar').src = `https://ui-avatars.com/api/?name=${currentUser.email}&background=00F0FF&color=0A0A0C`;
            loadBusinessCards();
        } else {
            document.getElementById('auth-unlogged').style.display = 'block';
            document.getElementById('auth-logged').style.display = 'none';
            profilesGrid.innerHTML = `<div style="padding:2rem; color:var(--text-muted); text-align:center;">Inicia sesión para ver tus negocios remotos.</div>`;
        }
    };

    // Auto-login al refrescar
    supabase.auth.getSession().then(({ data: { session } }) => {
        if(session) { currentUser = session.user; updAuthUI(); }
        else { updAuthUI(); }
    });

    // Cambios de estado en auth
    supabase.auth.onAuthStateChange((_event, session) => {
        if(session) { currentUser = session.user; } 
        else { currentUser = null; }
        updAuthUI();
    });

    document.getElementById('btn-open-login').onclick = () => document.getElementById('auth-modal').classList.add('active');
    
    document.getElementById('btn-auth-login').onclick = async () => {
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-pass').value;
        const btn = document.getElementById('btn-auth-login');
        if(!email || !password) return;
        
        btn.textContent = "Cargando...";
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        btn.textContent = "Entrar";
        
        if(error) {
            document.getElementById('auth-error').textContent = error.message;
        } else {
            document.getElementById('auth-modal').classList.remove('active');
        }
    };

    document.getElementById('btn-auth-register').onclick = async () => {
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-pass').value;
        const btn = document.getElementById('btn-auth-register');
        if(!email || !password) return;
        
        btn.textContent = "Guardando...";
        const { data, error } = await supabase.auth.signUp({ email, password });
        btn.textContent = "Registrarse";
        
        if(error) {
            document.getElementById('auth-error').textContent = error.message;
        } else {
            document.getElementById('auth-error').textContent = "Revisa tu correo para confirmar (o entra directamente si no es necesario verificar).";
        }
    };
    
    document.getElementById('btn-logout').onclick = async () => {
        await supabase.auth.signOut();
        viewDetail.style.display = 'none'; viewList.style.display = 'block';
    };


    // === RENDERIZADO NEGOCIOS ===
    async function loadBusinessCards() {
        if(!currentUser) return;
        profilesGrid.innerHTML = '<div style="color:var(--primary);"><i class="bx bx-loader bx-spin"></i> Cargando servidor...</div>';
        
        const { data: bList, error } = await supabase.from('businesses').select('*').eq('user_id', currentUser.id);
        if(error) { profilesGrid.innerHTML = "Error interno DB (Faltan tablas)."; return; }

        if(bList.length === 0) {
            profilesGrid.innerHTML = `
                <div class="workflow-card add-new-card" onclick="document.getElementById('profile-modal').classList.add('active')">
                    <i class='bx bx-plus'></i><span>Crear tu primer Espacio de Negocio</span>
                </div>
            `;
            return;
        }

        profilesGrid.innerHTML = '';
        bList.forEach(b => {
            const card = document.createElement('div');
            card.className = 'workflow-card';
            card.innerHTML = `
                <div class="card-top">
                    <div class="card-icon"><i class='bx bx-briefcase'></i></div>
                    <div class="card-badge active">ONLINE</div>
                </div>
                <div class="card-info">
                    <h3>${b.name}</h3><span class="card-id">${b.email}</span>
                </div>
                <p class="card-desc" style="-webkit-box-orient:vertical; display:-webkit-box; -webkit-line-clamp:2; overflow:hidden;">${b.description}</p>
                <div style="margin-top: 1rem; font-size: 0.75rem; color: var(--primary); font-family: var(--font-mono);">
                    ID Nodo BBDD de Negocio Vinculado
                </div>
            `;
            card.addEventListener('click', () => openBusinessDetail(b));
            profilesGrid.appendChild(card);
        });
    }

    // === GESTIÓN DE VISTAS Y TABS ===
    let currentBusinessObj = null;

    function openBusinessDetail(b) {
        currentBusinessId = b.id;
        currentBusinessObj = b;
        
        document.getElementById('detail-business-name').textContent = b.name;
        document.getElementById('detail-business-email').textContent = b.email;
        bcText.textContent = `Mail Agent / ${b.name}`;

        viewList.style.display = 'none';
        viewDetail.style.display = 'block';

        tabBtns[0].click(); // Goto Funciones por defecto
    }

    document.getElementById('btn-back-to-list').addEventListener('click', () => {
        viewDetail.style.display = 'none'; viewList.style.display = 'block';
        bcText.textContent = `Mail Agent (Perfiles)`;
        loadBusinessCards();
    });

    document.getElementById('nav-btn-home').addEventListener('click', () => {
        viewDetail.style.display = 'none'; viewList.style.display = 'block';
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
            
            if(btn.dataset.tab === 'tab-funciones') loadFunctions();
            if(btn.dataset.tab === 'tab-personas') loadPeople();
            if(btn.dataset.tab === 'tab-registro') loadLogs();
        });
    });

    // === TABS DB LOADS ===
    async function loadFunctions() {
        functionsGrid.innerHTML = '<i class="bx bx-loader bx-spin"></i> Sincronizando datos...';
        const { data: funcs } = await supabase.from('functions').select('*').eq('business_id', currentBusinessId);
        
        functionsGrid.innerHTML = '';
        if(!funcs || funcs.length === 0) {
            functionsGrid.innerHTML = `
                <div class="workflow-card add-new-card" id="card-add-func">
                    <i class='bx bx-plus'></i><span>Añadir Operación</span>
                </div>
            `;
            document.getElementById('card-add-func').addEventListener('click', openGroqModal);
            return;
        }

        funcs.forEach(f => {
            const isEnviar = f.type === 'enviar';
            const card = document.createElement('div');
            card.className = 'workflow-card';
            card.innerHTML = `
                <div class="card-top">
                    <div class="card-icon" style="color: ${isEnviar ? 'var(--primary)' : 'var(--secondary)'}; background-color: ${isEnviar ? 'var(--primary-dim)' : 'var(--secondary-dim)'};"><i class='bx ${isEnviar ? 'bx-send' : 'bx-message-square-detail'}'></i></div>
                    <div class="card-badge stable">${isEnviar ? 'ENVIAR' : 'RESPONDER'}</div>
                </div>
                <div class="card-info"><h3>${f.name}</h3></div>
                <div class="card-desc" style="white-space: pre-wrap; font-family: var(--font-mono); font-size:0.75rem;">${f.prompt.substring(0,250)}...</div>
                ${isEnviar && f.recipients && f.recipients.length ? '<div style="margin-top:0.5rem; font-size:0.75rem; color:var(--primary);">🎯 Destinatarios guardados: ' + f.recipients.length + '</div>' : ''}
            `;
            functionsGrid.appendChild(card);
        });
        
        // Add Button
        const addCard = document.createElement('div');
        addCard.className = 'workflow-card add-new-card';
        addCard.style.minHeight = '150px';
        addCard.innerHTML = `<i class='bx bx-plus'></i> Nueva Función`;
        addCard.addEventListener('click', openGroqModal);
        functionsGrid.appendChild(addCard);
    }

    async function loadPeople() {
        peopleTbody.innerHTML = '<tr><td colspan="4"><i class="bx bx-loader bx-spin"></i> Cargando...</td></tr>';
        const { data: list } = await supabase.from('people').select('*').eq('business_id', currentBusinessId);
        peopleTbody.innerHTML = '';
        if(!list) return;

        list.forEach(p => {
            peopleTbody.innerHTML += `<tr>
                <td><input type="checkbox" class="row-checkbox" value="${p.id}" data-collection="people"></td>
                <td style="font-weight: 500;">${p.email}</td>
                <td><span class="card-badge stable">${p.status}</span></td>
                <td style="color: var(--text-muted);">${p.date}</td>
            </tr>`;
        });
    }

    async function loadLogs() {
        logsTbody.innerHTML = '<tr><td colspan="5"><i class="bx bx-loader bx-spin"></i> Cargando...</td></tr>';
        const { data: list } = await supabase.from('logs').select('*').eq('business_id', currentBusinessId).order('timestamp', { ascending: false });
        logsTbody.innerHTML = '';
        if(!list) return;

        list.forEach(l => {
            logsTbody.innerHTML += `<tr>
                <td><input type="checkbox" class="row-checkbox" value="${l.id}" data-collection="logs"></td>
                <td>${l.timestamp}</td>
                <td style="color: var(--text-main);">${l.action}</td>
                <td>${l.target}</td>
                <td><span class="log-${l.status === 'OK' ? 'success' : 'error'}">${l.status}</span></td>
            </tr>`;
        });
    }

    // === SELECCIÓN MULTIPLE Y ELIMINAR BASADA EN UUID BBDD ===
    function handleSelectAll(bodyId) {
        const cbs = document.querySelectorAll(`#${bodyId} .row-checkbox`);
        const all = Array.from(cbs).some(cb => !cb.checked);
        cbs.forEach(cb => cb.checked = all);
    }
    document.getElementById('btn-select-all-people').onclick = () => handleSelectAll('people-table-body');
    document.getElementById('btn-select-all-logs').onclick = () => handleSelectAll('logs-table-body');

    async function handleDelete(btn, col, renderFn) {
        if(!currentBusinessId) return;
        const cbs = Array.from(document.querySelectorAll(`input[data-collection="${col}"]:checked`));
        if(!cbs.length) return;
        
        if(!btn.classList.contains('confirm')){
            btn.classList.add('confirm');
            btn.innerHTML = `<i class='bx bx-check-double'></i> Confirmar Borrado DB`;
            setTimeout(() => { btn.classList.remove('confirm'); btn.innerHTML = `<i class='bx bx-trash'></i> Eliminar`; }, 3000);
            return;
        }

        const ids = cbs.map(cb => cb.value);
        await supabase.from(col).delete().in('id', ids);

        btn.classList.remove('confirm'); btn.innerHTML = `<i class='bx bx-trash'></i> Eliminar`;
        
        if(col === 'people') generateLog('DB Accion', `Borrado masivo (${cbs.length}) de Personas`, 'OK');
        renderFn();
    }
    document.getElementById('btn-delete-people').onclick = e => handleDelete(e.currentTarget, 'people', loadPeople);
    document.getElementById('btn-delete-logs').onclick = e => handleDelete(e.currentTarget, 'logs', loadLogs);


    // === CREAR/AÑADIR A BASE DE DATOS ===

    document.getElementById('btn-create-profile').onclick = () => { 
        if(!currentUser) return document.getElementById('btn-open-login').click(); 
        document.getElementById('profile-modal').classList.add('active'); 
    };
    document.getElementById('btn-add-person').onclick = () => document.getElementById('people-modal').classList.add('active');
    
    document.querySelectorAll('.close-modal').forEach(b => {
        b.onclick = e => document.getElementById(e.currentTarget.dataset.target).classList.remove('active');
    });

    // Guardar Negocio Remoto
    document.getElementById('btn-save-profile').onclick = async () => {
        const n = document.getElementById('business-name').value, d = document.getElementById('business-description').value, e = document.getElementById('business-email').value;
        const btn = document.getElementById('btn-save-profile');
        if(!n || !e) return;

        btn.textContent = "Sincronizando nube...";
        const { data, error } = await supabase.from('businesses').insert({ user_id: currentUser.id, name: n, description: d, email: e });
        btn.textContent = "Crear Entorno";
        
        if(error) alert("Asegúrate de haber creado las tablas SQL en Supabase (Schema file). " + error.message);
        else { document.getElementById('profile-modal').classList.remove('active'); loadBusinessCards(); }
    };

    // Importar emails Remote
    document.getElementById('btn-save-people').onclick = async () => {
        const text = document.getElementById('people-text').value;
        const emails = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi) || [];
        const btn = document.getElementById('btn-save-people');
        if(!emails.length) return;

        btn.textContent = "Escribiendo en DB...";
        const dateNow = new Date().toLocaleDateString();
        
        const payload = emails.map(email => ({
            business_id: currentBusinessId,
            email: email,
            status: 'WAIT',
            date: dateNow
        }));

        await supabase.from('people').insert(payload);
        
        btn.textContent = "Importar a Base de Datos";
        document.getElementById('people-modal').classList.remove('active'); 
        generateLog('System Import', `+${emails.length} contacts agregados a Database`, 'OK'); 
        loadPeople();
    };

    async function generateLog(action, target, status) {
        if(!currentBusinessId) return;
        await supabase.from('logs').insert({
            business_id: currentBusinessId,
            timestamp: new Date().toISOString(),
            action,
            target,
            status
        });
    }

    // === IA GROQ ASISTENTE INTEGRATION ===
    const groqChat = document.getElementById('groq-chat-messages');
    const groqInput = document.getElementById('groq-chat-input');
    let groqHistory = [];
    let finalGroqResult = "";

    async function openGroqModal() {
        document.getElementById('function-modal').classList.add('active');
        document.getElementById('func-name').value = '';
        groqChat.innerHTML = '';
        groqHistory = [];
        
        // System Prompt para Groq
        groqHistory.push({
            role: 'system',
            content: `Eres Mail Agent AI. Ayuda a configurar un correo para "${currentBusinessObj.name}". Contexto del negocio: "${currentBusinessObj.description}".
            Haz SIEMPRE preguntas de un en uno (tono conciso, como un humano programador).
            Averigua qué mensaje quieren enviar a los destinatarios.
            Cuando hayas diseñado un borrador final perfecto, ponlo OBLIGATORIAMENTE entre las etiquetas [RESULTADO] y [/RESULTADO].`
        });

        _addGroqChat(`¡Hola! Modelo Groq activado. \nHe cargado el entorno de <strong>${currentBusinessObj.name}</strong> en mi memoria.\n\nDime qué tipo de correo automático vamos a confeccionar hoy...`, 'bot');
        
        updateRecipientsUI();
    }

    document.getElementById('func-type').addEventListener('change', updateRecipientsUI);

    async function updateRecipientsUI() {
        const isEnviar = document.getElementById('func-type').value === 'enviar';
        const area = document.getElementById('func-recipients-area');
        const list = document.getElementById('func-recipients-list');
        list.innerHTML = '<i class="bx bx-loader bx-spin"></i> Cargando de DB...';
        
        if (isEnviar) {
            area.style.display = 'block';
            const { data: people } = await supabase.from('people').select('*').eq('business_id', currentBusinessId);
            list.innerHTML = '';
            
            if(!people || people.length === 0) {
                list.innerHTML = "<span style='color:var(--danger)'>No hay contactos añadidos en DB. Manda 0 correos.</span>";
            } else {
                people.forEach(p => {
                    list.innerHTML += `<label style="display:block; margin-bottom:0.3rem;"><input type="checkbox" class="cb-recip" value="${p.email}"> ${p.email}</label>`;
                });
            }
        } else {
            area.style.display = 'none';
        }
    }

    function _addGroqChat(text, type) {
        const div = document.createElement('div');
        div.className = `chat-msg msg-${type}`;
        div.innerHTML = text.replace(/\n/g, '<br>');
        groqChat.appendChild(div);
        groqChat.scrollTop = groqChat.scrollHeight;
    }

    document.getElementById('btn-send-groq').addEventListener('click', async () => {
        const text = groqInput.value.trim();
        if(!text) return;

        _addGroqChat(text, 'user');
        groqInput.value = '';
        groqInput.disabled = true;
        
        let typ = document.createElement('div'); typ.innerHTML = "Pensando..."; typ.style.color = "var(--primary)";
        groqChat.appendChild(typ);
        
        groqHistory.push({ role: 'user', content: text });

        try {
            document.getElementById('groq-latency').textContent = "procesando...";
            const start = Date.now();
            
            // Llamada al backend proxy
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: groqHistory, model: 'llama3-8b-8192', temperature: 0.7 })
            });
            const data = await response.json();
            
            document.getElementById('groq-latency').textContent = (Date.now() - start) + 'ms';
            groqChat.removeChild(typ);

            let aiText = data.choices[0].message.content;
            groqHistory.push({ role: 'assistant', content: aiText });
            
            if(aiText.includes('[RESULTADO]')) {
                finalGroqResult = aiText.split('[RESULTADO]')[1].split('[/RESULTADO]')[0].trim();
                aiText = aiText.replace(/\[RESULTADO\][\s\S]*?\[\/RESULTADO\]/g, `<div style="padding:1rem; border:1px solid var(--primary); background:var(--bg-base); margin-top:1rem; border-radius:6px; font-family:var(--font-mono);">${finalGroqResult.replace(/\n/g, '<br>')}</div><br><strong>¡Texto Listo! Si estás de acuerdo, dímelo presionando GUARDAR FUNCIÓN ABAJO.</strong>`);
            }
            _addGroqChat(aiText, 'bot');
        } catch(e) {
            groqChat.removeChild(typ);
            _addGroqChat("Error de Red. Verifica el backend local.", 'bot');
        }
        
        groqInput.disabled = false;
        groqInput.focus();
    });

    // Guardado de Función (Backend DB)
    document.getElementById('btn-save-function-final').addEventListener('click', async () => {
        const name = document.getElementById('func-name').value || 'Bloque Llama3.1';
        const type = document.getElementById('func-type').value;
        const botText = groqHistory.length > 1 ? finalGroqResult || groqHistory[groqHistory.length-1].content : "Vacío";
        const btn = document.getElementById('btn-save-function-final');

        let recips = [];
        if(type === 'enviar') {
            recips = Array.from(document.querySelectorAll('.cb-recip:checked')).map(c => c.value);
            if(recips.length === 0) alert('Aviso: Guardas sin destinatarios seleccionados.');
        }

        btn.innerHTML = "<i class='bx bx-loader bx-spin'></i> Subiendo...";
        await supabase.from('functions').insert({
            business_id: currentBusinessId,
            name: name,
            type: type,
            prompt: botText,
            recipients: recips
        });
        btn.innerHTML = "Guardar Función <i class='bx bx-check'></i>";

        generateLog('DB Deployment', `Compilada Función IA: ${name}`, 'OK');
        document.getElementById('function-modal').classList.remove('active');
        loadFunctions();
    });

});
