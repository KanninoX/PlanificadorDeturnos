/**
 * Planificador de Turnos - Backend Simple para Google Apps Script
 * Mantiene el mismo diseño del HTML original, solo cambia el storage
 */

// CONFIGURACIÓN - Cambiar por tu SPREADSHEET_ID
const SPREADSHEET_ID = 'TU_SPREADSHEET_ID_AQUI';
const SHEET_NAME = 'TurnosData';

/**
 * Servir la aplicación web
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Planificador de Turnos Industrial')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Guardar estado completo (reemplaza localStorage.setItem)
 */
function saveState(stateJSON) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);

    // Crear hoja si no existe
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    // Limpiar y guardar
    sheet.clear();
    sheet.getRange(1, 1).setValue('STATE_JSON');
    sheet.getRange(2, 1).setValue(stateJSON);
    sheet.getRange(3, 1).setValue(new Date().toISOString()); // timestamp

    return { success: true, message: 'Estado guardado correctamente' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Cargar estado completo (reemplaza localStorage.getItem)
 */
function loadState() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet || sheet.getLastRow() < 2) {
      return { success: false, message: 'No hay estado guardado' };
    }

    const stateJSON = sheet.getRange(2, 1).getValue();

    if (!stateJSON) {
      return { success: false, message: 'Estado vacío' };
    }

    return { success: true, data: stateJSON };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Verificar conexión
 */
function testConnection() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    return {
      success: true,
      spreadsheetName: ss.getName(),
      spreadsheetUrl: ss.getUrl()
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
