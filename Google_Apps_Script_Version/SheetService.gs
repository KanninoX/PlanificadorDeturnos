/**
 * Servicio para operaciones con Google Sheets
 * Maneja la persistencia de datos en el Spreadsheet
 */

const SheetService = {
  /**
   * Leer configuración general
   */
  readConfig: function() {
    const sheet = Utils.getSheet('Config');
    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      // Inicializar con valores por defecto
      return this.initializeConfig();
    }

    const config = {};
    data.forEach(row => {
      if (row[0] && row[1] !== '') {
        config[row[0]] = row[1];
      }
    });

    // Convertir fechas a strings si son objetos Date
    const formatDateValue = (value) => {
      if (!value) return null;
      if (value instanceof Date) {
        return Utils.formatDate(value);
      }
      if (typeof value === 'string') {
        // Si ya es string, asegurar formato YYYY-MM-DD
        if (value.includes('T')) {
          return value.split('T')[0];
        }
        return value;
      }
      return value;
    };

    return {
      startDate: formatDateValue(config.startDate) || '2025-10-01',
      endDate: formatDateValue(config.endDate) || '2027-09-30',
      selectedMonth: formatDateValue(config.selectedMonth) || null,
      maxGroupsPerShift: parseInt(config.maxGroupsPerShift) || 4,
      minFreeSundaysPerMonth: parseInt(config.minFreeSundaysPerMonth) || 2,
      maxConsecutiveWorkDays: parseInt(config.maxConsecutiveWorkDays) || 6,
      manualMode: config.manualMode === 'true' || config.manualMode === true,
      selectedShiftType: config.selectedShiftType || null,
      selectedGroupId: config.selectedGroupId || null
    };
  },

  /**
   * Escribir configuración general
   */
  writeConfig: function(config) {
    const sheet = Utils.getSheet('Config');
    Utils.clearSheet(sheet);

    // Asegurar que las fechas sean strings
    const ensureString = (value) => {
      if (!value) return '';
      if (value instanceof Date) return Utils.formatDate(value);
      return String(value);
    };

    const data = [
      ['Parámetro', 'Valor'],
      ['startDate', ensureString(config.startDate)],
      ['endDate', ensureString(config.endDate)],
      ['selectedMonth', ensureString(config.selectedMonth)],
      ['maxGroupsPerShift', config.maxGroupsPerShift],
      ['minFreeSundaysPerMonth', config.minFreeSundaysPerMonth],
      ['maxConsecutiveWorkDays', config.maxConsecutiveWorkDays],
      ['manualMode', config.manualMode],
      ['selectedShiftType', config.selectedShiftType || ''],
      ['selectedGroupId', config.selectedGroupId || '']
    ];

    Utils.writeToSheet(sheet, data);
    Utils.formatHeader(sheet, 1, 2);
  },

  /**
   * Inicializar configuración por defecto
   */
  initializeConfig: function() {
    const defaultConfig = {
      startDate: '2025-10-01',
      endDate: '2027-09-30',
      selectedMonth: null,
      maxGroupsPerShift: 4,
      minFreeSundaysPerMonth: 2,
      maxConsecutiveWorkDays: 6,
      manualMode: false,
      selectedShiftType: null,
      selectedGroupId: null
    };

    this.writeConfig(defaultConfig);
    return defaultConfig;
  },

  /**
   * Leer grupos
   */
  readGroups: function() {
    const sheet = Utils.getSheet('Groups');
    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      // Inicializar con grupos por defecto
      return this.initializeGroups();
    }

    const groups = [];
    const groupNames = {};

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) {
        const groupId = String(row[0]);
        groups.push(groupId);
        groupNames[groupId] = row[1] || `Grupo ${groupId}`;
      }
    }

    return { groups, groupNames };
  },

  /**
   * Escribir grupos
   */
  writeGroups: function(groups, groupNames) {
    const sheet = Utils.getSheet('Groups');
    Utils.clearSheet(sheet);

    const data = [['GroupID', 'Name', 'Color']];

    groups.forEach(groupId => {
      data.push([
        groupId,
        groupNames[groupId] || `Grupo ${groupId}`,
        Utils.getGroupColor(groupId)
      ]);
    });

    Utils.writeToSheet(sheet, data);
    Utils.formatHeader(sheet, 1, 3);

    // Aplicar colores a las celdas
    for (let i = 0; i < groups.length; i++) {
      const row = i + 2;
      const color = Utils.getGroupColor(groups[i]);
      sheet.getRange(row, 3).setBackground(color).setFontColor('#ffffff');
    }
  },

  /**
   * Inicializar grupos por defecto
   */
  initializeGroups: function() {
    const groups = ['1', '2', '3', '4', 'A2', 'B2', 'C2', 'D2'];
    const groupNames = {
      '1': 'Grupo 1',
      '2': 'Grupo 2',
      '3': 'Grupo 3',
      '4': 'Grupo 4',
      'A2': 'Grupo A2',
      'B2': 'Grupo B2',
      'C2': 'Grupo C2',
      'D2': 'Grupo D2'
    };

    this.writeGroups(groups, groupNames);
    return { groups, groupNames };
  },

  /**
   * Leer asignaciones automáticas
   */
  readShiftAssignments: function() {
    const sheet = Utils.getSheet('ShiftAssignments_Auto');
    const data = sheet.getDataRange().getValues();

    const assignments = {
      day: [],
      afternoon: [],
      night: []
    };

    if (data.length < 2) {
      // Inicializar con asignaciones por defecto
      return this.initializeShiftAssignments();
    }

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) {
        const shift = row[0];
        const assignment = {
          groupId: String(row[1]),
          cycle1: row[2] || '4x3',
          cycle2: row[3] || null,
          cycle1Repeat: parseInt(row[4]) || 1,
          cycle2Repeat: parseInt(row[5]) || 1,
          startOffset: parseInt(row[6]) || 0
        };

        if (assignments[shift]) {
          assignments[shift].push(assignment);
        }
      }
    }

    return assignments;
  },

  /**
   * Escribir asignaciones automáticas
   */
  writeShiftAssignments: function(assignments) {
    const sheet = Utils.getSheet('ShiftAssignments_Auto');
    Utils.clearSheet(sheet);

    const data = [['Shift', 'GroupID', 'Cycle1', 'Cycle2', 'Cycle1Repeat', 'Cycle2Repeat', 'StartOffset']];

    ['day', 'afternoon', 'night'].forEach(shift => {
      if (assignments[shift]) {
        assignments[shift].forEach(assignment => {
          data.push([
            shift,
            assignment.groupId,
            assignment.cycle1,
            assignment.cycle2 || '',
            assignment.cycle1Repeat,
            assignment.cycle2Repeat,
            assignment.startOffset
          ]);
        });
      }
    });

    Utils.writeToSheet(sheet, data);
    Utils.formatHeader(sheet, 1, 7);
  },

  /**
   * Inicializar asignaciones por defecto
   */
  initializeShiftAssignments: function() {
    const assignments = {
      day: [{ groupId: '1', cycle1: '6x1', cycle2: null, cycle1Repeat: 1, cycle2Repeat: 1, startOffset: 0 }],
      afternoon: [{ groupId: '2', cycle1: '6x1', cycle2: null, cycle1Repeat: 1, cycle2Repeat: 1, startOffset: 0 }],
      night: [{ groupId: '3', cycle1: '5x2', cycle2: null, cycle1Repeat: 1, cycle2Repeat: 1, startOffset: 0 }]
    };

    this.writeShiftAssignments(assignments);
    return assignments;
  },

  /**
   * Leer asignaciones manuales por grupo
   */
  readManualDays: function() {
    const sheet = Utils.getSheet('ManualDays');
    const data = sheet.getDataRange().getValues();

    const manualDaysByGroup = {};

    if (data.length < 2) {
      return {};
    }

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] && row[1]) {
        const groupId = String(row[0]);
        const date = row[1];
        const shift = row[2];

        if (!manualDaysByGroup[groupId]) {
          manualDaysByGroup[groupId] = {};
        }

        manualDaysByGroup[groupId][date] = shift;
      }
    }

    return manualDaysByGroup;
  },

  /**
   * Escribir asignaciones manuales
   */
  writeManualDays: function(manualDaysByGroup) {
    const sheet = Utils.getSheet('ManualDays');
    Utils.clearSheet(sheet);

    const data = [['GroupID', 'Date', 'Shift']];

    Object.keys(manualDaysByGroup).forEach(groupId => {
      const groupDays = manualDaysByGroup[groupId];
      Object.keys(groupDays).forEach(date => {
        const shift = groupDays[date];
        if (shift && shift !== 'rest') {
          data.push([groupId, date, shift]);
        }
      });
    });

    Utils.writeToSheet(sheet, data);
    Utils.formatHeader(sheet, 1, 3);
  },

  /**
   * Leer historial para Undo/Redo
   */
  readHistory: function() {
    const sheet = Utils.getSheet('History');
    const data = sheet.getDataRange().getValues();

    const history = [];

    if (data.length < 2) {
      return [];
    }

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) {
        history.push({
          timestamp: row[0],
          action: row[1],
          state: row[2] ? JSON.parse(row[2]) : null
        });
      }
    }

    return history;
  },

  /**
   * Agregar al historial
   */
  appendHistory: function(action, state) {
    const sheet = Utils.getSheet('History');
    const lastRow = sheet.getLastRow();

    // Mantener solo últimos 50 registros
    if (lastRow > 50) {
      sheet.deleteRow(2);
    }

    sheet.appendRow([
      new Date(),
      action,
      JSON.stringify(state)
    ]);
  },

  /**
   * Eliminar última entrada del historial
   */
  removeLastHistory: function() {
    const sheet = Utils.getSheet('History');
    const lastRow = sheet.getLastRow();

    if (lastRow > 1) {
      const data = sheet.getRange(lastRow, 1, 1, 3).getValues()[0];
      sheet.deleteRow(lastRow);
      return {
        timestamp: data[0],
        action: data[1],
        state: data[2] ? JSON.parse(data[2]) : null
      };
    }

    return null;
  }
};
