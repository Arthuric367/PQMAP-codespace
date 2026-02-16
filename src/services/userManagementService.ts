import type { UAMUser, RolePermission, SystemRole, PermissionAction, SystemModule } from '../types/database';

// Mock UAM user data - in production, this would come from the UAM system
export const mockUAMUsers: UAMUser[] = [
  {
    id: '1',
    user_id: 'SA001',
    name: 'John Anderson',
    description: 'System Administrator - Full access',
    department: 'Digital Engineering',
    role: 'system_admin',
    email: 'john.anderson@company.com',
    active: true,
    created_at: '2024-01-15T08:00:00Z',
    updated_at: '2024-01-15T08:00:00Z'
  },
  {
    id: '2',
    user_id: 'SO001',
    name: 'Sarah Chen',
    description: 'System Owner - Business lead',
    department: 'Power Systems',
    role: 'system_owner',
    email: 'sarah.chen@company.com',
    active: true,
    created_at: '2024-02-10T09:30:00Z',
    updated_at: '2024-02-10T09:30:00Z'
  },
  {
    id: '3',
    user_id: 'MI001',
    name: 'Michael Wong',
    description: 'Manual Implementation Team Lead',
    department: 'Technical Services-PSBG',
    role: 'manual_implementator',
    email: 'michael.wong@company.com',
    active: true,
    created_at: '2024-03-05T10:15:00Z',
    updated_at: '2024-03-05T10:15:00Z'
  },
  {
    id: '4',
    user_id: 'MI002',
    name: 'Emily Rodriguez',
    description: 'Data Entry Specialist',
    department: 'Digital Engineering',
    role: 'manual_implementator',
    email: 'emily.rodriguez@company.com',
    active: true,
    created_at: '2024-03-12T11:00:00Z',
    updated_at: '2024-03-12T11:00:00Z'
  },
  {
    id: '5',
    user_id: 'W001',
    name: 'David Kim',
    description: 'Management Viewer',
    department: 'Business Success',
    role: 'watcher',
    email: 'david.kim@company.com',
    active: true,
    created_at: '2024-04-01T08:45:00Z',
    updated_at: '2024-04-01T08:45:00Z'
  },
  {
    id: '6',
    user_id: 'W002',
    name: 'Lisa Thompson',
    description: 'Quality Assurance Observer',
    department: 'Technical Services-PSBG',
    role: 'watcher',
    email: 'lisa.thompson@company.com',
    active: true,
    created_at: '2024-04-10T14:20:00Z',
    updated_at: '2024-04-10T14:20:00Z'
  },
  {
    id: '7',
    user_id: 'MI003',
    name: 'James Park',
    description: 'Field Operations Coordinator',
    department: 'Power Systems',
    role: 'manual_implementator',
    email: 'james.park@company.com',
    active: true,
    created_at: '2024-05-15T09:00:00Z',
    updated_at: '2024-05-15T09:00:00Z'
  },
  {
    id: '8',
    user_id: 'SO002',
    name: 'Maria Garcia',
    description: 'Deputy System Owner',
    department: 'Business Success',
    role: 'system_owner',
    email: 'maria.garcia@company.com',
    active: true,
    created_at: '2024-06-01T10:30:00Z',
    updated_at: '2024-06-01T10:30:00Z'
  },
  {
    id: '9',
    user_id: 'W003',
    name: 'Robert Lee',
    description: 'External Auditor',
    department: 'Business Success',
    role: 'watcher',
    email: 'robert.lee@company.com',
    active: true,
    created_at: '2024-07-10T13:15:00Z',
    updated_at: '2024-07-10T13:15:00Z'
  },
  {
    id: '10',
    user_id: 'MI004',
    name: 'Amanda Zhang',
    description: 'Technical Data Analyst',
    department: 'Digital Engineering',
    role: 'manual_implementator',
    email: 'amanda.zhang@company.com',
    active: true,
    created_at: '2024-08-05T08:30:00Z',
    updated_at: '2024-08-05T08:30:00Z'
  }
];

