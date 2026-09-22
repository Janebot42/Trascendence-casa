const byId = (id) => document.getElementById(id);

const statusBox = byId('status');
const statusText = byId('statusText');
const meBox = byId('meBox');
const logBox = byId('log');
const emptyLog = byId('emptyLog');
const requestCount = byId('requestCount');
const lastDuration = byId('lastDuration');
const secondFactorForm = byId('secondFactorForm');
const challengeTokenInput = byId('challengeToken');
const provisioningUriInput = byId('provisioningUri');
const manualSecretInput = byId('manualSecret');
const recoveryCodesBox = byId('recoveryCodes');
const workspaceStateBox = byId('workspaceState');
const organizationSelect = byId('organizationSelect');
const boardSelect = byId('boardSelect');
const listSelect = byId('listSelect');
const targetListSelect = byId('targetListSelect');
const cardSelect = byId('cardSelect');
const cardPreview = byId('cardPreview');

let actionCount = 0;

const workspace = {
  organizations: [],
  boards: [],
  lists: [],
  selectedOrganizationId: null,
  selectedBoardId: null,
  cards: [],
  selectedListId: null,
  selectedCardId: null
};

const testUsername = `tester${Math.floor(100000 + Math.random() * 900000)}`;
document.querySelector('#registerForm input[name="username"]').value = testUsername;
document.querySelector('#registerForm input[name="email"]').value = `${testUsername}@example.com`;
document.querySelector('#loginForm input[name="username"]').value = testUsername;

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function safeData(data) {
  if (data === undefined) return '';
  const clone = structuredClone(data);
  if (clone && typeof clone === 'object') {
    for (const key of ['password', 'newPassword', 'challengeToken']) {
      if (key in clone) clone[key] = '••••••••';
    }
  }
  return JSON.stringify(clone, null, 2);
}

function addLog({ title, method, path, status, duration, data, kind = 'success' }) {
  actionCount += 1;
  requestCount.textContent = String(actionCount);
  lastDuration.textContent = duration === undefined ? 'acción local' : `${duration} ms`;
  emptyLog.classList.add('hidden');

  const entry = document.createElement('article');
  entry.className = `log-entry ${kind}`;

  const meta = document.createElement('div');
  meta.className = 'log-meta';
  const badge = document.createElement('span');
  badge.className = 'log-badge';
  badge.textContent = status ?? (kind === 'client' ? 'UI' : 'OK');
  const time = document.createElement('time');
  time.textContent = new Date().toLocaleTimeString('es-ES');
  meta.append(badge, time);

  const heading = document.createElement('p');
  heading.className = 'log-title';
  heading.textContent = title;
  entry.append(meta, heading);

  if (method || path) {
    const route = document.createElement('div');
    route.className = 'log-route';
    route.textContent = [method, path].filter(Boolean).join(' ');
    entry.append(route);
  }

  if (data !== undefined) {
    const payload = document.createElement('pre');
    payload.className = 'log-data';
    payload.textContent = safeData(data);
    entry.append(payload);
  }

  logBox.prepend(entry);
}

function logClient(title, data) {
  addLog({ title, data, kind: 'client' });
}

async function api(title, path, options = {}) {
  const startedAt = performance.now();
  const { acceptedStatuses = [], ...fetchOptions } = options;
  const method = fetchOptions.method ?? 'GET';
  const hasBody = fetchOptions.body !== undefined;

  try {
    const response = await fetch(path, {
      credentials: 'same-origin',
      ...fetchOptions,
      headers: hasBody
        ? { 'Content-Type': 'application/json', ...(fetchOptions.headers ?? {}) }
        : fetchOptions.headers,
      body: hasBody ? JSON.stringify(fetchOptions.body) : undefined
    });
    const raw = await response.text();
    let data = {};
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = { raw };
      }
    }

    const duration = Math.round(performance.now() - startedAt);
    const isAcceptedResponse = response.ok || acceptedStatuses.includes(response.status);
    addLog({
      title,
      method,
      path,
      status: response.ok
        ? String(response.status)
        : isAcceptedResponse
          ? `${response.status} · esperado`
          : String(response.status),
      duration,
      data: { request: fetchOptions.body, response: data },
      kind: response.ok ? 'success' : isAcceptedResponse ? 'expected' : 'error'
    });

    if (!isAcceptedResponse) {
      const error = new Error(data.message ?? 'La petición ha fallado');
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  } catch (error) {
    if (!error.status) {
      addLog({
        title: `${title}: error de red`,
        method,
        path,
        duration: Math.round(performance.now() - startedAt),
        status: 'ERR',
        data: { message: error.message },
        kind: 'error'
      });
    }
    throw error;
  }
}

