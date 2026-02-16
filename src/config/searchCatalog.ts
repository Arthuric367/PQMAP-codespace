/**
 * Search Catalog - Comprehensive list of searchable items
 * Includes: Pages, Dashboard Widgets, and Module Functions
 */

export type SearchItemType = 'page' | 'widget' | 'function';

export interface SearchItem {
  id: string;
  name: string;
  description: string;
  type: SearchItemType;
  category: string; // For breadcrumb display
  keywords: string[]; // Additional search terms
  path: string; // Navigation path
  moduleId?: string; // Permission module ID (for permission filtering)
  parentPage?: string; // For functions, the parent page view ID
}

/**
 * Main Pages
 */
const pageItems: SearchItem[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Main overview with widgets and key metrics',
    type: 'page',
    category: 'Main',
    keywords: ['home', 'overview', 'widgets', 'metrics', 'summary'],
    path: 'dashboard',
    moduleId: 'dashboard'
  },
  {
    id: 'events',
    name: 'Event Management',
    description: 'View and manage power quality events',
    type: 'page',
    category: 'Main',
    keywords: ['events', 'pq', 'voltage dip', 'swell', 'harmonics', 'interruption'],
    path: 'events',
    moduleId: 'events'
  },
  {
    id: 'eventGrouping',
    name: 'Event Grouping',
    description: 'Configure mother-child event relationships',
    type: 'page',
    category: 'Event Management',
    keywords: ['mother', 'child', 'grouping', 'linked events'],
    path: 'eventGrouping',
    moduleId: 'events'
  },
  {
    id: 'idrReports',
    name: 'IDR Reports',
    description: 'Individual Disturbance Reports management',
    type: 'page',
    category: 'Event Management',
    keywords: ['idr', 'disturbance', 'report', 'investigation'],
    path: 'idrReports',
    moduleId: 'events'
  },
  {
    id: 'assets',
    name: 'Asset Management',
    description: 'Manage PQ meters and substations',
    type: 'page',
    category: 'Main',
    keywords: ['meters', 'substations', 'equipment', 'assets', 'devices'],
    path: 'assets',
    moduleId: 'assets'
  },
  {
    id: 'reporting',
    name: 'Reporting',
    description: 'Generate and view reports',
    type: 'page',
    category: 'Main',
    keywords: ['reports', 'analytics', 'export', 'summary'],
    path: 'reporting',
    moduleId: 'reporting'
  },
  {
    id: 'notifications',
    name: 'Notifications',
    description: 'Configure notification rules, templates, and groups',
    type: 'page',
    category: 'Main',
    keywords: ['alerts', 'notifications', 'email', 'sms', 'teams'],
    path: 'notifications',
    moduleId: 'notifications'
  },
  {
    id: 'services',
    name: 'PQ Services',
    description: 'Power quality service management',
    type: 'page',
    category: 'Main',
    keywords: ['service', 'customer', 'pqsis', 'maintenance'],
    path: 'services',
    moduleId: 'services'
  },
  {
    id: 'userManagement',
    name: 'User Management',
    description: 'Manage users and permissions',
    type: 'page',
    category: 'Data Maintenance',
    keywords: ['users', 'roles', 'permissions', 'access'],
    path: 'userManagement',
    moduleId: 'userManagement'
  },
  {
    id: 'scada',
    name: 'SCADA',
    description: 'SCADA system integration',
    type: 'page',
    category: 'Data Maintenance',
    keywords: ['scada', 'monitoring', 'control'],
    path: 'scada',
    moduleId: 'scada'
  },
  {
    id: 'meterHierarchy',
    name: 'Meter Hierarchy',
    description: 'Configure meter organization structure',
    type: 'page',
    category: 'Data Maintenance',
    keywords: ['hierarchy', 'structure', 'organization', 'tree'],
    path: 'meterHierarchy',
    moduleId: 'health'
  },
  {
    id: 'customerTransformerMatching',
    name: 'Customer Transformer',
    description: 'Match customers to transformers',
    type: 'page',
    category: 'Data Maintenance',
    keywords: ['customer', 'transformer', 'matching', 'mapping'],
    path: 'customerTransformerMatching',
    moduleId: 'customerTransformer'
  },
  {
    id: 'weightingFactors',
    name: 'Weighting Factors',
    description: 'Manage customer count weighting factors',
    type: 'page',
    category: 'Data Maintenance',
    keywords: ['weighting', 'factors', 'customers', 'count'],
    path: 'weightingFactors',
    moduleId: 'assets'
  },
  {
    id: 'pqBenchmarking',
    name: 'PQ Standard',
    description: 'PQ benchmarking standards (IEC/SEMI/ITIC)',
    type: 'page',
    category: 'Data Maintenance',
    keywords: ['standard', 'benchmark', 'iec', 'semi', 'itic', 'compliance'],
    path: 'pqBenchmarking',
    moduleId: 'assets'
  },
  {
    id: 'systemParameters',
    name: 'System Parameters',
    description: 'Configure system-wide parameters',
    type: 'page',
    category: 'Data Maintenance',
    keywords: ['parameters', 'settings', 'configuration', 'system'],
    path: 'systemParameters',
    moduleId: 'systemSettings'
  }
];

