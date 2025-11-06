    // ---------- STATE ----------
    const defaultState = {
      startDate: '2025-10-01',
      endDate:   '2027-09-30',
      selectedMonth: null, // se sincroniza con startDate en init y en cambios
      maxGroupsPerShift: 4,
      groups: ['1','2','3','4','A2','B2','C2','D2'],
      shiftAssignments: {
        day:       [{ groupId: '1', cycle1: '6x1', cycle2: null, cycle1Repeat: 1, cycle2Repeat: 1, startOffset: 0 }],
        afternoon: [{ groupId: '2', cycle1: '6x1', cycle2: null, cycle1Repeat: 1, cycle2Repeat: 1, startOffset: 0 }],
        night:     [{ groupId: '3', cycle1: '5x2', cycle2: null, cycle1Repeat: 1, cycle2Repeat: 1, startOffset: 0 }],
      },
      rules: { minFreeSundaysPerMonth: 2, maxConsecutiveWorkDays: 6 },
      manualCalendar: {} // { 'YYYY-MM-DD': { shifts: ['day', 'afternoon', 'night'], groups: { day: ['G1'], afternoon: [], night: [] } } }
    };

    let state = JSON.parse(JSON.stringify(defaultState));

    // Undo/Redo stacks
    const undoStack = []; const redoStack = [];

    const groupColors = { '1': 'bg-purple-500 text-white','2': 'bg-pink-500 text-white','3': 'bg-blue-500 text-white','4': 'bg-green-500 text-white','A2': 'bg-amber-500 text-white','B2': 'bg-cyan-500 text-white','C2': 'bg-rose-500 text-white','D2': 'bg-teal-500 text-white' };
    const groupBorders = { '1': 'border-purple-500','2': 'border-pink-500','3': 'border-blue-500','4': 'border-green-500','A2': 'border-amber-500','B2': 'border-cyan-500','C2': 'border-rose-500','D2': 'border-teal-500' };

    const clone = (o)=> JSON.parse(JSON.stringify(o));
    const pushHistory = ()=>{ undoStack.push(clone(state)); redoStack.length = 0; };

    // ---------- UTILS ----------
    const cycleTuple = (t)=> ({'4x3':[4,3],'5x2':[5,2],'6x1':[6,1]})[t];
    const daysInMonth = (yyyyMM)=>{ const [y,m] = yyyyMM.split('-').map(Number); const count=new Date(y,m,0).getDate(); const arr=[]; for(let d=1; d<=count; d++){ const iso=`${yyyyMM}-${String(d).padStart(2,'0')}`; const dt=new Date(iso); arr.push({date:iso, js:dt, isSunday: dt.getDay()===0}); } return arr; };

    function buildEngine(){
      const start=new Date(state.startDate), end=new Date(state.endDate);
      const calendar={ day:[], afternoon:[], night:[] }; const byGroup={}; const engine={};
      ['day','afternoon','night'].forEach(shift=>{
        state.shiftAssignments[shift].forEach(a=>{
          if(!engine[a.groupId]){
            const c1=cycleTuple(a.cycle1); const c2=a.cycle2?cycleTuple(a.cycle2):null; const span=c1[0]+c1[1]; const startCycle=(a.startOffset||0)%span;
            engine[a.groupId]={ shift, cycle1:a.cycle1, cycle2:a.cycle2, c1Work:c1[0], c1Span:c1[0]+c1[1], c2Work:c2?c2[0]:null, c2Span:c2?c2[0]+c2[1]:null, cycleDay:startCycle, cycleType:1, reps:0 };
            byGroup[a.groupId]=[];
          }
        });
      });
      for(let t=new Date(start); t<=end; t.setDate(t.getDate()+1)){
        const dateStr = t.toISOString().slice(0,10); const isSunday = t.getDay()===0;
        const row = { day:{date:dateStr,isSunday,groups:[]}, afternoon:{date:dateStr,isSunday,groups:[]}, night:{date:dateStr,isSunday,groups:[]} };
        Object.keys(engine).forEach(g=>{
          const e=engine[g]; const workDays=e.cycleType===1?e.c1Work:e.c2Work; const span=e.cycleType===1?e.c1Span:e.c2Span; const isWork=e.cycleDay<workDays;
          row[e.shift].groups.push({groupId:g,isWorking:isWork,currentCycleType:e.cycleType});
          byGroup[g].push({date:dateStr,isSunday,isWorking:isWork,shift:isWork?e.shift:'rest',currentCycleType:e.cycleType});
          e.cycleDay++; if(e.cycleDay>=span){ e.cycleDay=0; e.reps++; if(e.cycle2){ e.cycleType = e.cycleType===1?2:1; e.reps=0; } e.shift = e.shift==='day'? 'afternoon' : e.shift==='afternoon'? 'night' : 'day'; }
        });
        calendar.day.push(row.day); calendar.afternoon.push(row.afternoon); calendar.night.push(row.night);
      }
      return {calendar, byGroup};
    }

    const monthsAvailable = (calendar)=>{ const set=new Set(); calendar.day.forEach(d=>set.add(d.date.slice(0,7))); return Array.from(set).sort(); };
    function monthByGroup(byGroup, yyyyMM){ const days=daysInMonth(yyyyMM); const out={}; Object.keys(byGroup).forEach(g=>{ const map=new Map(byGroup[g].map(d=>[d.date,d])); out[g]=days.map(x=> map.get(x.date) || {date:x.date,isSunday:x.isSunday,shift:'rest',isWorking:false,currentCycleType:1}); }); return out; }
    function monthByShift(calendar, yyyyMM){ const start=`${yyyyMM}-01`; const endDt=daysInMonth(yyyyMM).slice(-1)[0].date; const sliced={day:[],afternoon:[],night:[]}; ['day','afternoon','night'].forEach(k=>{ sliced[k]=calendar[k].filter(d=> d.date>=start && d.date<=endDt); }); return sliced; }

    // Función para detectar la pestaña activa
    const currentTab=()=> document.querySelector('.tab-btn.bg-white\\/60')?.dataset.tab || 'by-group';

    // ---------- RENDER ----------
    function renderAll(){
      const {calendar, byGroup} = buildEngine();
      if(!state.selectedMonth){ state.selectedMonth = state.startDate.slice(0,7); }
      const select = document.getElementById('visibleMonth');
      const opts = monthsAvailable(calendar);
      if(!opts.includes(state.selectedMonth)) state.selectedMonth = opts[0] || state.startDate.slice(0,7);
      select.innerHTML = opts.map(m=>`<option value="${m}" ${m===state.selectedMonth?'selected':''}>${new Date(m+'-01').toLocaleDateString('es-CL',{month:'long',year:'numeric'})}</option>`).join('');

      const pal = document.getElementById('groupsPalette');
      pal.innerHTML = state.groups.map(g=>{
        return `<div class="space-y-2">
          <div class="${groupColors[g]} rounded-xl p-2 text-center font-bold">G${g}</div>
          ${['4x3','5x2','6x1'].map(c=>`<div draggable="true" data-group="${g}" data-cycle="${c}" class="draggable-item border-2 ${groupBorders[g]} bg-white rounded-xl p-2 text-center font-semibold text-xs" title="Arrastra al turno deseado">⋮⋮ ${c}</div>`).join('')}
        </div>`;
      }).join('');

      const packs=[{id:'zone-day', key:'day', title:'☀️ DÍA', color:'text-amber-900'},{id:'zone-afternoon', key:'afternoon', title:'🌤️ TARDE', color:'text-orange-900'},{id:'zone-night', key:'night', title:'🌙 NOCHE', color:'text-indigo-900'}];
      packs.forEach(p=>{
        const host=document.getElementById(p.id); const tpl=document.getElementById('tpl-zone').content.cloneNode(true);
        tpl.querySelector('h3').className=`text-2xl font-extrabold mb-2 text-center ${p.color}`; tpl.querySelector('h3').textContent=p.title;
        tpl.querySelector('.js-cap').textContent=state.maxGroupsPerShift; const cards=tpl.querySelector('.js-cards'); const list=state.shiftAssignments[p.key];
        tpl.querySelector('.js-count').textContent=list.length; tpl.querySelector('.js-empty').classList.toggle('hidden', list.length>0);
        cards.innerHTML=list.map((a,idx)=>{
          return `<div class="border-2 ${groupBorders[a.groupId]} bg-white rounded-xl p-3">
            <div class="flex items-center justify-between mb-2">
              <span class="${groupColors[a.groupId]} chip">G${a.groupId}</span>
              <div class="flex gap-2">
                <button data-action="dup" data-shift="${p.key}" data-idx="${idx}" class="text-slate-500 hover:text-slate-700" title="Duplicar">⎘</button>
                <button data-action="del" data-shift="${p.key}" data-idx="${idx}" class="text-rose-600 hover:text-rose-800" title="Eliminar">🗑️</button>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <label class="text-xs font-semibold">Ciclo 1
                <select data-action="c1" data-shift="${p.key}" data-idx="${idx}" class="w-full px-2 py-1 border rounded text-sm">
                  ${['4x3','5x2','6x1'].map(c=>`<option value="${c}" ${a.cycle1===c?'selected':''}>${c}</option>`).join('')}
                </select>
              </label>
              <label class="text-xs font-semibold">Ciclo 2
                <select data-action="c2" data-shift="${p.key}" data-idx="${idx}" class="w-full px-2 py-1 border rounded text-sm">
                  <option value="">Sin ciclo 2</option>
                  ${['4x3','5x2','6x1'].map(c=>`<option value="${c}" ${a.cycle2===c?'selected':''}>${c}</option>`).join('')}
                </select>
              </label>
              <label class="text-xs font-semibold">Desfase
                <input type="number" min="0" max="30" value="${a.startOffset||0}" data-action="ofs" data-shift="${p.key}" data-idx="${idx}" class="w-full px-2 py-1 border rounded text-sm" />
              </label>
              <label class="text-xs font-semibold">Repeticiones C1
                <select data-action="r1" data-shift="${p.key}" data-idx="${idx}" class="w-full px-2 py-1 border rounded text-sm">
                  ${[1,2,3].map(n=>`<option value="${n}" ${a.cycle1Repeat===n?'selected':''}>${n}x</option>`).join('')}
                </select>
              </label>
            </div>
          </div>`;
        }).join('');
        host.innerHTML=''; host.appendChild(tpl);
      });

      // Guardar la pestaña activa actual antes de renderizar
      const activeTab = currentTab();
      renderTab(activeTab, {calendar, byGroup});
      wireDnD(); wireZoneButtons();
    }

    // === NUEVO: render de 3 meses consecutivos para vistas por grupo y por turno ===
    function renderTab(tab, data){
      const wrap=document.getElementById('tabContent');
      const {calendar, byGroup} = data || buildEngine();
      const baseMonth = new Date(state.selectedMonth + '-01');

      // Genera los próximos 3 meses
      const months = [];
      for (let i = 0; i < 3; i++) {
        const m = new Date(baseMonth);
        m.setMonth(baseMonth.getMonth() + i);
        months.push(m.toISOString().slice(0, 7));
      }

      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('bg-white/60'));
      const activeBtn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
      if (activeBtn) activeBtn.classList.add('bg-white/60');

      if (tab === 'by-group') {
        // UNA SOLA TABLA con 3 meses lineales
        wrap.innerHTML = htmlByGroup(byGroup, months);
      }

      if (tab === 'by-shift') {
        // UNA SOLA TABLA con 3 meses lineales
        wrap.innerHTML = htmlByShift(calendar, months);
      }

      if (tab === 'stats') {
        const s = sundayStats(calendar, 6);
        const totals = totalsFromSunday(s);
        wrap.innerHTML = renderStats(s, totals);
      }

      if (tab === 'rules') {
        const s = sundayStats(calendar, 6);
        wrap.innerHTML = renderRules(s);
      }

      if (tab === 'manual') {
        wrap.innerHTML = renderManualCalendar();
        wireManualDnD();
      }
    }

    function htmlByGroup(byGroup, months){
      // Si months es string (un solo mes), convertir a array de 3 meses
      if (typeof months === 'string') {
        const baseMonth = new Date(months + '-01');
        months = [];
        for (let i = 0; i < 3; i++) {
          const m = new Date(baseMonth);
          m.setMonth(baseMonth.getMonth() + i);
          months.push(m.toISOString().slice(0, 7));
        }
      }
      
      const groups = Object.keys(byGroup); 
      if(groups.length === 0) return emptyMsg('Asigna grupos a los turnos para ver el calendario.');
      
      // Combinar todos los días de los 3 meses
      const allDays = [];
      months.forEach(month => {
        const days = daysInMonth(month);
        allDays.push(...days);
      });

      // Construir datos por grupo para todos los días
      const mg = {};
      groups.forEach(g => {
        const map = new Map(byGroup[g].map(d => [d.date, d]));
        mg[g] = allDays.map(x => map.get(x.date) || {date: x.date, isSunday: x.isSunday, shift: 'rest', isWorking: false, currentCycleType: 1});
      });

      return `
      <div class="scroll-hint">
        <span>➡️ Desliza horizontalmente para ver los ${allDays.length} días de ${months.length} meses</span>
      </div>
      <div class="calendar-container">
      <table class="border-collapse text-xs" style="width: auto; min-width: max-content;">
        <thead>
          <tr class="bg-slate-100">
            <th class="sticky-left border p-2 font-bold bg-slate-100">Grupo</th>
            ${allDays.map(d => {
              const isFirst = d.js.getDate() === 1;
              const mon = d.js.toLocaleDateString('es-CL', {month: 'short'}).toUpperCase();
              return `<th class="border p-1 ${d.isSunday ? 'bg-blue-100' : ''} ${isFirst ? 'border-l-4 border-l-rose-500' : ''}">
                ${isFirst ? `<div class="text-rose-600 font-bold text-[10px]">${mon}</div>` : ''}
                <div class="font-bold">${d.js.getDate()}</div>
                <div class="text-[10px]">${d.js.toLocaleDateString('es-CL', {weekday: 'short'})}</div>
              </th>`;
            }).join('')}
          </tr>
        </thead>
        <tbody>
          ${groups.map(g => `
            <tr>
              <td class="sticky-left border p-2 bg-white">
                <div class="${groupColors[g]} rounded py-1 px-2 text-center text-sm font-bold">G${g}</div>
              </td>
              ${mg[g].map(x => {
                const cls = x.shift === 'day' ? 'shift-day' : x.shift === 'afternoon' ? 'shift-afternoon' : x.shift === 'night' ? 'shift-night' : 'shift-rest';
                const label = x.shift === 'day' ? 'Día' : x.shift === 'afternoon' ? 'Tarde' : x.shift === 'night' ? 'Noche' : 'Descanso';
                return `<td class="border p-1 text-center ${cls} relative" title="${label}">
                  <div class="font-semibold text-[11px] py-1">${label}${x.currentCycleType === 2 ? '<span class="badge">C2</span>' : ''}</div>
                </td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      </div>`;
    }

    function htmlByShift(calendar, months){
      // Si se pasa un objeto con day/afternoon/night (m), convertir a formato esperado
      if (typeof months === 'string' || (months && months.day)) {
        const monthStr = typeof months === 'string' ? months : state.selectedMonth;
        const baseMonth = new Date(monthStr + '-01');
        const monthsArray = [];
        for (let i = 0; i < 3; i++) {
          const m = new Date(baseMonth);
          m.setMonth(baseMonth.getMonth() + i);
          monthsArray.push(m.toISOString().slice(0, 7));
        }
        months = monthsArray;
      }
      
      // Combinar todos los días de los 3 meses para cada turno
      const allDaysData = {day: [], afternoon: [], night: []};
      
      months.forEach(month => {
        const monthData = monthByShift(calendar, month);
        ['day', 'afternoon', 'night'].forEach(shift => {
          allDaysData[shift].push(...monthData[shift]);
        });
      });

      if(!allDaysData.day || allDaysData.day.length === 0) return emptyMsg('No hay datos para el período seleccionado.');

      const days = allDaysData.day;

      return `
      <div class="scroll-hint">
        <span>➡️ Desliza horizontalmente para ver los ${days.length} días de ${months.length} meses</span>
      </div>
      <div class="calendar-container">
      <table class="border-collapse text-xs" style="width: auto; min-width: max-content;">
        <thead>
          <tr class="bg-slate-100">
            <th class="sticky-left border p-2 font-bold bg-slate-100">Turno</th>
            ${days.map(d => {
              const dt = new Date(d.date);
              const isFirst = dt.getDate() === 1;
              const mon = dt.toLocaleDateString('es-CL', {month: 'short'}).toUpperCase();
              return `<th class="border p-1 ${d.isSunday ? 'bg-blue-100' : ''} ${isFirst ? 'border-l-4 border-l-rose-500' : ''}">
                ${isFirst ? `<div class="text-rose-600 font-bold text-[10px]">${mon}</div>` : ''}
                <div class="font-bold">${dt.getDate()}</div>
                <div class="text-[10px]">${dt.toLocaleDateString('es-CL', {weekday: 'short'})}</div>
              </th>`;
            }).join('')}
          </tr>
        </thead>
        <tbody>
          ${['day', 'afternoon', 'night'].map((shift, idx) => {
            const label = ['☀️ DÍA', '🌤️ TARDE', '🌙 NOCHE'][idx];
            const bg = ['bg-amber-50', 'bg-orange-50', 'bg-indigo-50'][idx];
            const bgSticky = ['bg-amber-100', 'bg-orange-100', 'bg-indigo-100'][idx];
            return `
              <tr class="${bg}">
                <td class="sticky-left border p-2 font-bold ${bgSticky}">${label}</td>
                ${allDaysData[shift].map(d => `
                  <td class="border p-1 text-center">
                    ${d.groups.filter(g => g.isWorking).map(g => `
                      <div class="${groupColors[g.groupId]} cell-mini font-bold py-1 px-1 rounded mb-1 relative">
                        G${g.groupId}${g.currentCycleType === 2 ? '<span class="badge">C2</span>' : ''}
                      </div>
                    `).join('') || '<span class="text-slate-400">-</span>'}
                  </td>
                `).join('')}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      </div>`;
    }

    function sundayStats(calendar, months=6){ const stats={}; const base=new Date(state.startDate); for(let i=0;i<months;i++){ const m=new Date(base); m.setMonth(base.getMonth()+i); const key=m.toISOString().slice(0,7); stats[key]={}; state.groups.forEach(g=> stats[key][g]={working:0,free:0,total:0}); ['day','afternoon','night'].forEach(shift=>{ calendar[shift].filter(d=> d.date.startsWith(key) && d.isSunday).forEach(d=>{ d.groups.forEach(g=>{ if(!stats[key][g.groupId]) return; stats[key][g.groupId].total++; if(g.isWorking) stats[key][g.groupId].working++; else stats[key][g.groupId].free++; }); }); }); } return stats; }
    function totalsFromSunday(stats){ const totals={}; state.groups.forEach(g=> totals[g]={working:0,free:0,total:0}); Object.values(stats).forEach(m=>{ state.groups.forEach(g=>{ totals[g].working+=(m[g]?.working||0); totals[g].free+=(m[g]?.free||0); totals[g].total+=(m[g]?.total||0); }); }); return totals; }

    function renderStats(sundayStatsObj, totalStats){ const months=Object.keys(sundayStatsObj); return `
      <div class="grid gap-6">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-xs">
            <thead><tr class="bg-slate-100"><th class="border p-2 font-bold">Mes</th>${state.groups.map(g=>`<th class="border p-2 font-bold"><div class="${groupColors[g]} rounded py-1 px-2 inline-block text-xs">G${g}</div></th>`).join('')}</tr></thead>
            <tbody>${months.map((m,idx)=>`<tr class="${idx%2===0?'bg-white':'bg-slate-50'}"><td class="border p-2 font-semibold">${new Date(m+'-01').toLocaleDateString('es-CL',{month:'short',year:'numeric'})}</td>${state.groups.map(g=>{ const st=sundayStatsObj[m][g]; if(!st||st.total===0) return `<td class=\"border p-2 text-center\">-</td>`; const ok=st.free>=state.rules.minFreeSundaysPerMonth; return `<td class=\"border p-2 text-center ${ok?'bg-emerald-50':'bg-rose-50'}\"><div class=\"font-bold ${ok?'text-emerald-700':'text-rose-700'}\">${st.free}</div><div class=\"text-[10px] text-slate-600\">/${st.total}</div></td>`; }).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`; }

    function renderRules(s){ const issues=[]; Object.entries(s).forEach(([month,groups])=>{ Object.entries(groups).forEach(([g,st])=>{ if(st&&st.total>0&&st.free<state.rules.minFreeSundaysPerMonth){ issues.push({type:'Domingos',month,group:g,msg:`G${g} con ${st.free}/${st.total} domingos libres (< ${state.rules.minFreeSundaysPerMonth})`}); } }); }); const htmlIssues = issues.length? issues.map(i=>`<li class="p-2 rounded bg-rose-50 border border-rose-200">${new Date(i.month+'-01').toLocaleDateString('es-CL',{month:'long',year:'numeric'})}: <strong>${i.msg}</strong></li>`).join('') : '<li class="p-2 rounded bg-emerald-50 border border-emerald-200">Sin observaciones por ahora ✨</li>'; return `
      <div class="grid md:grid-cols-3 gap-6">
        <div class="md:col-span-2"><h3 class="text-lg font-bold mb-2">Alertas de reglas</h3><ul class="space-y-2">${htmlIssues}</ul></div>
        <div class="glass rounded-xl p-4"><h4 class="font-bold mb-2">Parámetros</h4>
          <label class="block text-sm mb-3">Mín. domingos libres/mes <input id="ruleSundays" type="number" min="0" max="4" value="${state.rules.minFreeSundaysPerMonth}" class="w-full mt-1 px-3 py-2 rounded-xl border"></label>
          <label class="block text-sm">Máx. días consecutivos de trabajo (alerta) <input id="ruleStreak" type="number" min="3" max="12" value="${state.rules.maxConsecutiveWorkDays}" class="w-full mt-1 px-3 py-2 rounded-xl border"></label>
          <div class="text-xs text-slate-500 mt-3">Estas validaciones son referencias operativas configurables. Verifica siempre tu normativa interna/sectorial.</div>
          <button id="btnApplyRules" class="mt-4 w-full bg-indigo-600 text-white rounded-xl py-2 font-bold hover:bg-indigo-700">Aplicar</button>
        </div>
      </div>`; }

    const emptyMsg = (t)=> `<div class="bg-amber-50 border-l-4 border-amber-400 p-4 text-center">⚠️ ${t}</div>`;

    // ---------- MANUAL CALENDAR ----------
    function renderManualCalendar() {
      const month = state.selectedMonth;
      const days = daysInMonth(month);
      const firstDay = new Date(month + '-01').getDay(); // 0 = domingo, 1 = lunes, etc.

      // Crear array de días vacíos para alinear el calendario
      const emptyDays = [];
      for (let i = 0; i < firstDay; i++) {
        emptyDays.push(null);
      }

      const shiftTypes = [
        { id: 'day', label: 'Día', emoji: '☀️', class: 'shift-day' },
        { id: 'afternoon', label: 'Tarde', emoji: '🌤️', class: 'shift-afternoon' },
        { id: 'night', label: 'Noche', emoji: '🌙', class: 'shift-night' },
        { id: 'rest', label: 'Descanso', emoji: '🌴', class: 'shift-rest' }
      ];

      return `
        <div class="space-y-6">
          <!-- Paleta de turnos -->
          <div class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200">
            <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
              <span>✏️</span>
              <span>Paleta de turnos</span>
              <span class="text-sm font-normal text-slate-600 ml-auto">Arrastra un turno a un día del calendario</span>
            </h3>
            <div class="flex flex-wrap gap-4">
              ${shiftTypes.map(shift => `
                <div
                  draggable="true"
                  data-manual-shift="${shift.id}"
                  class="manual-shift-chip ${shift.class}"
                  title="Arrastra para asignar ${shift.label}"
                >
                  ${shift.emoji} ${shift.label}
                </div>
              `).join('')}
            </div>
            <div class="mt-4 text-sm text-slate-600 bg-white/60 rounded-lg p-3 border border-indigo-200">
              <strong>💡 Instrucciones:</strong>
              <ul class="list-disc list-inside mt-2 space-y-1">
                <li>Arrastra una ficha de turno hacia una casilla del día deseado</li>
                <li>No puedes asignar el mismo turno dos veces en un día</li>
                <li>Haz clic en un turno asignado para eliminarlo (aparecerá ❌)</li>
                <li>Puedes asignar múltiples turnos diferentes al mismo día</li>
              </ul>
            </div>
          </div>

          <!-- Controles del mes -->
          <div class="flex items-center justify-between">
            <h3 class="text-xl font-bold">
              📅 ${new Date(month + '-01').toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
            </h3>
            <div class="flex gap-2">
              <button id="btnClearMonth" class="px-4 py-2 bg-rose-100 text-rose-700 rounded-xl hover:bg-rose-200 font-semibold">
                🗑️ Limpiar mes
              </button>
              <button id="btnExportManual" class="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 font-semibold">
                📥 Exportar calendario
              </button>
            </div>
          </div>

          <!-- Calendario -->
          <div>
            <!-- Encabezado de días de la semana -->
            <div class="calendar-week-header">
              <div class="calendar-week-day">Dom</div>
              <div class="calendar-week-day">Lun</div>
              <div class="calendar-week-day">Mar</div>
              <div class="calendar-week-day">Mié</div>
              <div class="calendar-week-day">Jue</div>
              <div class="calendar-week-day">Vie</div>
              <div class="calendar-week-day">Sáb</div>
            </div>

            <!-- Grid de días -->
            <div class="manual-calendar">
              ${emptyDays.map(() => `<div class="manual-day-cell disabled"></div>`).join('')}
              ${days.map(day => {
                const dateStr = day.date;
                const dayData = state.manualCalendar[dateStr] || { shifts: [] };
                const dayNumber = day.js.getDate();
                const isSunday = day.isSunday;

                return `
                  <div
                    class="manual-day-cell ${isSunday ? 'bg-blue-50' : ''}"
                    data-date="${dateStr}"
                    data-drop-manual="true"
                  >
                    <div class="manual-day-header">
                      <span class="manual-day-number ${isSunday ? 'text-blue-600' : ''}">${dayNumber}</span>
                      ${isSunday ? '<span class="text-blue-600 text-xs">DOM</span>' : ''}
                    </div>
                    <div class="manual-day-content" id="day-content-${dateStr}">
                      ${dayData.shifts.map(shiftId => {
                        const shiftInfo = shiftTypes.find(s => s.id === shiftId);
                        return `
                          <div
                            class="manual-shift-assigned ${shiftInfo.class}"
                            data-date="${dateStr}"
                            data-shift="${shiftId}"
                            title="Clic para eliminar"
                          >
                            ${shiftInfo.emoji} ${shiftInfo.label}
                            <span class="remove-shift">❌</span>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Estadísticas del mes -->
          <div class="grid md:grid-cols-4 gap-4 mt-6">
            ${shiftTypes.map(shift => {
              const count = Object.values(state.manualCalendar).filter(day =>
                day.shifts && day.shifts.includes(shift.id)
              ).length;
              return `
                <div class="bg-white rounded-xl p-4 border-2 border-slate-200">
                  <div class="text-3xl mb-2">${shift.emoji}</div>
                  <div class="font-bold text-2xl">${count}</div>
                  <div class="text-sm text-slate-600">días de ${shift.label}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // ---------- MODALS & HELPERS ----------
    function showModal(title, content, onClose) {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-2xl font-bold">${title}</h3>
            <button class="text-2xl hover:text-red-600" onclick="this.closest('.modal-overlay').remove(); ${onClose ? onClose : ''}">&times;</button>
          </div>
          <div>${content}</div>
        </div>
      `;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
          if(onClose) eval(onClose);
        }
      });
      document.body.appendChild(modal);
      return modal;
    }

    function updateBreadcrumb() {
      const breadcrumb = document.getElementById('breadcrumbRange');
      if (!breadcrumb) return;

      const base = new Date(state.selectedMonth + '-01');
      const months = [];
      for (let i = 0; i < 3; i++) {
        const m = new Date(base);
        m.setMonth(base.getMonth() + i);
        months.push(m.toLocaleDateString('es-CL', {month: 'short', year: 'numeric'}));
      }
      breadcrumb.textContent = `📅 ${months.join(' → ')}`;
    }

    function showHelpModal() {
      const content = `
        <div class="space-y-4">
          <div class="p-4 bg-indigo-50 rounded-xl">
            <h4 class="font-bold mb-2">⌨️ Atajos de teclado</h4>
            <ul class="space-y-2 text-sm">
              <li><span class="kbd">Ctrl/⌘ + Z</span> — Deshacer último cambio</li>
              <li><span class="kbd">Ctrl/⌘ + Shift + Z</span> — Rehacer cambio</li>
              <li><span class="kbd">←</span> / <span class="kbd">→</span> — Navegar entre meses (próximamente)</li>
            </ul>
          </div>
          <div class="p-4 bg-emerald-50 rounded-xl">
            <h4 class="font-bold mb-2">🎯 Funciones principales</h4>
            <ul class="space-y-2 text-sm">
              <li><strong>Drag & Drop:</strong> Arrastra fichas de ciclo a las zonas de turnos</li>
              <li><strong>Duplicar:</strong> Usa el botón ⎘ para clonar una configuración</li>
              <li><strong>Vista de 3 meses:</strong> Visualiza 3 meses continuos para mejor planificación</li>
              <li><strong>Exportar:</strong> Descarga Excel con 12 meses de planificación</li>
            </ul>
          </div>
          <div class="p-4 bg-amber-50 rounded-xl">
            <h4 class="font-bold mb-2">💡 Tips</h4>
            <ul class="space-y-2 text-sm">
              <li>Los cambios se guardan automáticamente en tu navegador</li>
              <li>Usa "Guardar" para crear un respaldo manual</li>
              <li>El validador de reglas te ayuda a cumplir normativas laborales</li>
            </ul>
          </div>
        </div>
      `;
      showModal('📖 Guía de uso', content);
    }

    function showTutorialModal() {
      const content = `
        <div class="space-y-4">
          <div class="p-4 bg-blue-50 rounded-xl border-l-4 border-blue-500">
            <h4 class="font-bold mb-2">Paso 1: Arrastra una ficha</h4>
            <p class="text-sm">Selecciona una ficha de ciclo (4x3, 5x2, o 6x1) de los grupos disponibles y arrástrala a la zona de turno deseada (Día, Tarde o Noche).</p>
          </div>
          <div class="p-4 bg-purple-50 rounded-xl border-l-4 border-purple-500">
            <h4 class="font-bold mb-2">Paso 2: Configura el ciclo</h4>
            <p class="text-sm">Una vez asignado, puedes ajustar el ciclo, agregar un ciclo alternado (Ciclo 2), configurar el desfase inicial y el número de repeticiones.</p>
          </div>
          <div class="p-4 bg-green-50 rounded-xl border-l-4 border-green-500">
            <h4 class="font-bold mb-2">Paso 3: Visualiza y exporta</h4>
            <p class="text-sm">Usa las pestañas para ver diferentes vistas del calendario. Exporta a Excel para compartir o imprimir tu planificación.</p>
          </div>
          <div class="text-center mt-4">
            <button onclick="this.closest('.modal-overlay').remove()" class="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700">¡Entendido!</button>
          </div>
        </div>
      `;
      showModal('🎓 Tutorial rápido', content);
    }

    // ---------- EVENTS ----------
    function wireBasics(){
      const sd=document.getElementById('startDate'); const ed=document.getElementById('endDate'); const vm=document.getElementById('visibleMonth'); const px=document.getElementById('btnExportXLSX'); const pr=document.getElementById('btnPrint'); const sv=document.getElementById('btnSave'); const ld=document.getElementById('btnLoad'); const rs=document.getElementById('btnReset');

      sd.value=state.startDate; ed.value=state.endDate;

      sd.addEventListener('change', e=>{ pushHistory(); state.startDate=e.target.value; state.selectedMonth = state.startDate.slice(0,7); renderAll(); saveAuto(); updateBreadcrumb(); });
      ed.addEventListener('change', e=>{ pushHistory(); state.endDate=e.target.value; renderAll(); saveAuto(); });
      vm.addEventListener('change', e=>{ state.selectedMonth=e.target.value; renderTab(currentTab()); updateBreadcrumb(); });

      // Botones de navegación de mes
      document.getElementById('btnPrevMonth')?.addEventListener('click', () => {
        const opts = monthsAvailable(buildEngine().calendar);
        const idx = opts.indexOf(state.selectedMonth);
        if (idx > 0) {
          state.selectedMonth = opts[idx - 1];
          renderTab(currentTab());
          updateBreadcrumb();
          document.getElementById('visibleMonth').value = state.selectedMonth;
        }
      });

      document.getElementById('btnNextMonth')?.addEventListener('click', () => {
        const opts = monthsAvailable(buildEngine().calendar);
        const idx = opts.indexOf(state.selectedMonth);
        if (idx < opts.length - 1) {
          state.selectedMonth = opts[idx + 1];
          renderTab(currentTab());
          updateBreadcrumb();
          document.getElementById('visibleMonth').value = state.selectedMonth;
        }
      });

      // Modales
      document.getElementById('btnHelp')?.addEventListener('click', showHelpModal);
      document.getElementById('btnTutorial')?.addEventListener('click', showTutorialModal);

      px.addEventListener('click', exportXLSX);

      // Print: solo zonas + calendarios grupo/turnos, ahora por 3 meses
      pr.addEventListener('click', ()=>{
        const {calendar, byGroup} = buildEngine();
        const month = state.selectedMonth;
        const printZones = document.getElementById('printZones');
        const printByGroup = document.getElementById('printByGroup');
        const printByShift = document.getElementById('printByShift');

        // Zonas: clonamos las tarjetas actuales
        const zonesWrapper = document.createElement('div'); zonesWrapper.className='grid md:grid-cols-3 gap-4';
        ['zone-day','zone-afternoon','zone-night'].forEach(id=>{ const sec=document.getElementById(id).cloneNode(true); sec.classList.remove('glass'); sec.classList.add('border','rounded-xl','p-4'); zonesWrapper.appendChild(sec); });
        printZones.innerHTML=''; printZones.appendChild(zonesWrapper);

        // Tablas por 3 meses
        const base = new Date(month + '-01');
        let htmlG = '', htmlS = '';
        for (let i = 0; i < 3; i++) {
          const m = new Date(base);
          m.setMonth(base.getMonth() + i);
          const key = m.toISOString().slice(0,7);
          htmlG += `<h3 class="mt-6 mb-2 font-bold">${new Date(key+'-01').toLocaleDateString('es-CL',{month:'long',year:'numeric'})}</h3>` + htmlByGroup(byGroup, key);
          htmlS += `<h3 class="mt-6 mb-2 font-bold">${new Date(key+'-01').toLocaleDateString('es-CL',{month:'long',year:'numeric'})}</h3>` + htmlByShift(monthByShift(calendar, key));
        }
        printByGroup.innerHTML = htmlG;
        printByShift.innerHTML = htmlS;

        window.print();
      });

      sv.addEventListener('click', ()=>{ localStorage.setItem('turnos_pro_state', JSON.stringify(state)); toast('💾 Guardado en este navegador', 'success'); });
      ld.addEventListener('click', ()=>{ const raw=localStorage.getItem('turnos_pro_state'); if(!raw) return toast('⚠️ No hay guardado previo', 'error'); pushHistory(); state=JSON.parse(raw); renderAll(); toast('📂 Configuración cargada', 'success'); });
      rs.addEventListener('click', ()=>{ if(confirm('¿Resetear al estado inicial?')){ pushHistory(); state=clone(defaultState); renderAll(); saveAuto(); toast('🧹 Sistema reseteado', 'info'); }});

      // Undo/Redo
      document.getElementById('btnUndo').addEventListener('click', undo);
      document.getElementById('btnRedo').addEventListener('click', redo);
      document.addEventListener('keydown', (e)=>{ const z=(e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='z'; const y=(e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='z'; if(z){ e.preventDefault(); undo(); } if(y){ e.preventDefault(); redo(); } });

      // Theme toggle
      document.getElementById('btnDark').addEventListener('click', ()=>{ document.documentElement.classList.toggle('dark'); });

      // Tabs
      document.querySelectorAll('.tab-btn').forEach(b=> b.addEventListener('click', ()=> renderTab(b.dataset.tab)));
    }

    function wireZoneButtons(){ document.querySelectorAll('[data-action]').forEach(btn=>{ btn.addEventListener('change', onCardAction); btn.addEventListener('click', onCardAction); }); const apply=document.getElementById('btnApplyRules'); if(apply){ apply.onclick=()=>{ pushHistory(); state.rules.minFreeSundaysPerMonth=parseInt(document.getElementById('ruleSundays').value||2); state.rules.maxConsecutiveWorkDays=parseInt(document.getElementById('ruleStreak').value||6); renderTab('rules'); saveAuto(); } } }

    function onCardAction(e){ const t=e.currentTarget; const act=t.dataset.action; if(!act) return; const shift=t.dataset.shift; const idx=parseInt(t.dataset.idx); pushHistory(); if(act==='del'){ state.shiftAssignments[shift].splice(idx,1); renderAll(); saveAuto(); return; } if(act==='dup'){ state.shiftAssignments[shift].splice(idx+1,0, clone(state.shiftAssignments[shift][idx])); renderAll(); saveAuto(); return; } if(act==='c1'){ state.shiftAssignments[shift][idx].cycle1=t.value; renderAll(); saveAuto(); return; } if(act==='c2'){ state.shiftAssignments[shift][idx].cycle2=t.value||null; renderAll(); saveAuto(); return; } if(act==='ofs'){ state.shiftAssignments[shift][idx].startOffset=parseInt(t.value||0); renderAll(); saveAuto(); return; } if(act==='r1'){ state.shiftAssignments[shift][idx].cycle1Repeat=parseInt(t.value||1); renderAll(); saveAuto(); return; } }

    // Drag & Drop con feedback visual
    function wireDnD(){
      let dragged=null;

      document.querySelectorAll('[draggable="true"]').forEach(el=>{
        el.addEventListener('dragstart', (e)=>{
          dragged={ groupId: el.dataset.group, cycle: el.dataset.cycle };
          el.classList.add('dragging');
        });

        el.addEventListener('dragend', ()=>{
          el.classList.remove('dragging');
        });
      });

      document.querySelectorAll('[data-drop-zone]').forEach(zone=>{
        zone.addEventListener('dragover', e=> {
          e.preventDefault();
          zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', ()=> {
          zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', e=>{
          e.preventDefault();
          zone.classList.remove('drag-over');

          if(!dragged) return;
          const key=zone.dataset.dropZone;
          const list=state.shiftAssignments[key];

          if(list.length>=state.maxGroupsPerShift) {
            toast('⚠️ Este turno ya alcanzó el máximo de grupos', 'error');
            return;
          }

          if(list.some(a=> a.groupId===dragged.groupId)) {
            toast('⚠️ Este grupo ya está asignado a este turno', 'error');
            return;
          }

          pushHistory();
          list.push({ groupId: dragged.groupId, cycle1: dragged.cycle, cycle2: null, cycle1Repeat: 1, cycle2Repeat: 1, startOffset: 0 });
          dragged=null;
          renderAll();
          saveAuto();
          toast('✅ Grupo asignado exitosamente', 'success');
        });
      });

      // Touch support para mobile
      let touchItem = null;
      document.querySelectorAll('[draggable="true"]').forEach(el => {
        el.addEventListener('touchstart', (e) => {
          touchItem = { groupId: el.dataset.group, cycle: el.dataset.cycle, element: el };
          el.classList.add('dragging');
        });

        el.addEventListener('touchend', (e) => {
          el.classList.remove('dragging');
          const touch = e.changedTouches[0];
          const dropZone = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('[data-drop-zone]');

          if (dropZone && touchItem) {
            const key = dropZone.dataset.dropZone;
            const list = state.shiftAssignments[key];

            if(list.length >= state.maxGroupsPerShift) {
              toast('⚠️ Este turno ya alcanzó el máximo de grupos', 'error');
              touchItem = null;
              return;
            }

            if(list.some(a => a.groupId === touchItem.groupId)) {
              toast('⚠️ Este grupo ya está asignado a este turno', 'error');
              touchItem = null;
              return;
            }

            pushHistory();
            list.push({ groupId: touchItem.groupId, cycle1: touchItem.cycle, cycle2: null, cycle1Repeat: 1, cycle2Repeat: 1, startOffset: 0 });
            renderAll();
            saveAuto();
            toast('✅ Grupo asignado exitosamente', 'success');
          }

          touchItem = null;
        });
      });
    }

    // Undo/Redo impl
    const undo=()=>{ if(!undoStack.length) return; const prev=undoStack.pop(); redoStack.push(clone(state)); state=prev; renderAll(); saveAuto(); toast('↩️ Cambio deshecho', 'info'); };
    const redo=()=>{ if(!redoStack.length) return; const next=redoStack.pop(); undoStack.push(clone(state)); state=next; renderAll(); saveAuto(); toast('↪️ Cambio rehecho', 'info'); };

    const toast=(msg, type='success')=>{
      const el=document.createElement('div');
      el.className=`toast toast-${type}`;
      el.textContent=msg;
      document.body.appendChild(el);
      setTimeout(()=>{
        el.style.opacity='0';
        setTimeout(()=>el.remove(),300);
      },2500);
    };

    const saveAuto=()=> localStorage.setItem('turnos_pro_autosave', JSON.stringify(state));

    function showLoading(message = 'Procesando...') {
      const loader = document.createElement('div');
      loader.id = 'globalLoader';
      loader.className = 'modal-overlay';
      loader.innerHTML = `
        <div class="bg-white rounded-2xl p-8 text-center">
          <div class="spinner mx-auto mb-4"></div>
          <div class="text-lg font-semibold">${message}</div>
        </div>
      `;
      document.body.appendChild(loader);
      return loader;
    }

    function hideLoading() {
      const loader = document.getElementById('globalLoader');
      if (loader) loader.remove();
    }

    function exportXLSX(){
      const loader = showLoading('📊 Generando Excel de 12 meses...');

      // Usar setTimeout para permitir que el loader se muestre
      setTimeout(() => {
        try {
          const {calendar, byGroup} = buildEngine();
          const wb = XLSX.utils.book_new();
          const today = new Date().toISOString().slice(0,10); 
      
      // Hoja de Configuración
      const conf = [ 
        ['CONFIGURACIÓN DEL SISTEMA DE TURNOS'], 
        [], 
        ['Fecha Inicio:', state.startDate], 
        ['Fecha Fin:', state.endDate], 
        [], 
        ['ASIGNACIONES POR TURNO'] 
      ]; 
      ['day','afternoon','night'].forEach(k=>{ 
        const shiftNames = {day:'DÍA', afternoon:'TARDE', night:'NOCHE'};
        conf.push([`Turno ${shiftNames[k]}:`]); 
        state.shiftAssignments[k].forEach(a=> conf.push([
          `  Grupo ${a.groupId}`, 
          `Ciclo 1: ${a.cycle1}`, 
          a.cycle2 ? `Ciclo 2: ${a.cycle2}` : 'Sin ciclo 2',
          `Desfase: ${a.startOffset}`
        ])); 
        conf.push([]); 
      }); 
      const wsC = XLSX.utils.aoa_to_sheet(conf); 
      XLSX.utils.book_append_sheet(wb, wsC, 'Configuración');
      
      // Calcular 12 meses desde la fecha de inicio
      const startDate = new Date(state.startDate);
      const monthsList = [];
      for(let i = 0; i < 12; i++) {
        const monthDate = new Date(startDate);
        monthDate.setMonth(startDate.getMonth() + i);
        const yyyyMM = monthDate.toISOString().slice(0, 7);
        monthsList.push(yyyyMM);
      }
      
      // Crear una hoja por cada mes
      monthsList.forEach((yyyyMM, index) => {
        const mg = monthByGroup(byGroup, yyyyMM);
        const days = daysInMonth(yyyyMM);
        
        if(days.length === 0) return; // Saltar si el mes no tiene días
        
        // Vista por grupos
        const header = ['Grupo', ...days.map(d => d.js.toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit'}))];
        const rows = [header];
        Object.keys(mg).sort().forEach(g => {
          rows.push([`G${g}`, ...mg[g].map(x => 
            x.shift === 'day' ? 'Día' : 
            x.shift === 'afternoon' ? 'Tarde' : 
            x.shift === 'night' ? 'Noche' : 'Descanso'
          )]);
        });
        
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const monthName = new Date(yyyyMM + '-01').toLocaleDateString('es-CL', {month:'short', year:'2-digit'}).toUpperCase();
        XLSX.utils.book_append_sheet(wb, ws, `${index + 1}. ${monthName}`);
      });
      
      // Crear hoja consolidada anual
      const allGroups = Object.keys(byGroup).sort();
      const annualHeader = ['Fecha', 'Día Semana', ...allGroups.map(g => `G${g}`)];
      const annualRows = [annualHeader];
      
      // Iterar sobre todos los meses
      monthsList.forEach(yyyyMM => {
        const mg = monthByGroup(byGroup, yyyyMM);
        const days = daysInMonth(yyyyMM);
        
        days.forEach((dayInfo, i) => {
          const dt = dayInfo.js;
          const row = [
            dt.toLocaleDateString('es-CL'),
            dt.toLocaleDateString('es-CL', {weekday:'long'})
          ];
          
          allGroups.forEach(g => {
            const x = mg[g][i];
            row.push(x ? (
              x.shift === 'rest' ? 'Descanso' : 
              x.shift === 'day' ? 'Día' : 
              x.shift === 'afternoon' ? 'Tarde' : 'Noche'
            ) : '');
          });
          
          annualRows.push(row);
        });
      });
      
          const wsAnual = XLSX.utils.aoa_to_sheet(annualRows);
          wsAnual['!cols'] = [
            { wch: 12 },  // Fecha
            { wch: 12 },  // Día
            ...allGroups.map(() => ({ wch: 10 }))  // Grupos
          ];
          XLSX.utils.book_append_sheet(wb, wsAnual, 'RESUMEN ANUAL');
      
      // Crear hoja de estadísticas de domingos
      const sundayStats = {};
      monthsList.forEach(yyyyMM => {
        sundayStats[yyyyMM] = {};
        allGroups.forEach(g => {
          sundayStats[yyyyMM][g] = { working: 0, free: 0, total: 0 };
        });
        
        const mg = monthByGroup(byGroup, yyyyMM);
        const days = daysInMonth(yyyyMM);
        
        days.forEach((dayInfo, i) => {
          if (dayInfo.isSunday) {
            allGroups.forEach(g => {
              const x = mg[g][i];
              sundayStats[yyyyMM][g].total++;
              if (x && x.shift !== 'rest') {
                sundayStats[yyyyMM][g].working++;
              } else {
                sundayStats[yyyyMM][g].free++;
              }
            });
          }
        });
      });
      
      const sundayHeader = ['Mes', ...allGroups.map(g => `G${g} Libres`), ...allGroups.map(g => `G${g} Total`)];
      const sundayRows = [sundayHeader];
      
      monthsList.forEach(yyyyMM => {
        const monthName = new Date(yyyyMM + '-01').toLocaleDateString('es-CL', {year:'numeric', month:'long'});
        const row = [monthName];
        
        allGroups.forEach(g => {
          row.push(sundayStats[yyyyMM][g].free);
        });
        
        allGroups.forEach(g => {
          row.push(sundayStats[yyyyMM][g].total);
        });
        
        sundayRows.push(row);
      });
      
      // Agregar totales
      const totalRow = ['TOTAL AÑO'];
      allGroups.forEach(g => {
        const totalFree = monthsList.reduce((sum, m) => sum + sundayStats[m][g].free, 0);
        totalRow.push(totalFree);
      });
      allGroups.forEach(g => {
        const totalSundays = monthsList.reduce((sum, m) => sum + sundayStats[m][g].total, 0);
        totalRow.push(totalSundays);
      });
      sundayRows.push(totalRow);
      
      // Agregar promedio mensual
      const avgRow = ['PROMEDIO/MES'];
      allGroups.forEach(g => {
        const totalFree = monthsList.reduce((sum, m) => sum + sundayStats[m][g].free, 0);
        avgRow.push((totalFree / 12).toFixed(1));
      });
      allGroups.forEach(g => {
        const totalSundays = monthsList.reduce((sum, m) => sum + sundayStats[m][g].total, 0);
        avgRow.push((totalSundays / 12).toFixed(1));
      });
      sundayRows.push(avgRow);
      
          const wsSundays = XLSX.utils.aoa_to_sheet(sundayRows);
          XLSX.utils.book_append_sheet(wb, wsSundays, 'DOMINGOS (12 meses)');

          XLSX.writeFile(wb, `Turnos_Anual_${today}.xlsx`);
          hideLoading();
          toast('✅ Excel de 12 meses exportado exitosamente', 'success');
        } catch (error) {
          hideLoading();
          toast('❌ Error al generar Excel: ' + error.message, 'error');
          console.error(error);
        }
      }, 100);
    }

    // ---------- MANUAL CALENDAR DRAG & DROP ----------
    function wireManualDnD() {
      let draggedShift = null;

      // Fichas de la paleta
      document.querySelectorAll('[data-manual-shift]').forEach(chip => {
        chip.addEventListener('dragstart', (e) => {
          draggedShift = chip.dataset.manualShift;
          chip.classList.add('dragging');
        });

        chip.addEventListener('dragend', () => {
          chip.classList.remove('dragging');
        });

        // Touch support
        chip.addEventListener('touchstart', (e) => {
          draggedShift = chip.dataset.manualShift;
          chip.classList.add('dragging');
        });

        chip.addEventListener('touchend', (e) => {
          chip.classList.remove('dragging');
          const touch = e.changedTouches[0];
          const dropCell = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('[data-drop-manual]');

          if (dropCell && draggedShift) {
            assignManualShift(dropCell.dataset.date, draggedShift);
          }
          draggedShift = null;
        });
      });

      // Celdas del calendario
      document.querySelectorAll('[data-drop-manual]').forEach(cell => {
        cell.addEventListener('dragover', (e) => {
          e.preventDefault();
          cell.classList.add('drag-over-manual');
        });

        cell.addEventListener('dragleave', () => {
          cell.classList.remove('drag-over-manual');
        });

        cell.addEventListener('drop', (e) => {
          e.preventDefault();
          cell.classList.remove('drag-over-manual');

          if (draggedShift) {
            assignManualShift(cell.dataset.date, draggedShift);
            draggedShift = null;
          }
        });
      });

      // Eliminar turnos asignados
      document.querySelectorAll('.manual-shift-assigned').forEach(assigned => {
        assigned.addEventListener('click', () => {
          const date = assigned.dataset.date;
          const shift = assigned.dataset.shift;
          removeManualShift(date, shift);
        });
      });

      // Botón limpiar mes
      document.getElementById('btnClearMonth')?.addEventListener('click', () => {
        if (confirm('¿Estás seguro de limpiar todos los turnos del mes seleccionado?')) {
          clearManualMonth();
        }
      });

      // Botón exportar
      document.getElementById('btnExportManual')?.addEventListener('click', exportManualCalendar);
    }

    function assignManualShift(date, shiftId) {
      if (!state.manualCalendar[date]) {
        state.manualCalendar[date] = { shifts: [] };
      }

      // Validación: no repetir el mismo turno en un día
      if (state.manualCalendar[date].shifts.includes(shiftId)) {
        toast(`⚠️ Ya existe un turno de ${getShiftLabel(shiftId)} en este día`, 'error');
        return;
      }

      pushHistory();
      state.manualCalendar[date].shifts.push(shiftId);
      saveAuto();
      renderTab('manual');
      toast(`✅ Turno de ${getShiftLabel(shiftId)} asignado`, 'success');
    }

    function removeManualShift(date, shiftId) {
      if (!state.manualCalendar[date]) return;

      pushHistory();
      state.manualCalendar[date].shifts = state.manualCalendar[date].shifts.filter(s => s !== shiftId);

      // Limpiar el día si no tiene turnos
      if (state.manualCalendar[date].shifts.length === 0) {
        delete state.manualCalendar[date];
      }

      saveAuto();
      renderTab('manual');
      toast(`🗑️ Turno de ${getShiftLabel(shiftId)} eliminado`, 'info');
    }

    function clearManualMonth() {
      const month = state.selectedMonth;
      pushHistory();

      // Eliminar solo los días del mes actual
      Object.keys(state.manualCalendar).forEach(date => {
        if (date.startsWith(month)) {
          delete state.manualCalendar[date];
        }
      });

      saveAuto();
      renderTab('manual');
      toast('🧹 Mes limpiado completamente', 'info');
    }

    function getShiftLabel(shiftId) {
      const labels = { day: 'Día', afternoon: 'Tarde', night: 'Noche', rest: 'Descanso' };
      return labels[shiftId] || shiftId;
    }

    function exportManualCalendar() {
      const loader = showLoading('📊 Generando Excel del calendario manual...');

      setTimeout(() => {
        try {
          const wb = XLSX.utils.book_new();
          const today = new Date().toISOString().slice(0, 10);

          // Hoja del calendario manual
          const month = state.selectedMonth;
          const days = daysInMonth(month);

          const rows = [
            ['Fecha', 'Día Semana', 'Turnos Asignados'],
            []
          ];

          days.forEach(day => {
            const dateStr = day.date;
            const dayData = state.manualCalendar[dateStr];
            const weekday = day.js.toLocaleDateString('es-CL', { weekday: 'long' });
            const shifts = dayData && dayData.shifts.length > 0
              ? dayData.shifts.map(s => getShiftLabel(s)).join(', ')
              : '-';

            rows.push([
              day.js.toLocaleDateString('es-CL'),
              weekday,
              shifts
            ]);
          });

          const ws = XLSX.utils.aoa_to_sheet(rows);
          ws['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 30 }];

          XLSX.utils.book_append_sheet(wb, ws, 'Calendario Manual');

          XLSX.writeFile(wb, `Calendario_Manual_${month}_${today}.xlsx`);
          hideLoading();
          toast('✅ Calendario manual exportado exitosamente', 'success');
        } catch (error) {
          hideLoading();
          toast('❌ Error al exportar: ' + error.message, 'error');
          console.error(error);
        }
      }, 100);
    }

    // ---------- INIT ----------
    (function init(){
      const auto=localStorage.getItem('turnos_pro_autosave');
      if(auto){ try{ state=JSON.parse(auto);}catch{} }
      if(!state.selectedMonth){ state.selectedMonth = state.startDate.slice(0,7); }
      wireBasics();
      renderAll();
      renderTab('by-group'); // Mostrar pestaña por defecto
      updateBreadcrumb();

      // Anunciar página cargada para lectores de pantalla
      setTimeout(() => {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = 'Simulador de turnos cargado correctamente. Use Tab para navegar entre controles.';
        document.body.appendChild(announcement);
        setTimeout(() => announcement.remove(), 3000);
      }, 1000);
    })();
  </script>
