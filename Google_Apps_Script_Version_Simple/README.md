# Planificador de Turnos Industrial - Google Apps Script

Esta es tu aplicación HTML original adaptada para usar Google Sheets como backend en lugar de localStorage.

## ✨ Características

- **Mismo diseño hermoso**: Glass morphism, gradientes, animaciones
- **Misma funcionalidad**: Drag & drop, modos automático/manual, exportación
- **Persistencia en la nube**: Usa Google Sheets en lugar de localStorage del navegador
- **Multi-dispositivo**: Accede desde cualquier lugar con tu cuenta de Google

## 📦 Archivos

```
Google_Apps_Script_Version_Simple/
├── Code.gs              # Backend de Google Apps Script
├── Index.html          # Tu aplicación HTML (adaptada)
├── appsscript.json     # Configuración del proyecto
└── README.md           # Este archivo
```

## 🚀 Instrucciones de Deployment

### Paso 1: Crear Google Spreadsheet

1. Ve a https://sheets.google.com
2. Crea una nueva hoja de cálculo
3. Copia el ID del Spreadsheet de la URL:
   ```
   https://docs.google.com/spreadsheets/d/TU_ID_AQUI/edit
   ```

### Paso 2: Crear Proyecto de Google Apps Script

1. Ve a https://script.google.com
2. Click en **"Nuevo proyecto"**
3. Ponle un nombre: "Planificador de Turnos"

### Paso 3: Subir los archivos

#### Code.gs

1. En el editor, verás un archivo `Code.gs`
2. Borra todo el contenido
3. Copia y pega el contenido de `Code.gs` de esta carpeta
4. **IMPORTANTE**: En la línea 7, reemplaza `'TU_SPREADSHEET_ID_AQUI'` con el ID que copiaste en el Paso 1:
   ```javascript
   const SPREADSHEET_ID = 'TU_ID_REAL_AQUI';
   ```

#### Index.html

1. Click en el botón **+** al lado de "Archivos"
2. Selecciona **"HTML"**
3. Nómbralo **`Index`** (sin extensión .html)
4. Copia y pega todo el contenido de `Index.html` de esta carpeta

#### appsscript.json

1. En el menú izquierdo, click en **"Configuración del proyecto"** (⚙️)
2. Marca la casilla **"Mostrar archivo de manifiesto 'appsscript.json' en el editor"**
3. Vuelve al editor
4. Click en `appsscript.json`
5. Reemplaza con el contenido de `appsscript.json` de esta carpeta

### Paso 4: Implementar como Web App

1. Click en el botón **"Implementar"** (arriba a la derecha)
2. Selecciona **"Nueva implementación"**
3. Click en el engranaje ⚙️ al lado de "Selecciona tipo"
4. Selecciona **"Aplicación web"**
5. Configura:
   - **Descripción**: "Planificador v1.0"
   - **Ejecutar como**: "Yo (tu correo)"
   - **Quién tiene acceso**: "Solo yo" o "Cualquiera"
6. Click en **"Implementar"**
7. **COPIA LA URL** de la aplicación web
8. Click en **"Listo"**

### Paso 5: Autorizar permisos

1. La primera vez que abras la URL, Google pedirá permisos
2. Click en **"Revisar permisos"**
3. Selecciona tu cuenta de Google
4. Click en **"Avanzado"**
5. Click en **"Ir a Planificador de Turnos (no seguro)"**
6. Click en **"Permitir"**

## 🎉 ¡Listo!

Abre la URL de tu aplicación web y verás tu sistema funcionando con:

- ✅ Tu diseño original hermoso
- ✅ Todos los grupos y turnos
- ✅ Drag & drop funcional
- ✅ Guardado en Google Sheets (botón 💾)
- ✅ Carga desde Google Sheets (botón 📂)
- ✅ Autoguardado automático
- ✅ Exportación a Excel

## 🔧 Diferencias con la versión local

### ¿Qué cambió?

**NADA en el diseño o funcionalidad visual**. Solo el backend:

- ❌ `localStorage.setItem()` → ✅ `saveToSheets()`
- ❌ `localStorage.getItem()` → ✅ `loadFromSheets()`

### ¿Qué sigue igual?

- ✅ Mismo HTML
- ✅ Mismo CSS
- ✅ Mismos estilos
- ✅ Mismo JavaScript (99.9%)
- ✅ Mismas funciones
- ✅ Misma UX

## 📝 Uso

1. **Modo Automático**: Configura grupos, asigna a turnos, calcula calendario
2. **Modo Manual**: Construye turnos día por día
3. **Guardar**: Click en 💾 para guardar en Google Sheets
4. **Cargar**: Click en 📂 para cargar configuración guardada
5. **Exportar**: Click en "Exportar Excel" para descargar

## 🔄 Actualizar la aplicación

Si haces cambios:

1. Edita los archivos en Google Apps Script
2. Guarda (Ctrl+S)
3. **No necesitas re-deployar** - los cambios son inmediatos
4. Solo recarga la página de la app

## ❓ Troubleshooting

### La app se queda en "Cargando"

- Verifica que el `SPREADSHEET_ID` sea correcto
- Revisa los logs: Ver → Registros (Ctrl+Enter)

### Error "Cannot read properties of null"

- Asegúrate de haber autorizado los permisos
- Revisa que los 3 archivos estén cargados correctamente

### Los cambios no se guardan

- Click manualmente en el botón 💾
- El autoguardado funciona, pero es silencioso

## 📞 Soporte

Si algo no funciona, revisa:

1. La consola del navegador (F12)
2. Los logs de Google Apps Script (Ver → Registros)
3. Que el SPREADSHEET_ID sea correcto

---

**Hecho con ❤️ - Mantiene tu diseño original hermoso, solo cambia el storage**