function setStatus(text, mode) {
  statusText.textContent = text;
  statusBox.className = `session-pill ${mode}`;
}

async function refreshMe() {
  try {
    const data = await api('Consultar sesión actual', '/me', { acceptedStatuses: [401] });
    if (data.error === 'UNAUTHORIZED') {
      meBox.textContent = 'No hay ninguna sesión activa.';
      setStatus('Sin sesión', 'warn');
      return null;
    }
    meBox.textContent = JSON.stringify(data, null, 2);
    setStatus(data.user.username, 'ok');
    return data;
  } catch (error) {
    meBox.textContent = JSON.stringify(error.data ?? { message: error.message }, null, 2);
    setStatus('Sin sesión', 'warn');
    return null;
  }
}

function selectedOrganization() {
  return workspace.organizations.find((item) => item.id === workspace.selectedOrganizationId) ?? null;
}

function selectedBoard() {
  return workspace.boards.find((item) => item.id === workspace.selectedBoardId) ?? null;
}

function selectedList() {
  return workspace.lists.find((item) => item.id === workspace.selectedListId) ?? null;
}

function selectedCard() {
  return workspace.cards.find((item) => item.id === workspace.selectedCardId) ?? null;
}

function renderWorkspace() {
  organizationSelect.replaceChildren();
  if (workspace.organizations.length === 0) {
    organizationSelect.add(new Option('Sin organizaciones', ''));
  } else {
    for (const organization of workspace.organizations) {
      organizationSelect.add(new Option(`${organization.name} · ${organization.role}`, organization.id));
    }
    organizationSelect.value = workspace.selectedOrganizationId ?? '';
  }

  boardSelect.replaceChildren();
  if (workspace.boards.length === 0) {
    boardSelect.add(new Option('Sin tableros', ''));
  } else {
    for (const board of workspace.boards) {
      boardSelect.add(new Option(board.name, board.id));
    }
    boardSelect.value = workspace.selectedBoardId ?? '';
  }

  listSelect.replaceChildren(); targetListSelect.replaceChildren();
  for (const list of workspace.lists) { listSelect.add(new Option(list.name,list.id)); targetListSelect.add(new Option(list.name,list.id)); }
  listSelect.value=workspace.selectedListId??''; targetListSelect.value=selectedCard()?.listId??workspace.selectedListId??'';
  cardSelect.replaceChildren();
  for (const card of workspace.cards) cardSelect.add(new Option(card.title,card.id));
  cardSelect.value=workspace.selectedCardId??'';
  cardPreview.textContent=selectedCard()?JSON.stringify(selectedCard(),null,2):'Selecciona una tarjeta.';  workspaceStateBox.textContent = JSON.stringify({
    organization: selectedOrganization(),
    board: selectedBoard(),
    lists: workspace.lists,
    cards: workspace.cards
  }, null, 2);
}

async function loadOrganizations() {
  const data = await api('Cargar organizaciones', '/organizations');
  workspace.organizations = data.organizations;
  if (!workspace.organizations.some((item) => item.id === workspace.selectedOrganizationId)) {
    workspace.selectedOrganizationId = workspace.organizations[0]?.id ?? null;
  }
  if (!workspace.selectedOrganizationId) {
    workspace.boards = [];
    workspace.lists = [];
    workspace.selectedBoardId = null;
  }
  renderWorkspace();
  return selectedOrganization();
}

async function loadBoards() {
  const organization = selectedOrganization() ?? await loadOrganizations();
  if (!organization) {
    logClient('No hay ninguna organización para cargar tableros');
    return null;
  }

  const data = await api(
    'Cargar tableros',
    `/organizations/${organization.id}/boards`
  );
  workspace.boards = data.boards;
  if (!workspace.boards.some((item) => item.id === workspace.selectedBoardId)) {
    workspace.selectedBoardId = workspace.boards[0]?.id ?? null;
  }
  if (!workspace.selectedBoardId) workspace.lists = [];
  renderWorkspace();
  return selectedBoard();
}

async function loadLists() {
  const board = selectedBoard() ?? await loadBoards();
  if (!board) {
    logClient('No hay ningún tablero para cargar listas');
    return null;
  }

  const data = await api('Cargar listas', `/boards/${board.id}/lists`);
  workspace.lists = data.lists;
  if (!workspace.lists.some((item) => item.id === workspace.selectedListId)) workspace.selectedListId = workspace.lists[0]?.id ?? null;
  renderWorkspace();
  return data.lists;
}

