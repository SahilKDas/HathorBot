const state = { data: null, catalog: { species: [], items: [] }, view: 'users', query: '', editing: null };
const $ = (selector) => document.querySelector(selector);

const titles = {
  users: ['Trainers', 'Browse and safely edit trainer progression.', 'Trainer records'],
  creatures: ['Hathors', 'Inspect stats, forms, equipment, and ownership.', 'Creature records'],
  spawns: ['World & Spawns', 'Monitor server conditions and current encounters.', 'Guild and spawn state'],
  stories: ['Storylines', 'Inspect Croaking Crown routes, endings, and mastery.', 'Campaign records'],
  economy: ['Economy', 'Review marketplace and trade state.', 'Marketplace and trades'],
  audit: ['Audit Log', 'Trace battles, trades, equipment, and developer edits.', 'Immutable activity records'],
};

function records(store) { return Object.values(state.data?.[store]?.records ?? {}); }
function text(value) { return String(value ?? '—'); }
function short(id) { return id ? `${id.slice(0, 8)}…` : '—'; }
function date(value) { return value ? new Date(value).toLocaleString() : '—'; }
function cell(value, className = '') { const td = document.createElement('td'); td.textContent = text(value); if (className) td.className = className; return td; }
function pill(value, color = '') { const span = document.createElement('span'); span.className = `pill ${color}`; span.textContent = text(value); return span; }

function table(headers, rows) {
  if (!rows.length) { const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = 'No matching records.'; return empty; }
  const table = document.createElement('table'); table.className = 'data-table';
  const head = document.createElement('thead'); const tr = document.createElement('tr');
  for (const header of headers) { const th = document.createElement('th'); th.textContent = header; tr.append(th); }
  head.append(tr); table.append(head); const body = document.createElement('tbody'); rows.forEach((row) => body.append(row)); table.append(body); return table;
}

function button(label, onClick) { const element = document.createElement('button'); element.className = 'edit'; element.textContent = label; element.addEventListener('click', onClick); return element; }
function matches(...values) { return values.some((value) => text(value).toLowerCase().includes(state.query)); }

function userRows() {
  return records('users').filter((user) => matches(user.id, user.level, user.shrimpCoins)).map((user) => {
    const tr = document.createElement('tr');
    tr.append(cell(short(user.id), 'id'), cell(`Lv.${user.level}`), cell(user.xp), cell(`🦐 ${user.shrimpCoins}`), cell(user.inventory?.length ?? 0), cell(`${user.team?.length ?? 0}/6`), cell(user.ascensionSigils ?? 0));
    const action = cell('', 'actions'); action.append(button('Edit', () => editUser(user))); tr.append(action); return tr;
  });
}

function creatureRows() {
  return records('creatures').filter((creature) => matches(creature.id, creature.species, creature.type, creature.rarity, creature.ownerId)).map((creature) => {
    const tr = document.createElement('tr'); tr.append(cell(short(creature.id), 'id'), cell(creature.species), cell(creature.type));
    const rarity = cell(''); rarity.append(pill(creature.rarity, creature.rarity === 'Mythic' ? 'pink' : '')); tr.append(rarity);
    tr.append(cell(`Lv.${creature.level}`), cell(`${creature.ivPercentage}%`), cell([creature.shiny && 'Shiny', creature.gigantamax && 'G-Max', creature.ascended && 'Ascended'].filter(Boolean).join(' · ') || 'Standard'), cell(short(creature.ownerId), 'id'));
    const action = cell('', 'actions'); action.append(button('Edit', () => editCreature(creature))); tr.append(action); return tr;
  });
}

function spawnRows() {
  const guilds = records('guilds').map((guild) => ({ kind: 'Guild', id: guild.id, state: `${guild.world?.biomeId ?? 'unrolled'} / ${guild.world?.environmentId ?? guild.world?.weatherId ?? 'unrolled'}`, detail: `${guild.activity?.count ?? 0}/${guild.activity?.target ?? '?'}`, updated: guild.updatedAt }));
  const spawns = records('spawns').map((spawn) => ({ kind: 'Spawn', id: spawn.id, state: spawn.status, detail: `${spawn.creature?.species ?? '?'} in ${short(spawn.channelId)}`, updated: spawn.spawnedAt }));
  return [...guilds, ...spawns].filter((row) => matches(...Object.values(row))).map((row) => { const tr=document.createElement('tr'); tr.append(cell(row.kind),cell(short(row.id),'id'),cell(row.state),cell(row.detail),cell(date(row.updated))); return tr; });
}

