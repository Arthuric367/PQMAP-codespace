import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Command, Clock, ExternalLink, ChevronRight } from 'lucide-react';
import { searchCatalog, SearchItem } from '../config/searchCatalog';
import { useAuth } from '../contexts/AuthContext';

interface GlobalSearchProps {
  onNavigate: (view: string, widgetId?: string) => void;
}

const RECENT_ITEMS_KEY = 'pqmap_recent_searches';
const MAX_RECENT_ITEMS = 5;

// Dashboard widget IDs that require special permission check
const DASHBOARD_WIDGETS = [
  'stats-cards',
  'substation-map',
  'meter-map',
  'sarfi-chart',
  'root-cause-chart',
  'insight-chart',
  'affected-customer-chart',
  'affected-equipment-chart',
  'event-list',
  'sarfi-70-monitor'
];

// Module permissions by role (sync with userManagementService)
const getRolePermissions = (role: string) => {
  const permissions: Record<string, string[]> = {
    system_admin: [...DASHBOARD_WIDGETS, 'events', 'analytics', 'assets', 'reports', 'reporting', 'notifications', 'services', 'health', 'customerTransformer', 'scada', 'userManagement', 'systemSettings'],
    system_owner: [...DASHBOARD_WIDGETS, 'events', 'analytics', 'assets', 'reports', 'reporting', 'notifications', 'services', 'health', 'customerTransformer', 'scada', 'userManagement', 'systemSettings'],
    manual_implementator: [...DASHBOARD_WIDGETS, 'events', 'analytics', 'assets', 'reports', 'reporting', 'notifications', 'services', 'health', 'customerTransformer', 'scada'],
    watcher: ['stats-cards', 'event-list', 'meter-map', 'events', 'analytics', 'assets', 'reports', 'reporting', 'notifications', 'services']
  };
  return permissions[role] || [];
};

export default function GlobalSearch({ onNavigate }: GlobalSearchProps) {
  const { profile } = useAuth();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [recentItems, setRecentItems] = useState<string[]>([]);

  // Load recent items from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_ITEMS_KEY);
    if (saved) {
      try {
        setRecentItems(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent items', e);
      }
    }
  }, []);

  // Filter search catalog based on user permissions
  const accessibleItems = useMemo(() => {
    if (!profile) return [];

    const allowedModules = getRolePermissions(profile.role);

    return searchCatalog.filter(item => {
      // Check if user has permission to access this item
      if (item.moduleId) {
        return allowedModules.includes(item.moduleId);
      }
      // If no moduleId, assume accessible (shouldn't happen)
      return true;
    });
  }, [profile]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      // Show recent items when search is empty
      const recentSearchItems = recentItems
        .map(id => accessibleItems.find(item => item.id === id))
        .filter(Boolean) as SearchItem[];
      return recentSearchItems.slice(0, MAX_RECENT_ITEMS);
    }

    const searchQuery = query.toLowerCase().trim();
    return accessibleItems.filter(item => {
      // Search in name
      if (item.name.toLowerCase().includes(searchQuery)) return true;
      // Search in description
      if (item.description.toLowerCase().includes(searchQuery)) return true;
      // Search in keywords
      if (item.keywords.some(kw => kw.toLowerCase().includes(searchQuery))) return true;
      // Search in category
      if (item.category.toLowerCase().includes(searchQuery)) return true;
      return false;
    });
  }, [query, accessibleItems, recentItems]);

  // Reset selected index when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            handleSelect(filteredItems[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const selectedElement = dropdownRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, isOpen]);

  // Save to recent items
  const saveToRecent = (itemId: string) => {
    const updated = [itemId, ...recentItems.filter(id => id !== itemId)].slice(0, MAX_RECENT_ITEMS);
    setRecentItems(updated);
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(updated));
  };

  // Handle item selection
  const handleSelect = (item: SearchItem) => {
    saveToRecent(item.id);

    if (item.type === 'widget') {
      // Navigate to dashboard and scroll to widget
      onNavigate('dashboard', item.id);
    } else {
      // Navigate to page
      onNavigate(item.path);
    }

    // Clear search and close dropdown
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  // Get icon for item type
  const getTypeIcon = (type: SearchItem['type']) => {
    switch (type) {
      case 'page':
        return <ExternalLink className="w-4 h-4 text-blue-500" />;
      case 'widget':
        return <Command className="w-4 h-4 text-purple-500" />;
      case 'function':
        return <ChevronRight className="w-4 h-4 text-green-500" />;
    }
  };

  // Get type badge color
  const getTypeBadgeColor = (type: SearchItem['type']) => {
    switch (type) {
      case 'page':
        return 'bg-blue-100 text-blue-700';
      case 'widget':
        return 'bg-purple-100 text-purple-700';
      case 'function':
        return 'bg-green-100 text-green-700';
    }
  };

  return (
    <div className="relative flex-1 max-w-md">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search pages, widgets, functions..."
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <span className="text-sm">×</span>
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50"
        >
          {filteredItems.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              {query ? 'No results found' : 'No recent searches'}
            </div>
          ) : (
            <>
              {/* Header for recent items */}
              {!query && recentItems.length > 0 && (
                <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Recent
                  </span>
                </div>
              )}

              {/* Results list */}
              <div className="py-1">
                {filteredItems.map((item, index) => (
                  <button
                    key={item.id}
                    data-index={index}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full px-3 py-2.5 flex items-start gap-3 text-left hover:bg-slate-50 transition-colors ${
                      index === selectedIndex ? 'bg-blue-50' : ''
                    }`}
                  >
                    {/* Type Icon */}
                    <div className="mt-0.5">{getTypeIcon(item.type)}</div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-slate-900 text-sm truncate">
                          {item.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 text-xs font-medium rounded ${getTypeBadgeColor(
                            item.type
                          )}`}
                        >
                          {item.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{item.description}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.category}</p>
                    </div>

                    {/* Keyboard shortcut indicator */}
                    {index === selectedIndex && (
                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                          ↵
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Footer hint */}
              <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200">
                      ↑↓
                    </kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200">
                      ↵
                    </kbd>
                    Select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200">
                      Esc
                    </kbd>
                    Close
                  </span>
                </div>
                <span className="text-slate-400">
                  {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
