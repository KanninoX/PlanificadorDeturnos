/**
 * Motor de Cálculo de Turnos
 * Migrado desde el código original
 */

const EngineService = {
  /**
   * Construir calendario automático basado en ciclos
   */
  buildEngine: function(state) {
    // Parsear fechas evitando problemas de zona horaria
    const [startY, startM, startD] = state.startDate.split('-').map(Number);
    const [endY, endM, endD] = state.endDate.split('-').map(Number);
    const start = new Date(startY, startM - 1, startD);
    const end = new Date(endY, endM - 1, endD);

    const calendar = { day: [], afternoon: [], night: [] };
    const byGroup = {};
    const engine = {};

    // Inicializar engine para cada grupo asignado
    ['day', 'afternoon', 'night'].forEach(shift => {
      state.shiftAssignments[shift].forEach(a => {
        if (!engine[a.groupId]) {
          const c1 = Utils.cycleTuple(a.cycle1);
          const c2 = a.cycle2 ? Utils.cycleTuple(a.cycle2) : null;
          const span = c1[0] + c1[1];
          const startCycle = (a.startOffset || 0) % span;

          engine[a.groupId] = {
            shift,
            cycle1: a.cycle1,
            cycle2: a.cycle2,
            c1Work: c1[0],
            c1Span: c1[0] + c1[1],
            c2Work: c2 ? c2[0] : null,
            c2Span: c2 ? c2[0] + c2[1] : null,
            cycleDay: startCycle,
            cycleType: 1,
            reps: 0
          };
          byGroup[a.groupId] = [];
        }
      });
    });

    // Generar calendario día por día
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const y = currentDate.getFullYear();
      const m = String(currentDate.getMonth() + 1).padStart(2, '0');
      const d = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const isSunday = currentDate.getDay() === 0;

      const row = {
        day: { date: dateStr, isSunday, groups: [] },
        afternoon: { date: dateStr, isSunday, groups: [] },
        night: { date: dateStr, isSunday, groups: [] }
      };

      Object.keys(engine).forEach(g => {
        const e = engine[g];
        const workDays = e.cycleType === 1 ? e.c1Work : e.c2Work;
        const span = e.cycleType === 1 ? e.c1Span : e.c2Span;
        const isWork = e.cycleDay < workDays;

        row[e.shift].groups.push({
          groupId: g,
          isWorking: isWork,
          currentCycleType: e.cycleType
        });

        byGroup[g].push({
          date: dateStr,
          isSunday,
          isWorking: isWork,
          shift: isWork ? e.shift : 'rest',
          currentCycleType: e.cycleType
        });

        e.cycleDay++;
        if (e.cycleDay >= span) {
          e.cycleDay = 0;
          e.reps++;
          if (e.cycle2) {
            e.cycleType = e.cycleType === 1 ? 2 : 1;
            e.reps = 0;
          }
          e.shift = e.shift === 'day' ? 'afternoon' : e.shift === 'afternoon' ? 'night' : 'day';
        }
      });

      calendar.day.push(row.day);
      calendar.afternoon.push(row.afternoon);
      calendar.night.push(row.night);

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { calendar, byGroup };
  },

  /**
   * Construir calendario manual basado en asignaciones manuales
   */
  buildManualCalendar: function(state) {
    // Parsear fechas evitando problemas de zona horaria
    const [startY, startM, startD] = state.startDate.split('-').map(Number);
    const [endY, endM, endD] = state.endDate.split('-').map(Number);
    const start = new Date(startY, startM - 1, startD);
    const end = new Date(endY, endM - 1, endD);

    const calendar = { day: [], afternoon: [], night: [] };

    // Asegurarse de que manualDaysByGroup existe
    if (!state.manualDaysByGroup) {
      state.manualDaysByGroup = {};
    }

    // Generar calendario día por día usando manualDaysByGroup
    const currentDate1 = new Date(start);
    while (currentDate1 <= end) {
      const y = currentDate1.getFullYear();
      const m = String(currentDate1.getMonth() + 1).padStart(2, '0');
      const d = String(currentDate1.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const isSunday = currentDate1.getDay() === 0;

      const row = {
        day: { date: dateStr, isSunday, groups: [] },
        afternoon: { date: dateStr, isSunday, groups: [] },
        night: { date: dateStr, isSunday, groups: [] }
      };

      // Para cada grupo, verificar si tiene un turno asignado ese día
      state.groups.forEach(groupId => {
        const groupDays = state.manualDaysByGroup[groupId] || {};
        const assignedShift = groupDays[dateStr] || 'rest';

        if (assignedShift !== 'rest') {
          row[assignedShift].groups.push({
            groupId: groupId,
            isWorking: true,
            currentCycleType: 1
          });
        }
      });

      calendar.day.push(row.day);
      calendar.afternoon.push(row.afternoon);
      calendar.night.push(row.night);

      currentDate1.setDate(currentDate1.getDate() + 1);
    }

    // Para byGroup, crear datos para cada grupo con sus turnos específicos
    const byGroup = {};

    // Inicializar cada grupo con sus propios turnos
    state.groups.forEach(groupId => {
      byGroup[groupId] = [];
      const groupDays = state.manualDaysByGroup[groupId] || {};

      // Crear una nueva copia de la fecha de inicio para cada grupo
      const currentDate2 = new Date(start);
      while (currentDate2 <= end) {
        const y = currentDate2.getFullYear();
        const m = String(currentDate2.getMonth() + 1).padStart(2, '0');
        const d = String(currentDate2.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        const isSunday = currentDate2.getDay() === 0;
        const assignedShift = groupDays[dateStr] || 'rest';

        byGroup[groupId].push({
          date: dateStr,
          isSunday,
          isWorking: assignedShift !== 'rest',
          shift: assignedShift,
          currentCycleType: 1
        });

        currentDate2.setDate(currentDate2.getDate() + 1);
      }
    });

    return { calendar, byGroup };
  }
};