function economyRows() {
  const market = records('market').map((item) => ({ kind:'Listing', id:item.id, status:item.status, parties:`${short(item.sellerId)} → ${short(item.buyerId)}`, value:`🦐 ${item.price}`, time:item.createdAt }));
  const trades = records('trades').map((item) => ({ kind:'Trade', id:item.id, status:item.status, parties:`${short(item.proposerId)} ↔ ${short(item.targetId)}`, value:`🦐 ${item.offeredCoins}`, time:item.createdAt }));
  const battles = records('battles').map((item) => ({ kind:'Battle', id:item.id, status:item.status, parties:`${short(item.challengerId)} ⚔ ${short(item.opponentId)}`, value:item.winnerId ? `Winner ${short(item.winnerId)}` : `Turn ${item.turnNumber ?? 0}`, time:item.createdAt }));
  return [...market,...trades,...battles].filter((row)=>matches(...Object.values(row))).map((row)=>{const tr=document.createElement('tr');tr.append(cell(row.kind),cell(short(row.id),'id'),cell(row.status),cell(row.parties),cell(row.value),cell(date(row.time)));return tr;});
}

function auditRows() { return records('audit').sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).filter((entry)=>matches(entry.id,entry.action,entry.actorId,JSON.stringify(entry.details))).map((entry)=>{const tr=document.createElement('tr');tr.append(cell(date(entry.createdAt)),cell(entry.action),cell(short(entry.actorId),'id'),cell(JSON.stringify(entry.details)));return tr;}); }

function storyRows() { return records('stories').filter((story)=>matches(story.id,story.status,story.endingId,story.completion)).map((story)=>{const tr=document.createElement('tr');tr.append(cell(short(story.id),'id'),cell(story.status),cell(`${story.completion??0}%`),cell(`${Math.min((story.chapter??0)+1,10)}/10`),cell(story.endingId??'Undecided'),cell(`${story.discoveredEndings?.length??0}/99`),cell(`${story.echoesCompleted??0}/5`),cell(date(story.updatedAt)));return tr;}); }

function renderMetrics() {
  const values = [['Trainers',records('users').length],['Hathors',records('creatures').length],['Campaigns',records('stories').length],['Active spawns',records('spawns').filter(x=>x.status==='active').length],['Open listings',records('market').filter(x=>x.status==='active').length],['Audit events',records('audit').length]];
  $('#metrics').replaceChildren(...values.map(([label,value])=>{const card=document.createElement('article');card.className='metric';const small=document.createElement('small');small.textContent=label;const strong=document.createElement('strong');strong.textContent=value;card.append(small,strong);return card;}));
}

function render() {
  const [title, subtitle, panel] = titles[state.view]; $('#view-title').textContent=title; $('#view-subtitle').textContent=subtitle; $('#panel-title').textContent=panel;
  let headers, rows;
  if(state.view==='users'){headers=['ID','Level','XP','Wallet','Box','Team','Sigils',''];rows=userRows();}
  else if(state.view==='creatures'){headers=['ID','Species','Type','Rarity','Level','IV','Forms','Owner',''];rows=creatureRows();}
  else if(state.view==='spawns'){headers=['Kind','ID','State','Details','Updated'];rows=spawnRows();}
  else if(state.view==='stories'){headers=['Trainer','Status','Completion','Chapter','Ending','Doors','Echoes','Updated'];rows=storyRows();}
  else if(state.view==='economy'){headers=['Kind','ID','Status','Parties','Value','Created'];rows=economyRows();}
  else {headers=['Time','Action','Actor','Details'];rows=auditRows();}
  $('#content').replaceChildren(table(headers,rows)); $('#record-count').textContent=`${rows.length} record${rows.length===1?'':'s'}`; $('#last-updated').textContent=`Updated ${new Date().toLocaleTimeString()}`; renderMetrics();
}

function field(name,label,value,{type='number',min=0,max=1_000_000_000,checkbox=false}={}){const wrap=document.createElement('div');wrap.className=`field${checkbox?' checkbox':''}`;const input=document.createElement('input');input.name=name;input.type=checkbox?'checkbox':type;if(checkbox)input.checked=Boolean(value);else{input.value=value;input.min=min;input.max=max;}const labelNode=document.createElement('label');labelNode.textContent=label;if(checkbox){wrap.append(input,labelNode);}else{wrap.append(labelNode,input);}return wrap;}
function selectField(name,label,options,value){const wrap=document.createElement('div');wrap.className='field';const labelNode=document.createElement('label');labelNode.textContent=label;const select=document.createElement('select');select.name=name;for(const option of options){const node=document.createElement('option');node.value=option.value;node.textContent=option.label;node.selected=option.value===value;select.append(node);}wrap.append(labelNode,select);return wrap;}