async function loadCards() {
  const list=selectedList();
  if(!list){workspace.cards=[];workspace.selectedCardId=null;renderWorkspace();return [];}
  const data=await api('Cargar tarjetas','/lists/'+list.id+'/cards?limit=50&offset=0');
  workspace.cards=data.cards;
  if(!workspace.cards.some((item)=>item.id===workspace.selectedCardId)) workspace.selectedCardId=workspace.cards[0]?.id??null;
  renderWorkspace(); return data.cards;
}
document.querySelectorAll('.nav-button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.nav-button').forEach((item) => item.classList.remove('active'));
    document.querySelectorAll('.view').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    byId(button.dataset.section).classList.add('active');
    logClient(`Abrir sección: ${button.textContent.trim().replace(/\s+/g, ' ')}`);
  });
});

byId('registerForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const data = await api('Registrar usuario', '/auth/register', {
      method: 'POST',
      body: formValues(event.currentTarget)
    });
    if (data.status === 'authenticated') await refreshMe();
  } catch {}
});

byId('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const data = await api('Iniciar sesión', '/auth/login', {
      method: 'POST',
      body: formValues(event.currentTarget)
    });
    if (data.status === 'requires_2fa') {
      challengeTokenInput.value = data.challengeToken;
      secondFactorForm.classList.remove('hidden');
      setStatus('Falta 2FA', 'checking');
    } else {
      secondFactorForm.classList.add('hidden');
      await refreshMe();
    }
  } catch {}
});

secondFactorForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await api('Completar inicio con 2FA', '/auth/login/2fa', {
      method: 'POST',
      body: formValues(event.currentTarget)
    });
    secondFactorForm.classList.add('hidden');
    await refreshMe();
  } catch {}
});

byId('refreshMe').addEventListener('click', refreshMe);

byId('logout').addEventListener('click', async () => {
  try {
    await api('Cerrar sesión', '/auth/logout', { method: 'POST' });
    workspace.organizations = [];
    workspace.boards = [];
    workspace.lists = [];
    workspace.selectedOrganizationId = null;
    workspace.selectedBoardId = null;
    renderWorkspace();
    secondFactorForm.classList.add('hidden');
    challengeTokenInput.value = '';
    meBox.textContent = 'No hay ninguna sesión activa.';
    setStatus('Sin sesión', 'warn');
    logClient('Sesión local limpiada');
  } catch {}
});

byId('reauthForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = formValues(event.currentTarget);
  if (!body.secondFactorMethod) delete body.secondFactorMethod;
  if (!body.secondFactorCode) delete body.secondFactorCode;
  try {
    await api('Reautenticar sesión', '/auth/reauthenticate', { method: 'POST', body });
  } catch {}
});

byId('passwordForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await api('Cambiar contraseña', '/auth/password/change', {
      method: 'POST',
      body: formValues(event.currentTarget)
    });
  } catch {}
});

byId('start2fa').addEventListener('click', async () => {
  try {
    const data = await api('Iniciar configuración 2FA', '/2fa/setup', { method: 'POST' });
    provisioningUriInput.value = data.provisioningUri;
    manualSecretInput.value = new URL(data.provisioningUri).searchParams.get('secret') ?? '';
  } catch {}
});

byId('confirm2faForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const data = await api('Confirmar configuración 2FA', '/2fa/confirm', {
      method: 'POST',
      body: formValues(event.currentTarget)
    });
    recoveryCodesBox.textContent = data.recoveryCodes.join('\n');
  } catch {}
});

byId('disable2fa').addEventListener('click', async () => {
  try {
    await api('Desactivar 2FA', '/2fa', { method: 'DELETE' });
    provisioningUriInput.value = '';
    manualSecretInput.value = '';
    recoveryCodesBox.textContent = '2FA desactivado.';
  } catch {}
});

byId('organizationForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const data = await api('Crear organización', '/organizations', {
      method: 'POST',
      body: formValues(event.currentTarget)
    });
    workspace.organizations = [data.organization, ...workspace.organizations];
    workspace.selectedOrganizationId = data.organization.id;
    workspace.boards = [];
    workspace.lists = [];
    workspace.selectedBoardId = null;
    renderWorkspace();
  } catch {}
});

byId('boardForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const organization = selectedOrganization();
  if (!organization) {
    logClient('Crea o selecciona una organización antes de crear un tablero');
    return;
  }
  try {
    const data = await api(
      'Crear tablero',
      `/organizations/${organization.id}/boards`,
      { method: 'POST', body: formValues(event.currentTarget) }
    );
    workspace.boards = [data.board, ...workspace.boards];
    workspace.selectedBoardId = data.board.id;
    workspace.lists = [];
    renderWorkspace();
  } catch {}
});