/**
 * Dashboard Widgets
 */
const widgetItems: SearchItem[] = [
  {
    id: 'stats-cards',
    name: 'Statistics Cards',
    description: 'Key metrics overview cards',
    type: 'widget',
    category: 'Dashboard',
    keywords: ['stats', 'metrics', 'kpi', 'summary', 'cards'],
    path: 'dashboard',
    moduleId: 'stats-cards'
  },
  {
    id: 'substation-map',
    name: 'Substation Map',
    description: 'Geographic map of substations',
    type: 'widget',
    category: 'Dashboard',
    keywords: ['map', 'substation', 'geo', 'location'],
    path: 'dashboard',
    moduleId: 'substation-map'
  },
  {
    id: 'meter-map',
    name: 'Meter Map',
    description: 'Geographic map of PQ meters',
    type: 'widget',
    category: 'Dashboard',
    keywords: ['map', 'meter', 'geo', 'location', 'device'],
    path: 'dashboard',
    moduleId: 'meter-map'
  },
  {
    id: 'sarfi-chart',
    name: 'SARFI Chart',
    description: 'System Average RMS Variation Frequency Index',
    type: 'widget',
    category: 'Dashboard',
    keywords: ['sarfi', 'rms', 'frequency', 'index', 'chart'],
    path: 'dashboard',
    moduleId: 'sarfi-chart'
  },
  {
    id: 'root-cause-chart',
    name: 'Root Cause Chart',
    description: 'Event root cause analysis chart',
    type: 'widget',
    category: 'Dashboard',
    keywords: ['root cause', 'analysis', 'chart', 'pie'],
    path: 'dashboard',
    moduleId: 'root-cause-chart'
  },
  {
    id: 'insight-chart',
    name: 'Insight Chart',
    description: 'Voltage dip analysis by circuit',
    type: 'widget',
    category: 'Dashboard',
    keywords: ['insight', 'voltage dip', 'circuit', 'analysis', 'bar chart'],
    path: 'dashboard',
    moduleId: 'insight-chart'
  },
  {
    id: 'affected-customer-chart',
    name: 'Affected Customer Chart',
    description: 'Customer impact analysis',
    type: 'widget',
    category: 'Dashboard',
    keywords: ['customer', 'affected', 'impact', 'chart'],
    path: 'dashboard',
    moduleId: 'affected-customer-chart'
  },
  {
    id: 'affected-equipment-chart',
    name: 'Affected Equipment Chart',
    description: 'Equipment impact analysis',
    type: 'widget',
    category: 'Dashboard',
    keywords: ['equipment', 'affected', 'impact', 'chart'],
    path: 'dashboard',
    moduleId: 'affected-equipment-chart'
  },
  {
    id: 'event-list',
    name: 'Event List',
    description: 'Recent power quality events',
    type: 'widget',
    category: 'Dashboard',
    keywords: ['event', 'list', 'recent', 'table'],
    path: 'dashboard',
    moduleId: 'event-list'
  },
  {
    id: 'sarfi-70-monitor',
    name: 'SARFI 70 Monitor',
    description: 'SARFI 70% threshold monitoring',
    type: 'widget',
    category: 'Dashboard',
    keywords: ['sarfi', '70', 'monitor', 'threshold', 'alert'],
    path: 'dashboard',
    moduleId: 'sarfi-70-monitor'
  }
];

/**
 * Module Functions/Sub-pages
 */