function openEditor(title, fields, editing){state.editing=editing;$('#editor-title').textContent=title;$('#editor-fields').replaceChildren(...fields);$('#editor-error').textContent='';$('#editor').showModal();}
function editUser(user){const itemFields=state.catalog.items.map(item=>field(`item_${item.id}`,item.name,user.items?.[item.id]??0,{min:0,max:1_000_000}));const statFields=['catches','hatches','duelWins','duelLosses'].map(name=>field(`stat_${name}`,name.replace(/[A-Z]/g,letter=>` ${letter}`).replace(/^./,letter=>letter.toUpperCase()),user.statistics?.[name]??0));openEditor(`Edit trainer ${short(user.id)}`,[field('shrimpCoins','Shrimp Coins',user.shrimpCoins),field('xp','Trainer XP',user.xp),field('ascensionSigils','Quest Sigils',user.ascensionSigils??0),field('gigantamaxCatalysts','Gigantamax Catalysts',user.gigantamaxCatalysts??0),field('daycareSlots','Daycare Pair Slots',user.daycareSlots??1,{min:1,max:2}),...itemFields,...statFields],{type:'users',id:user.id});}
function editCreature(c){const cap=c.species==='Solstilt'?20:10;openEditor(`Edit ${c.species}`,[field('level','Level',c.level,{min:1,max:1024}),field('xp','Creature XP',c.xp??0),...['hp','attack','defense','speed'].map(stat=>field(`iv_${stat}`,`${stat.toUpperCase()} IV`,c.ivs[stat],{min:0,max:cap})),field('shiny','Shiny',c.shiny,{checkbox:true}),field('gigantamax','Gigantamax',c.gigantamax,{checkbox:true}),field('ascended','Ascended',c.ascended,{checkbox:true})],{type:'creatures',id:c.id});}

function openGrant(){const users=records('users').map(user=>({value:user.id,label:`${user.id} · Lv.${user.level} · ${user.inventory?.length??0} Hathors`}));if(!users.length){toast('Create a trainer record first');return;}const species=state.catalog.species.map(entry=>({value:entry.name,label:`${entry.name} · ${entry.type} · ${entry.rarity}`}));openEditor('Spawn cheated Hathor',[selectField('userId','Trainer',users,users[0].value),selectField('species','Species',species,species[0]?.value),field('level','Level',50,{min:1,max:1024}),...['hp','attack','defense','speed'].map(stat=>field(`iv_${stat}`,`${stat.toUpperCase()} IV`,10,{min:0,max:10})),field('shiny','Shiny',false,{checkbox:true}),field('gigantamax','Gigantamax',false,{checkbox:true}),field('ascended','Ascended',false,{checkbox:true})],{type:'grant'});const speciesSelect=$('#editor-fields select[name="species"]');speciesSelect?.addEventListener('change',()=>{const cap=speciesSelect.value==='Solstilt'?20:10;for(const input of document.querySelectorAll('#editor-fields input[name^="iv_"]')){input.max=cap;input.value=cap;}});}

async function load(){try{const [dataResponse,catalogResponse]=await Promise.all([fetch('/api/dev/data',{cache:'no-store'}),fetch('/api/dev/catalog',{cache:'no-store'})]);if(!dataResponse.ok||!catalogResponse.ok)throw new Error(`HTTP ${dataResponse.ok?catalogResponse.status:dataResponse.status}`);state.data=await dataResponse.json();state.catalog=await catalogResponse.json();render();}catch(error){$('#content').innerHTML=`<div class="empty">Could not load local data: ${error.message}</div>`;}}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2200);}

$('#tabs').addEventListener('click',(event)=>{const tab=event.target.closest('.tab');if(!tab)return;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===tab));state.view=tab.dataset.view;state.query='';$('#search').value='';render();});
$('#search').addEventListener('input',(event)=>{state.query=event.target.value.trim().toLowerCase();render();});$('#refresh').addEventListener('click',load);
$('#grant').addEventListener('click',openGrant);
$('#save').addEventListener('click',async(event)=>{event.preventDefault();const form=new FormData($('#editor form'));const editing=state.editing;let payload,url,method='PATCH';const ivs={hp:Number(form.get('iv_hp')),attack:Number(form.get('iv_attack')),defense:Number(form.get('iv_defense')),speed:Number(form.get('iv_speed'))};if(editing.type==='users'){const items=Object.fromEntries(state.catalog.items.map(item=>[item.id,Number(form.get(`item_${item.id}`))]));const statistics=Object.fromEntries(['catches','hatches','duelWins','duelLosses'].map(name=>[name,Number(form.get(`stat_${name}`))]));payload={shrimpCoins:Number(form.get('shrimpCoins')),xp:Number(form.get('xp')),ascensionSigils:Number(form.get('ascensionSigils')),gigantamaxCatalysts:Number(form.get('gigantamaxCatalysts')),daycareSlots:Number(form.get('daycareSlots')),items,statistics};url=`/api/dev/users/${encodeURIComponent(editing.id)}`;}else if(editing.type==='grant'){payload={userId:form.get('userId'),species:form.get('species'),level:Number(form.get('level')),ivs,shiny:form.get('shiny')==='on',gigantamax:form.get('gigantamax')==='on',ascended:form.get('ascended')==='on'};url='/api/dev/creatures/grant';method='POST';}else{payload={level:Number(form.get('level')),xp:Number(form.get('xp')),ivs,shiny:form.get('shiny')==='on',gigantamax:form.get('gigantamax')==='on',ascended:form.get('ascended')==='on'};url=`/api/dev/creatures/${encodeURIComponent(editing.id)}`;}try{const response=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const result=await response.json();if(!response.ok)throw new Error(result.error??`HTTP ${response.status}`);$('#editor').close();toast(editing.type==='grant'?'Hathor spawned into trainer box':'Record saved and audited');await load();}catch(error){$('#editor-error').textContent=error.message;}});

load();