byId('listForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const board = selectedBoard();
  if (!board) {
    logClient('Crea o selecciona un tablero antes de crear una lista');
    return;
  }
  try {
    const data = await api('Crear lista', `/boards/${board.id}/lists`, {
      method: 'POST',
      body: formValues(event.currentTarget)
    });
    workspace.lists.push(data.list);
    workspace.lists.sort((left, right) => left.position - right.position);
    workspace.selectedListId = data.list.id;
    renderWorkspace();
  } catch {}
});

organizationSelect.addEventListener('change', async () => {
  workspace.selectedOrganizationId = organizationSelect.value || null;
  workspace.selectedBoardId = null;
  workspace.boards = [];
  workspace.lists = [];
  renderWorkspace();
  logClient('Organización seleccionada', selectedOrganization());
  if (workspace.selectedOrganizationId) {
    try {
      await loadBoards();
      if (workspace.selectedBoardId) await loadLists();
    } catch {}
  }
});

boardSelect.addEventListener('change', async () => {
  workspace.selectedBoardId = boardSelect.value || null;
  workspace.lists = [];
  renderWorkspace();
  logClient('Tablero seleccionado', selectedBoard());
  if (workspace.selectedBoardId) {
    try {
      await loadLists();
    } catch {}
  }
});

byId('reloadWorkspace').addEventListener('click', async () => {
  try {
    await loadOrganizations();
    if (workspace.selectedOrganizationId) await loadBoards();
    if (workspace.selectedBoardId) await loadLists();
  } catch {}
});

byId('createDefaultLists').addEventListener('click', async () => {
  const board = selectedBoard();
  if (!board) {
    logClient('Crea o selecciona un tablero antes de generar las listas');
    return;
  }
  try {
    for (const name of ['To Do', 'Doing', 'Done']) {
      const data = await api(`Crear lista ${name}`, `/boards/${board.id}/lists`, {
        method: 'POST',
        body: { name }
      });
      workspace.lists.push(data.list);
    }
    workspace.lists.sort((left, right) => left.position - right.position);
    renderWorkspace();
  } catch {}
});

byId('cardForm').addEventListener('submit',async(e)=>{e.preventDefault();const l=selectedList();if(!l)return logClient('Crea o selecciona una lista antes de crear una tarjeta');const b=formValues(e.currentTarget);if(!b.description)b.description=null;if(!b.dueDate)b.dueDate=null;try{const d=await api('Crear tarjeta','/lists/'+l.id+'/cards',{method:'POST',body:b});workspace.cards=[d.card,...workspace.cards];workspace.selectedCardId=d.card.id;renderWorkspace();}catch{}});
byId('cardEditForm').addEventListener('submit',async(e)=>{e.preventDefault();const c=selectedCard();if(!c)return logClient('Selecciona una tarjeta antes de editarla');try{const d=await api('Editar tarjeta','/cards/'+c.id,{method:'PATCH',body:{title:formValues(e.currentTarget).title}});workspace.cards=workspace.cards.map(x=>x.id===c.id?d.card:x);renderWorkspace();}catch{}});
byId('moveCard').addEventListener('click',async()=>{const c=selectedCard(),t=targetListSelect.value;if(!c||!t)return logClient('Selecciona una tarjeta y una lista de destino');try{const d=await api('Mover tarjeta','/cards/'+c.id+'/move',{method:'POST',body:{targetListId:t}});workspace.selectedListId=t;await loadCards();workspace.selectedCardId=d.card.id;renderWorkspace();}catch{}});
byId('archiveCard').addEventListener('click',async()=>{const c=selectedCard();if(!c)return logClient('Selecciona una tarjeta antes de archivarla');try{await api('Archivar tarjeta','/cards/'+c.id,{method:'DELETE'});workspace.cards=workspace.cards.filter(x=>x.id!==c.id);workspace.selectedCardId=workspace.cards[0]?.id??null;renderWorkspace();}catch{}});
listSelect.addEventListener('change',async()=>{workspace.selectedListId=listSelect.value||null;workspace.selectedCardId=null;try{await loadCards();}catch{}});
cardSelect.addEventListener('change',()=>{workspace.selectedCardId=cardSelect.value||null;renderWorkspace();});
byId('reloadCards').addEventListener('click',async()=>{try{await loadCards();}catch{}});byId('clearLog').addEventListener('click', () => {
  logBox.replaceChildren();
  actionCount = 0;
  requestCount.textContent = '0';
  lastDuration.textContent = '—';
  emptyLog.classList.remove('hidden');
});

renderWorkspace();
refreshMe();
