export type ModulePermissions = {
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
};

export type RolePermissions = Record<string, ModulePermissions>;

export const ALL_MODULES = [
  { id: 'inicio', label: 'Inicio', defaultPerms: { ver: true, crear: false, editar: false, eliminar: false } },
  { id: 'dashboard', label: 'Dashboard', defaultPerms: { ver: false, crear: false, editar: false, eliminar: false } },
  { id: 'tareas', label: 'Tareas', defaultPerms: { ver: false, crear: false, editar: false, eliminar: false } },
  { id: 'recordatorios', label: 'Recordatorios', defaultPerms: { ver: false, crear: false, editar: false, eliminar: false } },
  { id: 'proyectos', label: 'Proyectos', defaultPerms: { ver: false, crear: false, editar: false, eliminar: false } },
  { id: 'contable', label: 'Contable', defaultPerms: { ver: false, crear: false, editar: false, eliminar: false } },
  { id: 'crm', label: 'CRM / Clientes', defaultPerms: { ver: false, crear: false, editar: false, eliminar: false } },
  { id: 'oportunidades', label: 'Oportunidades', defaultPerms: { ver: false, crear: false, editar: false, eliminar: false } },
  { id: 'cotizaciones', label: 'Cotizaciones', defaultPerms: { ver: false, crear: false, editar: false, eliminar: false } },
  { id: 'facturacion', label: 'Facturación', defaultPerms: { ver: false, crear: false, editar: false, eliminar: false } },
  { id: 'cuentas-por-pagar', label: 'Cuentas por Pagar', defaultPerms: { ver: false, crear: false, editar: false, eliminar: false } },
  { id: 'lineas-productos', label: 'Catálogo / Líneas', defaultPerms: { ver: false, crear: false, editar: false, eliminar: false } },
  { id: 'configuracion', label: 'Configuración', defaultPerms: { ver: false, crear: false, editar: false, eliminar: false } },
];

/**
 * Parsea el campo de permisos de la base de datos (Json) al formato esperado.
 */
export function parsePermissions(rawPerms: any): RolePermissions {
  if (!rawPerms) return {};
  
  // En caso de que se pase un string (JSON sin parsear)
  let parsed = rawPerms;
  if (typeof rawPerms === 'string') {
    try {
      parsed = JSON.parse(rawPerms);
    } catch (e) {
      return {};
    }
  }

  // Compatibilidad hacia atrás: Si el permiso es un array de strings (ej: ["inicio", "tareas"])
  if (Array.isArray(parsed)) {
    const migrated: RolePermissions = {};
    parsed.forEach(mod => {
      if (typeof mod === 'string') {
        migrated[mod] = { ver: true, crear: true, editar: true, eliminar: true };
      }
    });
    return migrated;
  }

  return parsed as RolePermissions;
}

/**
 * Verifica si el usuario es SUPERADMIN
 */
export function isSuperAdmin(profile: any): boolean {
  return profile?.rol === 'SUPERADMIN';
}

/**
 * Verifica si un usuario tiene un permiso específico para un módulo.
 * Si es SUPERADMIN, siempre devuelve true.
 */
export function hasPermission(
  profile: any, 
  moduleId: string, 
  action: keyof ModulePermissions = 'ver'
): boolean {
  if (isSuperAdmin(profile)) return true;
  
  const permisos = parsePermissions(profile?.app_role?.permisos);
  const modPerms = permisos[moduleId];
  
  if (!modPerms) return false;
  
  // Si la acción existe en el objeto, la devolvemos, de lo contrario false
  return !!modPerms[action];
}

/**
 * Obtiene la lista de módulos visibles para el usuario
 */
export function getVisibleModules(profile: any): string[] {
  if (isSuperAdmin(profile)) {
    return ALL_MODULES.map(m => m.id);
  }

  const permisos = parsePermissions(profile?.app_role?.permisos);
  return Object.keys(permisos).filter(moduleId => permisos[moduleId]?.ver);
}