// System modules for permission management
export const systemModules: SystemModule[] = [
  // Dashboard Widgets - Widget-level permissions
  { id: 'stats-cards', name: 'Stats Cards', description: 'Dashboard statistics overview cards', category: 'Dashboard' },
  { id: 'substation-map', name: 'Substation Map', description: 'Geographic substation visualization', category: 'Dashboard' },
  { id: 'meter-map', name: 'Meter Map', description: 'Geographic meter visualization', category: 'Dashboard' },
  { id: 'sarfi-chart', name: 'SARFI Chart', description: 'SARFI metrics visualization', category: 'Dashboard' },
  { id: 'root-cause-chart', name: 'Root Cause Chart', description: 'Root cause analysis chart', category: 'Dashboard' },
  { id: 'insight-chart', name: 'Insight Chart', description: 'Insight for improvement analysis', category: 'Dashboard' },
  { id: 'affected-customer-chart', name: 'Affected Customer Chart', description: 'Customer impact visualization', category: 'Dashboard' },
  { id: 'affected-equipment-chart', name: 'Affected Equipment Chart', description: 'Equipment impact visualization', category: 'Dashboard' },
  { id: 'event-list', name: 'Event List', description: 'Recent events list widget', category: 'Dashboard' },
  { id: 'sarfi-70-monitor', name: 'SARFI-70 Monitor', description: 'SARFI-70 threshold monitoring', category: 'Dashboard' },
  
  // Other Core Modules
  { id: 'events', name: 'Event Management', description: 'PQ events monitoring and management', category: 'Core' },
  { id: 'analytics', name: 'Impact Analysis', description: 'Event impact and analytics', category: 'Analytics' },
  { id: 'assets', name: 'Asset Management', description: 'Meters, substations, and equipment', category: 'Core' },
  { id: 'reports', name: 'Reports', description: 'Report generation and viewing', category: 'Reporting' },
  { id: 'reporting', name: 'Reporting', description: 'Reporting module with PQ Summary and overlays', category: 'Reporting' },
  { id: 'notifications', name: 'Notifications', description: 'Notification rules and history', category: 'Core' },
  { id: 'services', name: 'PQ Services', description: 'Power quality services management', category: 'Services' },
  { id: 'health', name: 'System Health', description: 'System monitoring and health checks', category: 'Administration' },
  { id: 'customerTransformer', name: 'Customer Transformer', description: 'Customer-transformer matching', category: 'Data Maintenance' },
  { id: 'scada', name: 'SCADA', description: 'Substation master data management', category: 'Data Maintenance' },
  { id: 'userManagement', name: 'User Management', description: 'User and role management', category: 'Administration' },
  { id: 'systemSettings', name: 'System Settings', description: 'System configuration and settings', category: 'Administration' }
];

// Default role permissions
export const defaultRolePermissions: Record<SystemRole, RolePermission[]> = {
  system_admin: systemModules.map((module, index) => ({
    id: `admin_${index}`,
    role: 'system_admin' as SystemRole,
    module: module.id,
    permissions: ['create', 'read', 'update', 'delete'] as PermissionAction[],
    description: 'Full access to all functions',
    updated_at: new Date().toISOString()
  })),
  
  system_owner: systemModules.map((module, index) => ({
    id: `owner_${index}`,
    role: 'system_owner' as SystemRole,
    module: module.id,
    permissions: ['create', 'read', 'update', 'delete'] as PermissionAction[],
    description: 'Full access - same as System Admin',
    updated_at: new Date().toISOString()
  })),
  
  manual_implementator: systemModules.map((module, index) => {
    // Manual Implementator has all permissions except deletion and management functions
    const restrictedModules = ['userManagement', 'systemSettings'];
    const noDeleteModules = ['events', 'assets', 'customerTransformer', 'services', 'scada'];
    const dashboardWidgets = ['stats-cards', 'substation-map', 'meter-map', 'sarfi-chart', 
                              'root-cause-chart', 'insight-chart', 'affected-customer-chart', 
                              'affected-equipment-chart', 'event-list', 'sarfi-70-monitor'];
    
    let permissions: PermissionAction[] = ['read'];
    
    if (restrictedModules.includes(module.id)) {
      // Only read access for user management and system settings
      permissions = ['read'];
    } else if (dashboardWidgets.includes(module.id)) {
      // Dashboard widgets: read-only (no customization for manual implementators)
      permissions = ['read'];
    } else if (noDeleteModules.includes(module.id)) {
      // Can create, read, update but not delete
      permissions = ['create', 'read', 'update'];
    } else {
      // Full access to other modules
      permissions = ['create', 'read', 'update', 'delete'];
    }
    
    return {
      id: `impl_${index}`,
      role: 'manual_implementator' as SystemRole,
      module: module.id,
      permissions,
      description: 'Standard operational access with restrictions',
      updated_at: new Date().toISOString()
    };
  }),
  
  watcher: systemModules.map((module, index) => {
    const dashboardWidgets = ['stats-cards', 'substation-map', 'meter-map', 'sarfi-chart', 
                              'root-cause-chart', 'insight-chart', 'affected-customer-chart', 
                              'affected-equipment-chart', 'event-list', 'sarfi-70-monitor'];
    
    // Watchers have limited dashboard access by default
    // Only basic monitoring widgets: stats-cards, event-list, meter-map
    const watcherAllowedWidgets = ['stats-cards', 'event-list', 'meter-map'];
    
    let permissions: PermissionAction[] = ['read'];
    
    // For dashboard widgets, only grant access to allowed widgets
    if (dashboardWidgets.includes(module.id) && !watcherAllowedWidgets.includes(module.id)) {
      permissions = []; // No access to advanced dashboard widgets
    }
    
    return {
      id: `watcher_${index}`,
      role: 'watcher' as SystemRole,
      module: module.id,
      permissions,
      description: 'Limited read-only access to basic monitoring',
      updated_at: new Date().toISOString()
    };
  })
};

