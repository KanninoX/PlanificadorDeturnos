/**
 * Utilidades compartidas
 */

const Utils = {
  /**
   * Obtener spreadsheet principal
   */
  getSpreadsheet: function() {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  },

  /**
   * Obtener hoja por nombre
   */
  getSheet: function(sheetName) {
    const ss = this.getSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);

    // Si no existe, crearla
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    return sheet;
  },

  /**
   * Convertir array de objetos a array 2D para Sheets
   */
  objectsToArray: function(objects, headers) {
    if (!objects || objects.length === 0) {
      return [headers];
    }

    const rows = [headers];
    objects.forEach(obj => {
      const row = headers.map(header => obj[header] || '');
      rows.push(row);
    });

    return rows;
  },

  /**
   * Convertir array 2D de Sheets a array de objetos
   */
  arrayToObjects: function(data) {
    if (!data || data.length < 2) {
      return [];
    }

    const headers = data[0];
    const rows = data.slice(1);

    return rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    }).filter(obj => {
      // Filtrar filas vacías
      return Object.values(obj).some(val => val !== '' && val != null);
    });
  },

  /**
   * Colores de grupos en formato HEX
   */
  groupColorsHex: {
    '1': '#a855f7',   // purple-500
    '2': '#ec4899',   // pink-500
    '3': '#3b82f6',   // blue-500
    '4': '#10b981',   // green-500
    'A2': '#f59e0b',  // amber-500
    'B2': '#06b6d4',  // cyan-500
    'C2': '#f43f5e',  // rose-500
    'D2': '#14b8a6'   // teal-500
  },

  /**
   * Obtener color HEX de un grupo
   */
  getGroupColor: function(groupId) {
    return this.groupColorsHex[groupId] || '#6b7280'; // gray-500 por defecto
  },

  /**
   * Formatear fecha a YYYY-MM-DD
   */
  formatDate: function(date) {
    if (typeof date === 'string') {
      return date;
    }
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Parsear fecha desde string
   */
  parseDate: function(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  },

  /**
   * Generar ID único
   */
  generateId: function() {
    return 'G' + Date.now().toString(36);
  },

  /**
   * Clonar objeto profundamente
   */
  clone: function(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Calcular días en un mes
   */
  daysInMonth: function(yyyyMM) {
    const [year, month] = yyyyMM.split('-').map(Number);
    const count = new Date(year, month, 0).getDate();
    const days = [];

    for (let d = 1; d <= count; d++) {
      const dateStr = `${yyyyMM}-${String(d).padStart(2, '0')}`;
      const date = new Date(year, month - 1, d);
      days.push({
        date: dateStr,
        js: date,
        isSunday: date.getDay() === 0
      });
    }

    return days;
  },

  /**
   * Tupla de ciclo (ej: '4x3' => [4, 3])
   */
  cycleTuple: function(cycleType) {
    const cycles = {
      '4x3': [4, 3],
      '5x2': [5, 2],
      '6x1': [6, 1],
      '6x': [6, 0]
    };
    return cycles[cycleType] || [0, 0];
  },

  /**
   * Validar que el spreadsheet esté configurado
   */
  validateSpreadsheet: function() {
    if (SPREADSHEET_ID === 'TU_SPREADSHEET_ID_AQUI') {
      throw new Error('Por favor configura SPREADSHEET_ID en Code.gs con el ID de tu Google Spreadsheet');
    }

    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      return true;
    } catch (e) {
      throw new Error('No se puede acceder al Spreadsheet. Verifica el ID y los permisos.');
    }
  },

  /**
   * Limpiar y preparar hoja
   */
  clearSheet: function(sheet) {
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow > 0 && lastCol > 0) {
      sheet.getRange(1, 1, lastRow, lastCol).clearContent().clearFormat();
    }
  },

  /**
   * Escribir datos en hoja con formato
   */
  writeToSheet: function(sheet, data, startRow = 1, startCol = 1) {
    if (!data || data.length === 0) {
      return;
    }

    const numRows = data.length;
    const numCols = data[0].length;

    sheet.getRange(startRow, startCol, numRows, numCols).setValues(data);
  },

  /**
   * Aplicar formato de encabezado
   */
  formatHeader: function(sheet, row = 1, numCols = null) {
    const lastCol = numCols || sheet.getLastColumn();

    sheet.getRange(row, 1, 1, lastCol)
      .setBackground('#1f2937')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
  },

  /**
   * Log con timestamp
   */
  log: function(message, data = null) {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] ${message}`;

    if (data) {
      logMessage += '\n' + JSON.stringify(data, null, 2);
    }

    Logger.log(logMessage);
  }
};
