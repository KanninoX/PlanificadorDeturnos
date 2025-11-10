/**
 * Servicio de Exportación
 * Maneja exportación a Google Sheets formateadas y datos para XLSX
 */

const ExportService = {
  /**
   * Exportar datos según modo (automático o manual)
   */
  exportData: function(mode, state) {
    Utils.validateSpreadsheet();

    // Calcular calendario
    let result;
    if (state.manualMode) {
      result = EngineService.buildManualCalendar(state);
    } else {
      result = EngineService.buildEngine(state);
    }

    const { calendar, byGroup } = result;

    if (mode === 'sheet') {
      // Exportar a Google Sheet formateada con colores
      return this.exportToGoogleSheet(state, calendar, byGroup);
    } else if (mode === 'xlsx') {
      // Preparar datos para exportación XLSX en el cliente
      return this.prepareXLSXData(state, calendar, byGroup);
    }

    throw new Error('Modo de exportación no válido');
  },

  /**
   * Exportar a Google Sheet formateada con colores
   */
  exportToGoogleSheet: function(state, calendar, byGroup) {
    const ss = Utils.getSpreadsheet();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const sheetName = state.manualMode
      ? `Export_Manual_${timestamp}`
      : `Export_Auto_${timestamp}`;

    // Crear nueva hoja
    let sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      ss.deleteSheet(sheet);
    }
    sheet = ss.insertSheet(sheetName);

    if (state.manualMode) {
      this.exportManualToSheet(sheet, state, calendar, byGroup);
    } else {
      this.exportAutoToSheet(sheet, state, calendar, byGroup);
    }

    return {
      success: true,
      sheetName: sheetName,
      url: ss.getUrl() + '#gid=' + sheet.getSheetId()
    };
  },

  /**
   * Exportar modo manual a Google Sheet
   */
  exportManualToSheet: function(sheet, state, calendar, byGroup) {
    const [startY, startM, startD] = state.startDate.split('-').map(Number);
    const [endY, endM, endD] = state.endDate.split('-').map(Number);
    const start = new Date(startY, startM - 1, startD);
    const end = new Date(endY, endM - 1, endD);

    const allGroups = state.groups;
    let currentRow = 1;

    // SECCIÓN 1: Vista por Grupos
    sheet.getRange(currentRow, 1).setValue('VISTA POR GRUPOS - MODO MANUAL');
    sheet.getRange(currentRow, 1, 1, allGroups.length + 2)
      .setBackground('#1f2937')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    currentRow++;

    // Encabezados
    const groupHeaders = ['Fecha', 'Día Semana'];
    allGroups.forEach(g => {
      groupHeaders.push(ConfigService.getGroupDisplayName(g, state.groupNames));
    });

    sheet.getRange(currentRow, 1, 1, groupHeaders.length).setValues([groupHeaders]);
    sheet.getRange(currentRow, 1, 1, groupHeaders.length)
      .setBackground('#374151')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    currentRow++;

    // Datos por fecha
    const groupData = [];
    const currentDate1 = new Date(start);
    while (currentDate1 <= end) {
      const y = currentDate1.getFullYear();
      const m = String(currentDate1.getMonth() + 1).padStart(2, '0');
      const d = String(currentDate1.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dayName = this.getDayName(currentDate1);

      const row = [dateStr, dayName];
      allGroups.forEach(groupId => {
        const groupDays = state.manualDaysByGroup[groupId] || {};
        const shift = groupDays[dateStr] || 'rest';
        row.push(this.getShiftLabel(shift));
      });

      groupData.push(row);
      currentDate1.setDate(currentDate1.getDate() + 1);
    }

    // Escribir datos
    sheet.getRange(currentRow, 1, groupData.length, groupHeaders.length).setValues(groupData);

    // Aplicar colores a las celdas de grupos
    for (let i = 0; i < groupData.length; i++) {
      for (let j = 0; j < allGroups.length; j++) {
        const groupId = allGroups[j];
        const cellRow = currentRow + i;
        const cellCol = 3 + j; // Columna de datos (después de Fecha y Día)
        const groupDays = state.manualDaysByGroup[groupId] || {};
        const dateStr = groupData[i][0];
        const shift = groupDays[dateStr] || 'rest';

        if (shift !== 'rest') {
          const color = Utils.getGroupColor(groupId);
          sheet.getRange(cellRow, cellCol)
            .setBackground(color)
            .setFontColor('#ffffff')
            .setFontWeight('bold');
        }
      }
    }

    currentRow += groupData.length + 2;

    // SECCIÓN 2: Vista por Turnos
    sheet.getRange(currentRow, 1).setValue('VISTA POR TURNOS - MODO MANUAL');
    sheet.getRange(currentRow, 1, 1, 5)
      .setBackground('#1f2937')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    currentRow++;

    // Encabezados
    const shiftHeaders = ['Fecha', 'Día Semana', 'Mañana', 'Tarde', 'Noche'];
    sheet.getRange(currentRow, 1, 1, shiftHeaders.length).setValues([shiftHeaders]);
    sheet.getRange(currentRow, 1, 1, shiftHeaders.length)
      .setBackground('#374151')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    currentRow++;

    // Datos por turnos
    const shiftData = [];
    const currentDate2 = new Date(start);
    while (currentDate2 <= end) {
      const y = currentDate2.getFullYear();
      const m = String(currentDate2.getMonth() + 1).padStart(2, '0');
      const d = String(currentDate2.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dayName = this.getDayName(currentDate2);

      const dayGroups = [];
      const afternoonGroups = [];
      const nightGroups = [];

      allGroups.forEach(groupId => {
        const groupDays = state.manualDaysByGroup[groupId] || {};
        const shift = groupDays[dateStr];
        const displayName = ConfigService.getGroupDisplayName(groupId, state.groupNames);

        if (shift === 'day') dayGroups.push(displayName);
        if (shift === 'afternoon') afternoonGroups.push(displayName);
        if (shift === 'night') nightGroups.push(displayName);
      });

      shiftData.push([
        dateStr,
        dayName,
        dayGroups.join(', ') || '-',
        afternoonGroups.join(', ') || '-',
        nightGroups.join(', ') || '-'
      ]);

      currentDate2.setDate(currentDate2.getDate() + 1);
    }

    sheet.getRange(currentRow, 1, shiftData.length, shiftHeaders.length).setValues(shiftData);

    // Auto-ajustar columnas
    for (let i = 1; i <= shiftHeaders.length; i++) {
      sheet.autoResizeColumn(i);
    }
  },

  /**
   * Exportar modo automático a Google Sheet
   */
  exportAutoToSheet: function(sheet, state, calendar, byGroup) {
    const [startY, startM, startD] = state.startDate.split('-').map(Number);
    const [endY, endM, endD] = state.endDate.split('-').map(Number);
    const start = new Date(startY, startM - 1, startD);
    const end = new Date(endY, endM - 1, endD);

    const allGroups = state.groups;
    let currentRow = 1;

    // SECCIÓN 1: Configuración
    sheet.getRange(currentRow, 1).setValue('CONFIGURACIÓN - MODO AUTOMÁTICO');
    sheet.getRange(currentRow, 1, 1, 2)
      .setBackground('#1f2937')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    currentRow++;

    const configData = [
      ['Fecha Inicio', state.startDate],
      ['Fecha Fin', state.endDate],
      ['Máximo Grupos por Turno', state.maxGroupsPerShift],
      ['Mínimo Domingos Libres/Mes', state.rules.minFreeSundaysPerMonth],
      ['Máximo Días Consecutivos', state.rules.maxConsecutiveWorkDays]
    ];

    sheet.getRange(currentRow, 1, configData.length, 2).setValues(configData);
    sheet.getRange(currentRow, 1, configData.length, 1).setFontWeight('bold');
    currentRow += configData.length + 1;

    // Asignaciones por turno
    sheet.getRange(currentRow, 1).setValue('Asignaciones de Turnos');
    sheet.getRange(currentRow, 1).setFontWeight('bold');
    currentRow++;

    const assignHeaders = ['Turno', 'Grupo', 'Ciclo 1', 'Ciclo 2', 'Offset'];
    sheet.getRange(currentRow, 1, 1, assignHeaders.length).setValues([assignHeaders]);
    sheet.getRange(currentRow, 1, 1, assignHeaders.length)
      .setBackground('#374151')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    currentRow++;

    const assignData = [];
    ['day', 'afternoon', 'night'].forEach(shift => {
      state.shiftAssignments[shift].forEach(a => {
        assignData.push([
          this.getShiftLabel(shift),
          ConfigService.getGroupDisplayName(a.groupId, state.groupNames),
          a.cycle1,
          a.cycle2 || '-',
          a.startOffset || 0
        ]);
      });
    });

    sheet.getRange(currentRow, 1, assignData.length, assignHeaders.length).setValues(assignData);
    currentRow += assignData.length + 2;

    // SECCIÓN 2: Vista por Turnos
    sheet.getRange(currentRow, 1).setValue('VISTA POR TURNOS - MODO AUTOMÁTICO');
    sheet.getRange(currentRow, 1, 1, 5)
      .setBackground('#1f2937')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    currentRow++;

    const shiftHeaders = ['Fecha', 'Día Semana', 'Mañana', 'Tarde', 'Noche'];
    sheet.getRange(currentRow, 1, 1, shiftHeaders.length).setValues([shiftHeaders]);
    sheet.getRange(currentRow, 1, 1, shiftHeaders.length)
      .setBackground('#374151')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    currentRow++;

    const shiftData = [];
    for (let i = 0; i < calendar.day.length; i++) {
      const dayEntry = calendar.day[i];
      const afternoonEntry = calendar.afternoon[i];
      const nightEntry = calendar.night[i];

      const dayGroups = dayEntry.groups
        .filter(g => g.isWorking)
        .map(g => ConfigService.getGroupDisplayName(g.groupId, state.groupNames))
        .join(', ') || '-';

      const afternoonGroups = afternoonEntry.groups
        .filter(g => g.isWorking)
        .map(g => ConfigService.getGroupDisplayName(g.groupId, state.groupNames))
        .join(', ') || '-';

      const nightGroups = nightEntry.groups
        .filter(g => g.isWorking)
        .map(g => ConfigService.getGroupDisplayName(g.groupId, state.groupNames))
        .join(', ') || '-';

      const date = new Date(dayEntry.date);
      const dayName = this.getDayName(date);

      shiftData.push([dayEntry.date, dayName, dayGroups, afternoonGroups, nightGroups]);
    }

    sheet.getRange(currentRow, 1, shiftData.length, shiftHeaders.length).setValues(shiftData);
    currentRow += shiftData.length + 2;

    // SECCIÓN 3: Vista por Grupos
    sheet.getRange(currentRow, 1).setValue('VISTA POR GRUPOS - MODO AUTOMÁTICO');
    sheet.getRange(currentRow, 1, 1, allGroups.length + 2)
      .setBackground('#1f2937')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    currentRow++;

    const groupHeaders = ['Fecha', 'Día Semana'];
    allGroups.forEach(g => {
      groupHeaders.push(ConfigService.getGroupDisplayName(g, state.groupNames));
    });

    sheet.getRange(currentRow, 1, 1, groupHeaders.length).setValues([groupHeaders]);
    sheet.getRange(currentRow, 1, 1, groupHeaders.length)
      .setBackground('#374151')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    currentRow++;

    const groupData = [];
    const currentDate = new Date(start);
    let dateIndex = 0;

    while (currentDate <= end) {
      const y = currentDate.getFullYear();
      const m = String(currentDate.getMonth() + 1).padStart(2, '0');
      const d = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dayName = this.getDayName(currentDate);

      const row = [dateStr, dayName];

      allGroups.forEach(groupId => {
        if (byGroup[groupId] && byGroup[groupId][dateIndex]) {
          const entry = byGroup[groupId][dateIndex];
          row.push(this.getShiftLabel(entry.shift));
        } else {
          row.push('Descanso');
        }
      });

      groupData.push(row);
      currentDate.setDate(currentDate.getDate() + 1);
      dateIndex++;
    }

    sheet.getRange(currentRow, 1, groupData.length, groupHeaders.length).setValues(groupData);

    // Aplicar colores a las celdas de grupos
    for (let i = 0; i < groupData.length; i++) {
      for (let j = 0; j < allGroups.length; j++) {
        const groupId = allGroups[j];
        const cellRow = currentRow + i;
        const cellCol = 3 + j;

        if (byGroup[groupId] && byGroup[groupId][i]) {
          const entry = byGroup[groupId][i];
          if (entry.isWorking) {
            const color = Utils.getGroupColor(groupId);
            sheet.getRange(cellRow, cellCol)
              .setBackground(color)
              .setFontColor('#ffffff')
              .setFontWeight('bold');
          }
        }
      }
    }

    // Auto-ajustar columnas
    for (let i = 1; i <= Math.max(groupHeaders.length, shiftHeaders.length); i++) {
      sheet.autoResizeColumn(i);
    }
  },

  /**
   * Preparar datos para exportación XLSX en cliente
   */
  prepareXLSXData: function(state, calendar, byGroup) {
    // Retornar todos los datos necesarios para que el cliente genere el XLSX
    // Incluye arrays de datos y información de colores

    const [startY, startM, startD] = state.startDate.split('-').map(Number);
    const [endY, endM, endD] = state.endDate.split('-').map(Number);
    const start = new Date(startY, startM - 1, startD);
    const end = new Date(endY, endM - 1, endD);

    const allGroups = state.groups;
    const groupColors = {};
    allGroups.forEach(g => {
      groupColors[g] = Utils.getGroupColor(g);
    });

    const result = {
      mode: state.manualMode ? 'manual' : 'auto',
      groupColors: groupColors,
      groupNames: state.groupNames,
      sheets: []
    };

    if (state.manualMode) {
      // Preparar datos de modo manual
      result.sheets = this.prepareManualXLSXSheets(state, calendar, byGroup, start, end, allGroups);
    } else {
      // Preparar datos de modo automático
      result.sheets = this.prepareAutoXLSXSheets(state, calendar, byGroup, start, end, allGroups);
    }

    return result;
  },

  /**
   * Preparar hojas XLSX para modo manual
   */
  prepareManualXLSXSheets: function(state, calendar, byGroup, start, end, allGroups) {
    const sheets = [];

    // Hoja 1: Vista por Grupos
    const groupSheet = {
      name: 'Vista por Grupos',
      headers: ['Fecha', 'Día Semana'],
      data: [],
      colorMap: [] // Array de {row, col, color, groupId}
    };

    allGroups.forEach(g => {
      groupSheet.headers.push(ConfigService.getGroupDisplayName(g, state.groupNames));
    });

    const currentDate1 = new Date(start);
    let rowIndex = 0;
    while (currentDate1 <= end) {
      const y = currentDate1.getFullYear();
      const m = String(currentDate1.getMonth() + 1).padStart(2, '0');
      const d = String(currentDate1.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dayName = this.getDayName(currentDate1);

      const row = [dateStr, dayName];
      allGroups.forEach((groupId, colIndex) => {
        const groupDays = state.manualDaysByGroup[groupId] || {};
        const shift = groupDays[dateStr] || 'rest';
        row.push(this.getShiftLabel(shift));

        if (shift !== 'rest') {
          groupSheet.colorMap.push({
            row: rowIndex,
            col: colIndex + 2, // +2 por Fecha y Día
            color: Utils.getGroupColor(groupId),
            groupId: groupId
          });
        }
      });

      groupSheet.data.push(row);
      currentDate1.setDate(currentDate1.getDate() + 1);
      rowIndex++;
    }

    sheets.push(groupSheet);

    // Hoja 2: Vista por Turnos
    const shiftSheet = {
      name: 'Vista por Turnos',
      headers: ['Fecha', 'Día Semana', 'Mañana', 'Tarde', 'Noche'],
      data: [],
      colorMap: []
    };

    const currentDate2 = new Date(start);
    while (currentDate2 <= end) {
      const y = currentDate2.getFullYear();
      const m = String(currentDate2.getMonth() + 1).padStart(2, '0');
      const d = String(currentDate2.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dayName = this.getDayName(currentDate2);

      const dayGroups = [];
      const afternoonGroups = [];
      const nightGroups = [];

      allGroups.forEach(groupId => {
        const groupDays = state.manualDaysByGroup[groupId] || {};
        const shift = groupDays[dateStr];
        const displayName = ConfigService.getGroupDisplayName(groupId, state.groupNames);

        if (shift === 'day') dayGroups.push(displayName);
        if (shift === 'afternoon') afternoonGroups.push(displayName);
        if (shift === 'night') nightGroups.push(displayName);
      });

      shiftSheet.data.push([
        dateStr,
        dayName,
        dayGroups.join(', ') || '-',
        afternoonGroups.join(', ') || '-',
        nightGroups.join(', ') || '-'
      ]);

      currentDate2.setDate(currentDate2.getDate() + 1);
    }

    sheets.push(shiftSheet);

    return sheets;
  },

  /**
   * Preparar hojas XLSX para modo automático
   */
  prepareAutoXLSXSheets: function(state, calendar, byGroup, start, end, allGroups) {
    const sheets = [];

    // Hoja 1: Configuración
    const configSheet = {
      name: 'Configuración',
      headers: [],
      data: [
        ['Fecha Inicio', state.startDate],
        ['Fecha Fin', state.endDate],
        ['Máximo Grupos por Turno', state.maxGroupsPerShift],
        ['Mínimo Domingos Libres/Mes', state.rules.minFreeSundaysPerMonth],
        ['Máximo Días Consecutivos', state.rules.maxConsecutiveWorkDays],
        ['', ''],
        ['Asignaciones de Turnos', ''],
        ['Turno', 'Grupo', 'Ciclo 1', 'Ciclo 2', 'Offset']
      ],
      colorMap: []
    };

    ['day', 'afternoon', 'night'].forEach(shift => {
      state.shiftAssignments[shift].forEach(a => {
        configSheet.data.push([
          this.getShiftLabel(shift),
          ConfigService.getGroupDisplayName(a.groupId, state.groupNames),
          a.cycle1,
          a.cycle2 || '-',
          a.startOffset || 0
        ]);
      });
    });

    sheets.push(configSheet);

    // Hoja 2: Vista por Turnos
    const shiftSheet = {
      name: 'Vista por Turnos',
      headers: ['Fecha', 'Día Semana', 'Mañana', 'Tarde', 'Noche'],
      data: [],
      colorMap: []
    };

    for (let i = 0; i < calendar.day.length; i++) {
      const dayEntry = calendar.day[i];
      const afternoonEntry = calendar.afternoon[i];
      const nightEntry = calendar.night[i];

      const dayGroups = dayEntry.groups
        .filter(g => g.isWorking)
        .map(g => ConfigService.getGroupDisplayName(g.groupId, state.groupNames))
        .join(', ') || '-';

      const afternoonGroups = afternoonEntry.groups
        .filter(g => g.isWorking)
        .map(g => ConfigService.getGroupDisplayName(g.groupId, state.groupNames))
        .join(', ') || '-';

      const nightGroups = nightEntry.groups
        .filter(g => g.isWorking)
        .map(g => ConfigService.getGroupDisplayName(g.groupId, state.groupNames))
        .join(', ') || '-';

      const date = new Date(dayEntry.date);
      const dayName = this.getDayName(date);

      shiftSheet.data.push([dayEntry.date, dayName, dayGroups, afternoonGroups, nightGroups]);
    }

    sheets.push(shiftSheet);

    // Hoja 3: Vista por Grupos
    const groupSheet = {
      name: 'Vista por Grupos',
      headers: ['Fecha', 'Día Semana'],
      data: [],
      colorMap: []
    };

    allGroups.forEach(g => {
      groupSheet.headers.push(ConfigService.getGroupDisplayName(g, state.groupNames));
    });

    const currentDate = new Date(start);
    let dateIndex = 0;
    let rowIndex = 0;

    while (currentDate <= end) {
      const y = currentDate.getFullYear();
      const m = String(currentDate.getMonth() + 1).padStart(2, '0');
      const d = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dayName = this.getDayName(currentDate);

      const row = [dateStr, dayName];

      allGroups.forEach((groupId, colIndex) => {
        if (byGroup[groupId] && byGroup[groupId][dateIndex]) {
          const entry = byGroup[groupId][dateIndex];
          row.push(this.getShiftLabel(entry.shift));

          if (entry.isWorking) {
            groupSheet.colorMap.push({
              row: rowIndex,
              col: colIndex + 2,
              color: Utils.getGroupColor(groupId),
              groupId: groupId
            });
          }
        } else {
          row.push('Descanso');
        }
      });

      groupSheet.data.push(row);
      currentDate.setDate(currentDate.getDate() + 1);
      dateIndex++;
      rowIndex++;
    }

    sheets.push(groupSheet);

    return sheets;
  },

  /**
   * Obtener nombre del día en español
   */
  getDayName: function(date) {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[date.getDay()];
  },

  /**
   * Obtener etiqueta de turno
   */
  getShiftLabel: function(shift) {
    const labels = {
      'day': 'Mañana',
      'afternoon': 'Tarde',
      'night': 'Noche',
      'rest': 'Descanso'
    };
    return labels[shift] || shift;
  }
};