const functionItems: SearchItem[] = [
  // Reporting Functions
  {
    id: 'pq-summary-report',
    name: 'PQ Summary Report',
    description: 'Power quality summary report',
    type: 'function',
    category: 'Reporting',
    keywords: ['pq', 'summary', 'report', 'voltage dip', 'swell'],
    path: 'reporting',
    moduleId: 'reporting',
    parentPage: 'reporting'
  },
  {
    id: 'meter-communication-report',
    name: 'Meter Communication Report',
    description: 'Meter communication health status',
    type: 'function',
    category: 'Reporting',
    keywords: ['meter', 'communication', 'health', 'connectivity'],
    path: 'reporting',
    moduleId: 'reporting',
    parentPage: 'reporting'
  },
  {
    id: 'dynamic-report',
    name: 'Dynamic Report Builder',
    description: 'Create custom reports',
    type: 'function',
    category: 'Reporting',
    keywords: ['dynamic', 'custom', 'builder', 'report'],
    path: 'reporting',
    moduleId: 'reporting',
    parentPage: 'reporting'
  },
  {
    id: 'meter-raw-data',
    name: 'Meter Raw Data',
    description: 'View raw meter data',
    type: 'function',
    category: 'Reporting',
    keywords: ['raw', 'data', 'meter', 'export'],
    path: 'reporting',
    moduleId: 'reporting',
    parentPage: 'reporting'
  },
  // Notification Functions
  {
    id: 'notification-dashboard',
    name: 'Notification Dashboard',
    description: 'Overview of notification system',
    type: 'function',
    category: 'Notifications',
    keywords: ['dashboard', 'overview', 'status'],
    path: 'notifications',
    moduleId: 'notifications',
    parentPage: 'notifications'
  },
  {
    id: 'notification-rules',
    name: 'Notification Rules',
    description: 'Configure notification rules',
    type: 'function',
    category: 'Notifications',
    keywords: ['rules', 'conditions', 'trigger', 'automation'],
    path: 'notifications',
    moduleId: 'notifications',
    parentPage: 'notifications'
  },
  {
    id: 'notification-templates',
    name: 'Notification Templates',
    description: 'Manage notification message templates',
    type: 'function',
    category: 'Notifications',
    keywords: ['templates', 'messages', 'email', 'sms'],
    path: 'notifications',
    moduleId: 'notifications',
    parentPage: 'notifications'
  },
  {
    id: 'notification-groups',
    name: 'Notification Groups',
    description: 'Manage recipient groups',
    type: 'function',
    category: 'Notifications',
    keywords: ['groups', 'recipients', 'members', 'distribution'],
    path: 'notifications',
    moduleId: 'notifications',
    parentPage: 'notifications'
  },
  {
    id: 'notification-logs',
    name: 'Notification Logs',
    description: 'View notification history',
    type: 'function',
    category: 'Notifications',
    keywords: ['logs', 'history', 'sent', 'delivery'],
    path: 'notifications',
    moduleId: 'notifications',
    parentPage: 'notifications'
  },
  // PQ Services Functions
  {
    id: 'pq-service-records',
    name: 'PQ Service Records',
    description: 'Power quality service records',
    type: 'function',
    category: 'PQ Services',
    keywords: ['records', 'service', 'history', 'customer'],
    path: 'services',
    moduleId: 'services',
    parentPage: 'services'
  },
  {
    id: 'customer-event-history',
    name: 'Customer Event History',
    description: 'Customer-specific event history',
    type: 'function',
    category: 'PQ Services',
    keywords: ['customer', 'event', 'history', 'impact'],
    path: 'services',
    moduleId: 'services',
    parentPage: 'services'
  },
  {
    id: 'pqsis-maintenance',
    name: 'PQSIS Maintenance',
    description: 'PQSIS system data maintenance',
    type: 'function',
    category: 'PQ Services',
    keywords: ['pqsis', 'maintenance', 'data', 'import'],
    path: 'services',
    moduleId: 'services',
    parentPage: 'services'
  }
];

/**
 * Complete Search Catalog
 */
export const searchCatalog: SearchItem[] = [
  ...pageItems,
  ...widgetItems,
  ...functionItems
];

/**
 * Get search items by type
 */
export const getItemsByType = (type: SearchItemType): SearchItem[] => {
  return searchCatalog.filter(item => item.type === type);
};

/**
 * Get search item by ID
 */
export const getItemById = (id: string): SearchItem | undefined => {
  return searchCatalog.find(item => item.id === id);
};