// In-memory storage for modified permissions (in production, this would be in the database)
let rolePermissionsStore: Record<SystemRole, RolePermission[]> = JSON.parse(JSON.stringify(defaultRolePermissions));

/**
 * Fetch all UAM users (simulated from external UAM system)
 */
export async function fetchUAMUsers(): Promise<UAMUser[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  return [...mockUAMUsers];
}

/**
 * Fetch permissions for a specific role
 */
export async function fetchRolePermissions(role: SystemRole): Promise<RolePermission[]> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return [...rolePermissionsStore[role]];
}

/**
 * Fetch all roles with their permissions
 */
export async function fetchAllRoles(): Promise<Record<SystemRole, RolePermission[]>> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return JSON.parse(JSON.stringify(rolePermissionsStore));
}

/**
 * Update permissions for a specific role and module
 */
export async function updateRolePermission(
  role: SystemRole,
  moduleId: string,
  permissions: PermissionAction[]
): Promise<RolePermission> {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const rolePerms = rolePermissionsStore[role];
  const permissionIndex = rolePerms.findIndex(p => p.module === moduleId);
  
  if (permissionIndex === -1) {
    throw new Error(`Permission not found for role ${role} and module ${moduleId}`);
  }
  
  rolePerms[permissionIndex] = {
    ...rolePerms[permissionIndex],
    permissions,
    updated_at: new Date().toISOString()
  };
  
  return { ...rolePerms[permissionIndex] };
}

/**
 * Reset permissions for a role to defaults
 */
export async function resetRolePermissions(role: SystemRole): Promise<RolePermission[]> {
  await new Promise(resolve => setTimeout(resolve, 300));
  rolePermissionsStore[role] = JSON.parse(JSON.stringify(defaultRolePermissions[role]));
  return [...rolePermissionsStore[role]];
}

/**
 * Get role display information
 */
export function getRoleInfo(role: SystemRole): { name: string; description: string; color: string } {
  const roleInfo = {
    system_admin: {
      name: 'System Admin',
      description: 'Super users to access all functions',
      color: 'text-red-600 bg-red-50 border-red-200'
    },
    system_owner: {
      name: 'System Owner',
      description: 'Adopt same permission as System Admin first',
      color: 'text-purple-600 bg-purple-50 border-purple-200'
    },
    manual_implementator: {
      name: 'Manual Implementator',
      description: 'All function except events deletion, managing users, and system settings',
      color: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    watcher: {
      name: 'Watcher',
      description: 'View only for all functions',
      color: 'text-green-600 bg-green-50 border-green-200'
    }
  };
  
  return roleInfo[role];
}

/**
 * Get module by ID
 */
export function getModuleById(moduleId: string): SystemModule | undefined {
  return systemModules.find(m => m.id === moduleId);
}

/**
 * Check if a user has permission to approve notification templates
 * Only admin roles (system_admin, system_owner) can approve templates
 * 
 * @param userRole - The user's system role
 * @returns true if user can approve templates, false otherwise
 */
export function canApproveNotificationTemplates(userRole: SystemRole): boolean {
  return userRole === 'system_admin' || userRole === 'system_owner';
}

/**
 * Check if a user has specific permission for a module
 * 
 * @param role - The user's system role
 * @param moduleId - The module ID to check
 * @param action - The permission action (create, read, update, delete)
 * @returns true if user has the permission, false otherwise
 */
export async function hasPermission(
  role: SystemRole,
  moduleId: string,
  action: PermissionAction
): Promise<boolean> {
  const permissions = await fetchRolePermissions(role);
  const modulePermission = permissions.find(p => p.module === moduleId);
  
  if (!modulePermission) {
    return false;
  }
  
  return modulePermission.permissions.includes(action);
}

/**
 * Get all dashboard widgets that a role has read access to
 * 
 * @param role - The user's system role
 * @returns Array of widget IDs that the role can access
 */
export async function getAllowedDashboardWidgets(role: SystemRole): Promise<string[]> {
  const permissions = await fetchRolePermissions(role);
  const dashboardWidgets = ['stats-cards', 'substation-map', 'meter-map', 'sarfi-chart', 
                            'root-cause-chart', 'insight-chart', 'affected-customer-chart', 
                            'affected-equipment-chart', 'event-list', 'sarfi-70-monitor'];
  
  return dashboardWidgets.filter(widgetId => {
    const permission = permissions.find(p => p.module === widgetId);
    return permission && permission.permissions.includes('read');
  });
}

/**
 * Check if a role can access a specific dashboard widget
 * 
 * @param role - The user's system role
 * @param widgetId - The widget ID to check
 * @returns true if role can access the widget, false otherwise
 */
export async function canAccessDashboardWidget(role: SystemRole, widgetId: string): Promise<boolean> {
  return hasPermission(role, widgetId, 'read');
}

