# Planificador de Turnos Industrial - Google Apps Script

Sistema completo de gestión de turnos industriales con modos automático y manual, migrado a Google Apps Script para funcionamiento web con persistencia en Google Sheets.

## 📋 Características

- **Modo Automático**: Asignación basada en ciclos de trabajo (4x3, 5x2, 6x1, etc.)
- **Modo Manual**: Construcción interactiva día por día con drag & drop
- **Persistencia en Google Sheets**: Todos los datos guardados automáticamente
- **Exportación con Colores**:
  - Exportar a Google Sheet formateado con colores por grupo
  - Exportar a archivo XLSX con colores preservados
- **Sistema Undo/Redo**: Deshacer y rehacer cambios
- **Gestión de Grupos**: Agregar, eliminar y personalizar grupos
- **Interfaz Moderna**: UI responsive con Tailwind CSS

## 🚀 Configuración Inicial

### Paso 1: Crear Google Spreadsheet

1. Ve a [Google Sheets](https://sheets.google.com)
2. Crea un nuevo spreadsheet
3. Ponle un nombre (ej: "Planificador Turnos - Datos")
4. Copia el **ID del Spreadsheet** de la URL:
   ```
   https://docs.google.com/spreadsheets/d/[ESTE_ES_EL_ID]/edit
   ```
   Ejemplo: `1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t`

### Paso 2: Crear Proyecto Google Apps Script

1. Desde tu spreadsheet, ve a **Extensiones > Apps Script**
2. Se abrirá el editor de Apps Script
3. Elimina el código por defecto en `Code.gs`

### Paso 3: Agregar Archivos del Proyecto

Debes crear los siguientes archivos en tu proyecto Apps Script:

#### A) Archivos de Servidor (.gs)

1. **Code.gs** (ya existe, reemplaza el contenido)
   - Copia el contenido de `Code.gs`
   - **IMPORTANTE**: Reemplaza `TU_SPREADSHEET_ID_AQUI` con el ID que copiaste en el Paso 1:
     ```javascript
     const SPREADSHEET_ID = '1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t';
     ```

2. **Utils.gs** (click en + > Script)
   - Copia el contenido completo de `Utils.gs`

3. **SheetService.gs** (click en + > Script)
   - Copia el contenido completo de `SheetService.gs`

4. **ConfigService.gs** (click en + > Script)
   - Copia el contenido completo de `ConfigService.gs`

5. **EngineService.gs** (click en + > Script)
   - Copia el contenido completo de `EngineService.gs`

6. **ExportService.gs** (click en + > Script)
   - Copia el contenido completo de `ExportService.gs`

#### B) Archivos de Cliente (.html)

7. **Index.html** (click en + > HTML)
   - Copia el contenido completo de `Index.html`

8. **Styles.html** (click en + > HTML)
   - Copia el contenido completo de `Styles.html`

9. **ClientScript.html** (click en + > HTML)
   - Copia el contenido completo de `ClientScript.html`

#### C) Configuración del Proyecto

10. **appsscript.json** (click en ⚙️ > "Mostrar archivo de manifiesto appsscript.json")
    - Reemplaza el contenido con el de `appsscript.json`
    - **IMPORTANTE**: Cambia el timezone si es necesario:
      ```json
      "timeZone": "America/Santiago"
      ```

### Paso 4: Configurar Permisos

1. En el editor de Apps Script, ve a **Configuración del proyecto** (⚙️)
2. Marca la casilla **"Mostrar archivo de manifiesto appsscript.json"**
3. Verifica que el archivo `appsscript.json` tenga la configuración correcta

### Paso 5: Desplegar como Web App

1. En el editor de Apps Script, haz click en **Implementar > Nueva implementación**
2. Haz click en el icono ⚙️ junto a "Seleccionar tipo"
3. Selecciona **"Aplicación web"**
4. Configura:
   - **Descripción**: "Planificador de Turnos v1.0"
   - **Ejecutar como**: "Yo (tu correo)"
   - **Quién tiene acceso**:
     - `Cualquier usuario` (para acceso público)
     - `Solo yo` (para uso personal)
     - `Cualquier usuario de [tu dominio]` (para uso interno)
5. Haz click en **Implementar**
6. **Autoriza la aplicación**:
   - Haz click en "Autorizar acceso"
   - Selecciona tu cuenta de Google
   - Si aparece "Esta aplicación no está verificada", haz click en "Avanzado" > "Ir a [nombre del proyecto] (no seguro)"
   - Haz click en "Permitir"
7. Copia la **URL de la aplicación web**

### Paso 6: Probar la Aplicación

1. Abre la URL de la aplicación web en tu navegador
2. Deberías ver la interfaz del Planificador de Turnos
3. La primera vez, se crearán automáticamente las hojas necesarias en tu Spreadsheet:
   - **Config**: Configuración general
   - **Groups**: Grupos de trabajo
   - **ShiftAssignments_Auto**: Asignaciones automáticas
   - **ManualDays**: Turnos manuales
   - **History**: Historial para Undo/Redo

## 📊 Estructura de Datos en Google Sheets

### Hoja: Config
| Parámetro | Valor |
|-----------|-------|
| startDate | 2025-10-01 |
| endDate | 2027-09-30 |
| maxGroupsPerShift | 4 |
| manualMode | false |
| ... | ... |

### Hoja: Groups
| GroupID | Name | Color |
|---------|------|-------|
| 1 | Grupo 1 | #a855f7 |
| 2 | Grupo 2 | #ec4899 |
| ... | ... | ... |

### Hoja: ShiftAssignments_Auto
| Shift | GroupID | Cycle1 | Cycle2 | Cycle1Repeat | Cycle2Repeat | StartOffset |
|-------|---------|--------|--------|--------------|--------------|-------------|
| day | 1 | 6x1 | | 1 | 1 | 0 |
| ... | ... | ... | ... | ... | ... | ... |

### Hoja: ManualDays
| GroupID | Date | Shift |
|---------|------|-------|
| 1 | 2025-10-01 | day |
| 1 | 2025-10-02 | afternoon |
| ... | ... | ... |

### Hoja: History
| Timestamp | Action | State (JSON) |
|-----------|--------|--------------|
| 2025-01-15 10:30:00 | manual_assignment | {...} |
| ... | ... | ... |

## 🔧 Uso de la Aplicación

### Modo Automático

1. **Configurar fechas**: Define fecha de inicio y fin del calendario
2. **Asignar grupos a turnos**:
   - Arrastra grupos desde "Grupos Disponibles" a los turnos (Mañana, Tarde, Noche)
   - Cada grupo tendrá un ciclo de trabajo (ej: 6x1 = 6 días trabajo, 1 día descanso)
3. **Calcular calendario**: Haz click en "Calcular Calendario"
4. **Visualizar**:
   - **Por Turno**: Ver qué grupos trabajan cada día en cada turno
   - **Por Grupo**: Ver calendario individual de cada grupo
5. **Exportar**:
   - **Google Sheet**: Crea una hoja formateada con colores
   - **XLSX**: Descarga archivo Excel con colores preservados

### Modo Manual

1. **Configurar fechas**: Define fecha de inicio y fin
2. **Seleccionar grupo**: Elige el grupo a asignar
3. **Seleccionar turno**: Elige Mañana, Tarde, Noche o Descanso
4. **Asignar días**: Haz click en las celdas del calendario para asignar turnos
5. **Generar calendario**: Haz click en "Generar Calendario"
6. **Visualizar y exportar** igual que en modo automático

### Funciones Adicionales

- **Undo/Redo**: Deshacer y rehacer cambios (disponible en modo manual)
- **Agregar Grupo**: Crear nuevos grupos de trabajo
- **Limpiar Calendario**: Borrar todas las asignaciones manuales
- **Eliminar Grupo**: Borrar un grupo (🗑️ en la tarjeta del grupo)

## 🎨 Colores de Grupos

Los colores están predefinidos para los grupos por defecto:

| Grupo | Color | Hex |
|-------|-------|-----|
| Grupo 1 | Púrpura | #a855f7 |
| Grupo 2 | Rosa | #ec4899 |
| Grupo 3 | Azul | #3b82f6 |
| Grupo 4 | Verde | #10b981 |
| Grupo A2 | Ámbar | #f59e0b |
| Grupo B2 | Cian | #06b6d4 |
| Grupo C2 | Rosa intenso | #f43f5e |
| Grupo D2 | Verde azulado | #14b8a6 |

Puedes modificar los colores editando el objeto `groupColorsHex` en `Utils.gs`.

## 🔄 Actualizar la Aplicación

Si haces cambios en el código:

1. Guarda los cambios en el editor de Apps Script
2. Ve a **Implementar > Administrar implementaciones**
3. Haz click en ✏️ (editar) junto a tu implementación activa
4. Cambia "Versión" a **"Nueva versión"**
5. Agrega una descripción del cambio
6. Haz click en **Implementar**
7. La URL de la aplicación permanece igual, pero ahora usa el código actualizado

## 🐛 Solución de Problemas

### Error: "No se puede acceder al Spreadsheet"

**Solución**: Verifica que el `SPREADSHEET_ID` en `Code.gs` sea correcto

### Error: "Esta aplicación no está verificada"

**Solución**:
1. Haz click en "Avanzado"
2. Haz click en "Ir a [nombre del proyecto] (no seguro)"
3. Autoriza la aplicación

### No se guardan los cambios

**Solución**:
1. Verifica que hayas autorizado la aplicación correctamente
2. Revisa la consola del navegador (F12) para ver errores
3. Verifica que el Spreadsheet existe y tienes permisos de edición

### Las hojas no se crean automáticamente

**Solución**:
1. Abre el Spreadsheet manualmente
2. Desde la aplicación web, haz click en "Guardar Configuración"
3. Las hojas deberían crearse automáticamente

### Error al exportar XLSX

**Solución**: Verifica que el navegador permite descargas y que la librería SheetJS está cargando correctamente (revisa la consola del navegador)

## 📝 Notas Técnicas

- **Librería XLSX**: Se usa SheetJS (xlsx.full.min.js) para exportación client-side
- **Framework CSS**: Tailwind CSS vía CDN
- **Persistencia**: Todos los datos en Google Sheets (no Properties Service)
- **Límites**: Google Apps Script tiene límites de ejecución (6 min por ejecución, quotas diarias)
- **Timezone**: Configurado en `appsscript.json`, ajusta según tu zona horaria

## 🔐 Seguridad y Privacidad

- Todos los datos se almacenan en TU Google Spreadsheet
- Solo tú (o quienes autorices) tienen acceso a los datos
- La aplicación se ejecuta bajo tu cuenta de Google
- No se comparten datos con terceros
- Controla el acceso mediante la configuración de implementación

## 📞 Soporte

Si encuentras problemas:

1. Revisa la sección "Solución de Problemas" arriba
2. Revisa la consola del navegador (F12) para errores JavaScript
3. Revisa "Ver > Registros" en el editor de Apps Script para errores del servidor
4. Verifica que todas las hojas del Spreadsheet estén creadas correctamente

## 📜 Licencia

Este proyecto es de código abierto. Puedes modificarlo y distribuirlo libremente.

---

**Versión**: 1.0
**Última actualización**: Enero 2025
**Desarrollado con**: Google Apps Script, Tailwind CSS, SheetJS
