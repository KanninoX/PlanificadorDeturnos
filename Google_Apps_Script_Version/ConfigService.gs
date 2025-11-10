/**
 * Servicio de Configuración
 * Gestiona el estado de la aplicación y operaciones de configuración
 */

const ConfigService = {
  /**
   * Cargar estado completo desde Sheets
   */
  loadState: function() {
    Utils.validateSpreadsheet();

    const config = SheetService.readConfig();
    const { groups, groupNames } = SheetService.readGroups();
    const shiftAssignments = SheetService.readShiftAssignments();
    const manualDaysByGroup = SheetService.readManualDays();

    return {
      startDate: config.startDate,
      endDate: config.endDate,
      selectedMonth: config.selectedMonth,
      maxGroupsPerShift: config.maxGroupsPerShift,
      groups: groups,
      groupNames: groupNames,
      shiftAssignments: shiftAssignments,
      rules: {
        minFreeSundaysPerMonth: config.minFreeSundaysPerMonth,
        maxConsecutiveWorkDays: config.maxConsecutiveWorkDays
      },
      manualMode: config.manualMode,
      selectedShiftType: config.selectedShiftType,
      selectedGroupId: config.selectedGroupId,
      manualDaysByGroup: manualDaysByGroup,
      manualAssignments: {
        day: [],
        afternoon: [],
        night: []
      },
      manualDays: {}  // Compatibilidad con código legacy
    };
  },

  /**
   * Guardar estado completo en Sheets
   */
  saveState: function(state) {
    Utils.validateSpreadsheet();

    // Guardar configuración general
    const config = {
      startDate: state.startDate,
      endDate: state.endDate,
      selectedMonth: state.selectedMonth,
      maxGroupsPerShift: state.maxGroupsPerShift,
      minFreeSundaysPerMonth: state.rules.minFreeSundaysPerMonth,
      maxConsecutiveWorkDays: state.rules.maxConsecutiveWorkDays,
      manualMode: state.manualMode,
      selectedShiftType: state.selectedShiftType,
      selectedGroupId: state.selectedGroupId
    };

    SheetService.writeConfig(config);

    // Guardar grupos
    SheetService.writeGroups(state.groups, state.groupNames);

    // Guardar asignaciones según el modo
    if (state.manualMode) {
      SheetService.writeManualDays(state.manualDaysByGroup || {});
    } else {
      SheetService.writeShiftAssignments(state.shiftAssignments);
    }

    Utils.log('Estado guardado correctamente');

    return { success: true, message: 'Configuración guardada' };
  },

  /**
   * Agregar nuevo grupo
   */
  addGroup: function(groupData) {
    const state = this.loadState();

    const newGroupId = groupData.groupId || Utils.generateId();

    state.groups.push(newGroupId);
    state.groupNames[newGroupId] = groupData.name || `Grupo ${state.groups.length}`;

    // Inicializar calendario manual vacío para el nuevo grupo
    if (!state.manualDaysByGroup[newGroupId]) {
      state.manualDaysByGroup[newGroupId] = {};
    }

    this.saveState(state);

    return {
      success: true,
      groupId: newGroupId,
      name: state.groupNames[newGroupId]
    };
  },

  /**
   * Eliminar grupo
   */
  deleteGroup: function(groupId) {
    const state = this.loadState();

    // Eliminar del array de grupos
    state.groups = state.groups.filter(g => g !== groupId);

    // Eliminar del objeto de nombres
    if (state.groupNames[groupId]) {
      delete state.groupNames[groupId];
    }

    // Eliminar turnos manuales del grupo
    if (state.manualDaysByGroup[groupId]) {
      delete state.manualDaysByGroup[groupId];
    }

    // Eliminar asignaciones en modo automático
    ['day', 'afternoon', 'night'].forEach(shift => {
      state.shiftAssignments[shift] = state.shiftAssignments[shift].filter(
        assignment => assignment.groupId !== groupId
      );
    });

    this.saveState(state);

    return { success: true, message: `Grupo ${groupId} eliminado` };
  },

  /**
   * Editar nombre de grupo
   */
  editGroupName: function(groupId, newName) {
    const state = this.loadState();

    if (!state.groupNames[groupId]) {
      throw new Error(`Grupo ${groupId} no encontrado`);
    }

    state.groupNames[groupId] = newName.trim();

    this.saveState(state);

    return { success: true, name: state.groupNames[groupId] };
  },

  /**
   * Guardar en historial para Undo
   */
  saveHistory: function(action, stateBefore) {
    SheetService.appendHistory(action, stateBefore);
    return { success: true };
  },

  /**
   * Deshacer
   */
  undo: function() {
    const historyEntry = SheetService.removeLastHistory();

    if (!historyEntry || !historyEntry.state) {
      return { success: false, message: 'No hay cambios para deshacer' };
    }

    // Restaurar estado anterior
    this.saveState(historyEntry.state);

    return {
      success: true,
      message: 'Cambio deshecho',
      state: historyEntry.state
    };
  },

  /**
   * Rehacer (nota: implementación básica, requiere stack separado para funcionalidad completa)
   */
  redo: function() {
    // TODO: Implementar stack de redo completo si es necesario
    return { success: false, message: 'Función de rehacer no disponible aún' };
  },

  /**
   * Limpiar todo el calendario manual
   */
  clearManualCalendar: function() {
    const state = this.loadState();

    // Limpiar todos los grupos
    state.groups.forEach(groupId => {
      state.manualDaysByGroup[groupId] = {};
    });

    state.manualDays = {};

    this.saveState(state);

    return { success: true, message: 'Calendario manual limpiado' };
  },

  /**
   * Limpiar calendario de un grupo específico
   */
  clearGroupCalendar: function(groupId) {
    const state = this.loadState();

    if (state.manualDaysByGroup[groupId]) {
      state.manualDaysByGroup[groupId] = {};
    }

    this.saveState(state);

    return {
      success: true,
      message: `Calendario del grupo ${state.groupNames[groupId] || groupId} limpiado`
    };
  },

  /**
   * Obtener nombres de grupos para visualización
   */
  getGroupDisplayName: function(groupId, groupNames) {
    return groupNames[groupId] || `Grupo ${groupId}`;
  }
};
