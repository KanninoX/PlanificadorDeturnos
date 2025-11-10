/**
 * Planificador de Turnos Industrial - Google Apps Script
 * Entry Point y API Endpoints
 */

// CONFIGURACIÓN - Cambiar este ID por el de tu spreadsheet
const SPREADSHEET_ID = 'TU_SPREADSHEET_ID_AQUI';

/**
 * Servir la aplicación web
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');

  return template.evaluate()
    .setTitle('Planificador de Turnos Industrial')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Incluir archivos HTML/CSS/JS en la página principal
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Wrapper para ejecución segura de funciones
 */
function safeExecute(fn) {
  try {
    const result = fn();
    return { success: true, data: result };
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    return {
      success: false,
      error: error.message || error.toString(),
      stack: error.stack
    };
  }
}

// ==================== API ENDPOINTS ====================

/**
 * Obtener estado inicial completo
 */
function getInitialState() {
  return safeExecute(() => {
    return ConfigService.loadState();
  });
}

/**
 * Guardar configuración completa
 */
function saveConfiguration(state) {
  return safeExecute(() => {
    return ConfigService.saveState(state);
  });
}

/**
 * Calcular calendario (automático o manual según modo)
 */
function calculateSchedule(state) {
  return safeExecute(() => {
    if (state.manualMode) {
      return EngineService.buildManualCalendar(state);
    } else {
      return EngineService.buildEngine(state);
    }
  });
}

/**
 * Exportar calendario a Google Sheet formateado
 */
function exportSchedule(mode, state) {
  return safeExecute(() => {
    return ExportService.exportData(mode, state);
  });
}

/**
 * Agregar nuevo grupo
 */
function addGroup(groupData) {
  return safeExecute(() => {
    return ConfigService.addGroup(groupData);
  });
}

/**
 * Eliminar grupo
 */
function deleteGroup(groupId) {
  return safeExecute(() => {
    return ConfigService.deleteGroup(groupId);
  });
}

/**
 * Editar nombre de grupo
 */
function editGroupName(groupId, newName) {
  return safeExecute(() => {
    return ConfigService.editGroupName(groupId, newName);
  });
}

/**
 * Guardar estado en historial para Undo
 */
function saveToHistory(action, stateBefore) {
  return safeExecute(() => {
    return ConfigService.saveHistory(action, stateBefore);
  });
}

/**
 * Deshacer último cambio
 */
function performUndo() {
  return safeExecute(() => {
    return ConfigService.undo();
  });
}

/**
 * Rehacer cambio deshecho
 */
function performRedo() {
  return safeExecute(() => {
    return ConfigService.redo();
  });
}

/**
 * Limpiar calendario manual
 */
function clearManualCalendar() {
  return safeExecute(() => {
    return ConfigService.clearManualCalendar();
  });
}

/**
 * Limpiar calendario de un grupo específico
 */
function clearGroupCalendar(groupId) {
  return safeExecute(() => {
    return ConfigService.clearGroupCalendar(groupId);
  });
}

/**
 * Obtener información del usuario (para debug)
 */
function getUserInfo() {
  return safeExecute(() => {
    return {
      email: Session.getActiveUser().getEmail(),
      timezone: Session.getScriptTimeZone()
    };
  });
}

/**
 * Función de prueba para verificar conexión
 */
function testConnection() {
  return safeExecute(() => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    return {
      spreadsheetName: ss.getName(),
      spreadsheetUrl: ss.getUrl(),
      sheetsCount: ss.getSheets().length
    };
  });
}

/**
 * Inicializar el sistema - EJECUTA ESTO PRIMERO
 * Ve a Extensiones > Apps Script > Selecciona "setupInitial" en el dropdown > Click "Ejecutar"
 */
function setupInitial() {
  try {
    Logger.log('Iniciando setup...');

    // Validar spreadsheet
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log('Spreadsheet encontrado: ' + ss.getName());

    // Inicializar todas las hojas
    Logger.log('Creando hojas necesarias...');

    // Config
    const config = SheetService.readConfig();
    Logger.log('Config inicializada: ' + JSON.stringify(config));

    // Groups
    const groups = SheetService.readGroups();
    Logger.log('Grupos inicializados: ' + JSON.stringify(groups));

    // Shift Assignments
    const shiftAssignments = SheetService.readShiftAssignments();
    Logger.log('Asignaciones inicializadas');

    // Manual Days
    const manualDays = SheetService.readManualDays();
    Logger.log('Días manuales inicializados');

    Logger.log('Setup completado exitosamente!');

    return {
      success: true,
      message: 'Sistema inicializado correctamente',
      spreadsheetUrl: ss.getUrl()
    };
  } catch (error) {
    Logger.log('ERROR en setup: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    throw error;
  }
}
