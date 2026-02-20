import { useState, useEffect } from 'react';
import { Clock, Zap, AlertTriangle, Users, ArrowLeft, GitBranch, Trash2, ChevronDown, ChevronUp, CheckCircle, XCircle, Ungroup, Download, FileText, Edit, Save, X as XIcon, Wrench, Eye, EyeOff, Filter, Search } from 'lucide-react';
import { PQEvent, Substation, EventCustomerImpact, IDRRecord, PQServiceRecord, PQMeter, Customer, EventAuditLog, EventOperationType } from '../../types/database';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import WaveformViewer from './WaveformViewer';
import { MotherEventGroupingService } from '../../services/mother-event-grouping';
import { ExportService } from '../../services/exportService';
import CustomerEventHistoryPanel from './CustomerEventHistoryPanel';
import PSBGConfigModal from './PSBGConfigModal';
import { EventAuditService } from '../../services/eventAuditService';

type TabType = 'overview' | 'technical' | 'impact' | 'services' | 'timeline' | 'idr';

interface EventDetailsProps {
  event: PQEvent;
  substation?: Substation;
  impacts: EventCustomerImpact[];
  initialTab?: TabType;
  onStatusChange: (eventId: string, status: string) => void;
  onEventDeleted?: () => void;
  onEventUpdated?: () => void;
}

export default function EventDetails({ event: initialEvent, substation: initialSubstation, impacts: initialImpacts, initialTab, onStatusChange: _onStatusChange, onEventDeleted, onEventUpdated }: EventDetailsProps) {
  // Navigation state
  const [currentEvent, setCurrentEvent] = useState<PQEvent>(initialEvent);
  const [currentSubstation, setCurrentSubstation] = useState<Substation | undefined>(initialSubstation);
  const [currentImpacts, setCurrentImpacts] = useState<EventCustomerImpact[]>(initialImpacts);
  const [currentMeter, setCurrentMeter] = useState<PQMeter | null>(null);
  const [navigationStack, setNavigationStack] = useState<Array<{
    event: PQEvent;
    substation?: Substation;
    impacts: EventCustomerImpact[];
  }>>([]);
  
  // Tab state - remembers last viewed tab
  const [activeTab, setActiveTab] = useState<TabType>(initialTab ?? 'overview');
  
  // Child events state
  const [childEvents, setChildEvents] = useState<PQEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [childEventsExpanded, setChildEventsExpanded] = useState(false);
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Ungroup state
  const [ungrouping, setUngrouping] = useState(false);
  const [isUngroupMode, setIsUngroupMode] = useState(false);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  
  // Mark False state
  const [isMarkFalseMode, setIsMarkFalseMode] = useState(false);
  const [selectedFalseChildIds, setSelectedFalseChildIds] = useState<string[]>([]);
  const [markingFalse, setMarkingFalse] = useState(false);
  
  // Export states
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // IDR upload states
  const [showUploadDropdown, setShowUploadDropdown] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResults, setImportResults] = useState<{
    successful: number;
    failed: number;
    errors: Array<{ row: number; column: string; message: string; eventId?: string }>;
  } | null>(null);

  // IDR editing states
  const [isEditingIDR, setIsEditingIDR] = useState(false);
  const [idrRecord, setIDRRecord] = useState<IDRRecord | null>(null);
  const [loadingIDR, setLoadingIDR] = useState(false);
  
  // Match IDR panel states
  const [showMatchIDRPanel, setShowMatchIDRPanel] = useState(false);
  const [timeRangeFromMinutes, setTimeRangeFromMinutes] = useState<number>(5);
  const [timeRangeToMinutes, setTimeRangeToMinutes] = useState<number>(5);
  const [outageTypeFilter, setOutageTypeFilter] = useState<string>('ALL');
  const [matchedIDRs, setMatchedIDRs] = useState<IDRRecord[]>([]);
  const [selectedMatchedIDRId, setSelectedMatchedIDRId] = useState<string | null>(null);
  const [searchingIDRs, setSearchingIDRs] = useState(false);
  const [availableOutageTypes, setAvailableOutageTypes] = useState<string[]>([]);
  
  const [idrFormData, setIDRFormData] = useState({
    idr_no: '',
    status: currentEvent.status,
    voltage_level: '',
    address: '',
    duration_ms: 0,
    v1: 0,
    v2: 0,
    v3: 0,
    equipment_type: '',
    cause_group: '',
    cause: '',
    remarks: '',
    object_part_group: '',
    object_part_code: '',
    damage_group: '',
    damage_code: '',
    fault_type: '',
    outage_type: '',
    weather: '',
    weather_condition: '',
    responsible_oc: '',
    total_cmi: 0,
    equipment_affected: '',
    restoration_actions: '',
    notes: '',
    circuit: '',
    faulty_component: '',
    external_internal: '' as 'external' | 'internal' | '',
  });
  const [savingIDR, setSavingIDR] = useState(false);

  // PQ Services state
  const [services, setServices] = useState<PQServiceRecord[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [servicesDetailView, setServicesDetailView] = useState(false); // Toggle between simple and detail view

  // Timeline/Audit Log state
  const [auditLogs, setAuditLogs] = useState<EventAuditLog[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [auditLogFilter, setAuditLogFilter] = useState<EventOperationType | 'all'>('all');

  // Customer event history panel state
  const [showCustomerHistory, setShowCustomerHistory] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Waveform data state
  const [waveformCsvData, setWaveformCsvData] = useState<string | null>(null);

  // Combined events table states
  const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);
  const [remarkValues, setRemarkValues] = useState<Record<string, string>>({});

  // PSBG Cause management state
  const [showPSBGConfig, setShowPSBGConfig] = useState(false);
  
  // Map view state for voltage_dip events
  const [eventLocations, setEventLocations] = useState<Array<{
    eventId: string;
    isMother: boolean;
    latitude: number;
    longitude: number;
    voltageLevel: string;
    substationCode: string;
    timestamp: string;
  }>>([]);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [psbgOptions, setPsbgOptions] = useState<string[]>([
    'VEGETATION',
    'DAMAGED BY THIRD PARTY',
    'UNCONFIRMED',
    'ANIMALS, BIRDS, INSECTS'
  ]);
  const [usedPsbgOptions, setUsedPsbgOptions] = useState<string[]>([]);

  // Update state when props change
  useEffect(() => {
    console.log('🔍 [EventDetails] Props updated:', {
      eventId: initialEvent.id,
      impactCount: initialImpacts.length,
      firstImpactSample: initialImpacts[0] ? {
        id: initialImpacts[0].id,
        customer_id: initialImpacts[0].customer_id,
        hasCustomerObject: !!initialImpacts[0].customer,
        customerName: initialImpacts[0].customer?.name,
        customerAddress: initialImpacts[0].customer?.address,
        impactLevel: initialImpacts[0].impact_level
      } : 'No impacts'
    });
    
    setCurrentEvent(initialEvent);
    setCurrentSubstation(initialSubstation);
    setCurrentImpacts(initialImpacts);
    // Clear navigation stack when switching to a new top-level event
    setNavigationStack([]);
  }, [initialEvent, initialSubstation, initialImpacts]);

  const loadServices = async (eventId: string) => {
    try {
      setLoadingServices(true);
      const { data, error } = await supabase
        .from('pq_service_records')
        .select('*, customer:customers(*), engineer:profiles(*)')
        .eq('event_id', eventId)
        .order('service_date', { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('❌ Error loading PQ services:', error);
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  const loadAuditLogs = async (eventId: string) => {
    try {
      setLoadingAuditLogs(true);
      const logs = await EventAuditService.getEventAuditLogs(eventId);
      setAuditLogs(logs);
      console.log(`✅ Loaded ${logs.length} audit log entries for event ${eventId}`);
    } catch (error) {
      console.error('❌ Error loading audit logs:', error);
      setAuditLogs([]);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  const loadMeter = async (meterId: string | null) => {
    if (!meterId) {
      setCurrentMeter(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('pq_meters')
        .select('*')
        .eq('id', meterId)
        .single();

      if (error) throw error;
      setCurrentMeter(data);
    } catch (error) {
      console.error('❌ Error loading meter:', error);
      setCurrentMeter(null);
    }
  };

  // Load IDR record for current event
  useEffect(() => {
    loadIDRRecord(currentEvent.id);
  }, [currentEvent.id]);

  // Load PQ services for current event
  useEffect(() => {
    loadServices(currentEvent.id);
  }, [currentEvent.id]);

  // Load audit logs for current event
  useEffect(() => {
    loadAuditLogs(currentEvent.id);
  }, [currentEvent.id]);

  // Load meter for current event
  useEffect(() => {
    loadMeter(currentEvent.meter_id);
  }, [currentEvent.meter_id]);

  // Load demo waveform data (for demonstration purposes)
  useEffect(() => {
    const loadDemoWaveform = async () => {
      try {
        // For demonstration, load the sample CSV for all events
        const response = await fetch('/BKP0227_20260126 101655_973.csv');
        if (response.ok) {
          const csvText = await response.text();
          setWaveformCsvData(csvText);
        } else {
          console.warn('⚠️ Demo waveform CSV not found, using fallback');
          setWaveformCsvData(null);
        }
      } catch (error) {
        console.error('❌ Error loading demo waveform:', error);
        setWaveformCsvData(null);
      }
    };

    loadDemoWaveform();
  }, [currentEvent.id]);

  // Load child events for mother events
  useEffect(() => {
    if (currentEvent.is_mother_event) {
      loadChildEvents(currentEvent.id);
    } else {
      setChildEvents([]);
    }
  }, [currentEvent.id, currentEvent.is_mother_event]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportDropdown && !target.closest('.export-dropdown-container')) {
        setShowExportDropdown(false);
      }
      if (showUploadDropdown && !target.closest('.upload-dropdown-container')) {
        setShowUploadDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportDropdown, showUploadDropdown]);

  // Load used PSBG options when component mounts
  useEffect(() => {
    const loadUsedPsbgOptions = async () => {
      try {
        const { data, error } = await supabase
          .from('pq_events')
          .select('psbg_cause')
          .not('psbg_cause', 'is', null);

        if (error) throw error;

        const used = [...new Set(data?.map(d => d.psbg_cause).filter(Boolean) || [])];
        setUsedPsbgOptions(used);
      } catch (error) {
        console.error('❌ Error loading used PSBG options:', error);
        setUsedPsbgOptions([]);
      }
    };

    loadUsedPsbgOptions();
  }, []);

  // Load available outage types when Match IDR panel opens
  useEffect(() => {
    const loadOutageTypes = async () => {
      if (!showMatchIDRPanel) return;
      
      try {
        const { data, error } = await supabase
          .from('idr_records')
          .select('outage_type')
          .not('outage_type', 'is', null);

        if (error) throw error;

        // Extract unique outage types
        const uniqueTypes = [...new Set(data.map(record => record.outage_type).filter(Boolean))] as string[];
        setAvailableOutageTypes(uniqueTypes.sort());
        console.log('✅ Loaded outage types:', uniqueTypes);
      } catch (error) {
        console.error('Error loading outage types:', error);
      }
    };

    loadOutageTypes();
  }, [showMatchIDRPanel]);

  const loadIDRRecord = async (eventId: string) => {
    setLoadingIDR(true);
    try {
      const { data, error } = await supabase
        .from('idr_records')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading IDR record:', error);
      }
      
      if (data) {
        console.log('✅ IDR record loaded:', data);
        setIDRRecord(data);
        // Populate form with IDR record data
        setIDRFormData({
          idr_no: data.idr_no || '',
          status: data.status || currentEvent.status,
          voltage_level: data.voltage_level || '',
          address: data.address || '',
          duration_ms: data.duration_ms || 0,
          v1: data.v1 || 0,
          v2: data.v2 || 0,
          v3: data.v3 || 0,
          equipment_type: data.equipment_type || '',
          cause_group: data.cause_group || '',
          cause: data.cause || '',
          remarks: data.remarks || '',
          object_part_group: data.object_part_group || '',
          object_part_code: data.object_part_code || '',
          damage_group: data.damage_group || '',
          damage_code: data.damage_code || '',
          fault_type: data.fault_type || '',
          outage_type: data.outage_type || '',
          weather: data.weather || '',
          weather_condition: data.weather_condition || '',
          responsible_oc: data.responsible_oc || '',
          total_cmi: data.total_cmi || 0,
          equipment_affected: data.equipment_affected || '',
          restoration_actions: data.restoration_actions || '',
          notes: data.notes || '',
          circuit: data.circuit || '',
          faulty_component: data.faulty_component || '',
          external_internal: data.external_internal || '',
        });
      } else {
        console.log('ℹ️ No IDR record found, showing empty form');
        setIDRRecord(null);
        // Reset form to empty
        setIDRFormData({
          idr_no: '',
          status: currentEvent.status,
          voltage_level: '',
          address: '',
          duration_ms: 0,
          v1: 0,
          v2: 0,
          v3: 0,
          equipment_type: '',
          cause_group: '',
          cause: '',
          remarks: '',
          object_part_group: '',
          object_part_code: '',
          damage_group: '',
          damage_code: '',
          fault_type: '',
          outage_type: '',
          weather: '',
          weather_condition: '',
          responsible_oc: '',
          total_cmi: 0,
          equipment_affected: '',
          restoration_actions: '',
          notes: '',
          circuit: '',
          faulty_component: '',
          external_internal: '',
        });
      }
    } catch (error) {
      console.error('Error loading IDR record:', error);
    } finally {
      setLoadingIDR(false);
    }
  };

  // Search for matching IDRs based on time range and outage type
  const handleSearchMatchingIDRs = async () => {
    setSearchingIDRs(true);
    try {
      // Calculate time range based on event occurrence time
      const eventTime = new Date(currentEvent.timestamp);
      const fromTime = new Date(eventTime.getTime() - timeRangeFromMinutes * 60 * 1000);
      const toTime = new Date(eventTime.getTime() + timeRangeToMinutes * 60 * 1000);

      console.log('🔍 Searching IDRs:', {
        eventTime: eventTime.toISOString(),
        fromTime: fromTime.toISOString(),
        toTime: toTime.toISOString(),
        outageType: outageTypeFilter
      });

      let query = supabase
        .from('idr_records')
        .select('*')
        .eq('is_mapped', false)
        .gte('occurrence_time', fromTime.toISOString())
        .lte('occurrence_time', toTime.toISOString())
        .order('occurrence_time', { ascending: false });

      // Apply outage type filter if not 'ALL'
      if (outageTypeFilter !== 'ALL') {
        query = query.eq('outage_type', outageTypeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setMatchedIDRs(data || []);
      console.log(`✅ Found ${data?.length || 0} matching IDRs`);
    } catch (error) {
      console.error('Error searching matching IDRs:', error);
      toast.error('Failed to search matching IDRs');
    } finally {
      setSearchingIDRs(false);
    }
  };

  // Handle Match IDR panel reset
  const handleResetMatchFilters = () => {
    setTimeRangeFromMinutes(5);
    setTimeRangeToMinutes(5);
    setOutageTypeFilter('ALL');
    setMatchedIDRs([]);
    setSelectedMatchedIDRId(null);
  };

  // Save matched IDR to event
  const handleSaveMatchedIDR = async () => {
    if (!selectedMatchedIDRId) {
      toast.error('Please select an IDR record');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get the selected IDR record to retrieve idr_no
      const selectedIDR = matchedIDRs.find(idr => idr.id === selectedMatchedIDRId);
      if (!selectedIDR) {
        toast.error('Selected IDR not found');
        return;
      }

      // Update idr_records table - link IDR to event
      const { error: idrError } = await supabase
        .from('idr_records')
        .update({
          event_id: currentEvent.id,
          is_mapped: true,
          mapped_at: new Date().toISOString(),
          mapped_by: user?.id || null,
        })
        .eq('id', selectedMatchedIDRId);

      if (idrError) throw idrError;

      // Update pqevents table - set idr_no
      const { error: eventError } = await supabase
        .from('pqevents')
        .update({
          idr_no: selectedIDR.idr_no,
        })
        .eq('id', currentEvent.id);

      if (eventError) throw eventError;

      // Log audit trail
      await EventAuditService.logIDRUpdated(
        currentEvent.id,
        ['idr_no', 'event_id', 'is_mapped'],
        {
          idr_no: { from: null, to: selectedIDR.idr_no },
          event_id: { from: null, to: currentEvent.id },
          is_mapped: { from: false, to: true }
        }
      );

      toast.success('IDR matched and mapped to event successfully');
      setShowMatchIDRPanel(false);
      handleResetMatchFilters();
      await loadIDRRecord(currentEvent.id);
      
      // Notify parent component to refresh event data
      if (onEventUpdated) {
        onEventUpdated();
      }
    } catch (error: any) {
      console.error('Error matching IDR:', error);
      toast.error('Failed to match IDR to event');
    }
  };

  const loadChildEvents = async (motherEventId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pq_events')
        .select(`
          *,
          substation:substation_id (
            id,
            name,
            voltage_level
          ),
          meter:meter_id (
            id,
            circuit_id,
            voltage_level
          )
        `)
        .eq('parent_event_id', motherEventId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error loading child events:', error);
      } else {
        setChildEvents(data || []);
      }
    } catch (error) {
      console.error('Error loading child events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChildEventClick = async (childEvent: PQEvent) => {
    // Save current state to navigation stack
    setNavigationStack(prev => [...prev, {
      event: currentEvent,
      substation: currentSubstation,
      impacts: currentImpacts
    }]);

    // Load child event details
    try {
      const { data: substationData } = await supabase
        .from('substations')
        .select('*')
        .eq('id', childEvent.substation_id)
        .single();

      const { data: impactsData, error: impactsError } = await supabase
        .from('event_customer_impact')
        .select(`
          *,
          customer:customers (
            id,
            name,
            account_number,
            address
          )
        `)
        .eq('event_id', childEvent.id);

      console.log('🔍 [handleChildEventClick] Child event impacts loaded:', {
        childEventId: childEvent.id,
        impactCount: impactsData?.length || 0,
        error: impactsError,
        firstImpactSample: impactsData?.[0] ? {
          id: impactsData[0].id,
          customer_id: impactsData[0].customer_id,
          hasCustomer: !!impactsData[0].customer,
          customerName: impactsData[0].customer?.name
        } : 'No impacts'
      });

      setCurrentEvent(childEvent);
      setCurrentSubstation(substationData || undefined);
      setCurrentImpacts(impactsData || []);
    } catch (error) {
      console.error('Error loading child event details:', error);
    }
  };

  const handleBackNavigation = () => {
    if (navigationStack.length > 0) {
      const previous = navigationStack[navigationStack.length - 1];
      setCurrentEvent(previous.event);
      setCurrentSubstation(previous.substation);
      setCurrentImpacts(previous.impacts);
      setNavigationStack(prev => prev.slice(0, -1));
    }
  };

  const handleDeleteEvent = async () => {
    setDeleting(true);
    try {
      // If it's a mother event, delete child events first
      if (currentEvent.is_mother_event && childEvents.length > 0) {
        const childIds = childEvents.map(child => child.id);
        const { error: childError } = await supabase
          .from('pq_events')
          .delete()
          .in('id', childIds);
        
        if (childError) {
          console.error('Error deleting child events:', childError);
          alert('Failed to delete child events. Please try again.');
          setDeleting(false);
          return;
        }
      }

      // Delete the main event
      const { error } = await supabase
        .from('pq_events')
        .delete()
        .eq('id', currentEvent.id);

      if (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event. Please try again.');
      } else {
        // Success - notify parent component
        setShowDeleteConfirm(false);
        if (onEventDeleted) {
          onEventDeleted();
        }
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleUngroupEvents = async () => {
    if (!confirm('Are you sure you want to ungroup these events? All child events will become independent events.')) {
      return;
    }

    setUngrouping(true);
    try {
      const success = await MotherEventGroupingService.ungroupEvents(currentEvent.id);
      
      if (success) {
        console.log('Events ungrouped successfully');
        if (onEventUpdated) {
          onEventUpdated();
        }
      } else {
        alert('Failed to ungroup events. Please try again.');
      }
    } catch (error) {
      console.error('Error ungrouping events:', error);
      alert('Failed to ungroup events. Please try again.');
    } finally {
      setUngrouping(false);
    }
  };

  // Toggle ungroup mode - shows checkboxes
  const handleUngroupMode = () => {
    setIsUngroupMode(true);
    setSelectedChildIds([]);
  };

  // Cancel ungroup mode - hides checkboxes and clears selection
  const handleCancelUngroup = () => {
    setIsUngroupMode(false);
    setSelectedChildIds([]);
  };

  // Save ungroup - ungroup selected children
  const handleSaveUngroup = async () => {
    if (selectedChildIds.length === 0) {
      alert('Please select at least one child event to ungroup.');
      return;
    }

    const confirmMessage = `Are you sure you want to ungroup ${selectedChildIds.length} selected event(s)? They will become standalone events.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setUngrouping(true);
    try {
      const success = await MotherEventGroupingService.ungroupSpecificEvents(selectedChildIds);
      
      if (success) {
        console.log(`Successfully ungrouped ${selectedChildIds.length} event(s)`);
        // Reset ungroup mode and selection
        setIsUngroupMode(false);
        setSelectedChildIds([]);
        // Reload child events and notify parent
        await loadChildEvents(currentEvent.id);
        if (onEventUpdated) {
          onEventUpdated();
        }
      } else {
        alert('Failed to ungroup selected events. Please try again.');
      }
    } catch (error) {
      console.error('Error ungrouping selected events:', error);
      alert('Failed to ungroup selected events. Please try again.');
    } finally {
      setUngrouping(false);
    }
  };

  // Handle checkbox selection toggle
  const handleCheckboxChange = (childId: string) => {
    setSelectedChildIds(prev => {
      if (prev.includes(childId)) {
        return prev.filter(id => id !== childId);
      } else {
        return [...prev, childId];
      }
    });
  };

  // Toggle select all checkboxes
  const handleSelectAllChildren = () => {
    if (selectedChildIds.length === childEvents.length) {
      setSelectedChildIds([]);
    } else {
      setSelectedChildIds(childEvents.map(child => child.id));
    }
  };

  // Convert false event to normal event
  const handleConvertFalseToStandalone = async () => {
    console.log('🔄 [handleConvertFalseToStandalone] Starting conversion', {
      eventId: currentEvent.id,
      false_event: currentEvent.false_event,
      is_child_event: currentEvent.is_child_event,
      parent_event_id: currentEvent.parent_event_id
    });

    if (!confirm('Are you sure you want to convert this false event to a normal event? This will mark it as a real event.')) {
      return;
    }

    try {
      const updateData: any = {
        false_event: false,
        parent_event_id: null,
        is_child_event: false,
        remarks: (currentEvent.remarks || '') + `\n[Converted from false event on ${new Date().toISOString().split('T')[0]}]`
      };

      const { error } = await supabase
        .from('pq_events')
        .update(updateData)
        .eq('id', currentEvent.id);

      if (error) throw error;

      console.log('✅ Successfully converted false event to standalone event');
      
      // Update local state
      setCurrentEvent({ ...currentEvent, ...updateData });
      
      // Notify parent to reload data
      if (onEventUpdated) {
        onEventUpdated();
      }

      alert('Event successfully converted to standalone event.');
    } catch (error) {
      console.error('❌ Error converting false event to standalone:', error);
      alert('Failed to convert event. Please try again.');
    }
  };

  // Toggle mark false mode - shows checkboxes
  const handleMarkFalseMode = () => {
    setIsMarkFalseMode(true);
    setSelectedFalseChildIds([]);
  };

  // Cancel mark false mode - hides checkboxes and clears selection
  const handleCancelMarkFalse = () => {
    setIsMarkFalseMode(false);
    setSelectedFalseChildIds([]);
  };

  // Save mark false - mark selected children as false events
  const handleSaveMarkFalse = async () => {
    if (selectedFalseChildIds.length === 0) {
      alert('Please select at least one child event to mark as false.');
      return;
    }

    const confirmMessage = `Are you sure you want to mark ${selectedFalseChildIds.length} selected event(s) as false events? They will be removed from this event group.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setMarkingFalse(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const updateData: any = {
        false_event: true,
        parent_event_id: null,
        is_child_event: false,
      };

      // Update all selected child events
      for (const childId of selectedFalseChildIds) {
        const childEvent = childEvents.find(c => c.id === childId);
        const remarkAddition = `\n[Marked as false event, removed from group on ${timestamp}]`;
        
        const { error } = await supabase
          .from('pq_events')
          .update({
            ...updateData,
            remarks: (childEvent?.remarks || '') + remarkAddition
          })
          .eq('id', childId);

        if (error) {
          console.error(`Error marking child ${childId} as false:`, error);
          throw error;
        }
      }

      console.log(`✅ Successfully marked ${selectedFalseChildIds.length} child event(s) as false events`);
      
      // Reset mark false mode and selection
      setIsMarkFalseMode(false);
      setSelectedFalseChildIds([]);
      
      // Reload child events and notify parent
      await loadChildEvents(currentEvent.id);
      if (onEventUpdated) {
        onEventUpdated();
      }

      alert(`Successfully marked ${selectedFalseChildIds.length} event(s) as false events.`);
    } catch (error) {
      console.error('❌ Error marking child events as false:', error);
      alert('Failed to mark events as false. Please try again.');
    } finally {
      setMarkingFalse(false);
    }
  };

  // Handle checkbox selection toggle for mark false
  const handleMarkFalseCheckboxChange = (childId: string) => {
    setSelectedFalseChildIds(prev => {
      if (prev.includes(childId)) {
        return prev.filter(id => id !== childId);
      } else {
        return [...prev, childId];
      }
    });
  };

  // Toggle select all checkboxes for mark false (only non-false events)
  const handleSelectAllForMarkFalse = () => {
    const nonFalseChildren = childEvents.filter(child => !child.false_event);
    if (selectedFalseChildIds.length === nonFalseChildren.length) {
      setSelectedFalseChildIds([]);
    } else {
      setSelectedFalseChildIds(nonFalseChildren.map(child => child.id));
    }
  };

  // Mark mother event and all its children as false events
  const handleMarkMotherAndChildrenAsFalse = async () => {
    const confirmMessage = `Are you sure you want to mark this mother event and ALL its ${childEvents.length} child event(s) as false events? This action will keep them grouped but mark them all as false detections.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setMarkingFalse(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const remarkAddition = `\n[Marked as false event (entire group) on ${timestamp}]`;

      // Update mother event
      const { error: motherError } = await supabase
        .from('pq_events')
        .update({
          false_event: true,
          remarks: (currentEvent.remarks || '') + remarkAddition
        })
        .eq('id', currentEvent.id);

      if (motherError) {
        throw motherError;
      }

      // Update all child events
      for (const childEvent of childEvents) {
        const { error: childError } = await supabase
          .from('pq_events')
          .update({
            false_event: true,
            remarks: (childEvent.remarks || '') + remarkAddition
          })
          .eq('id', childEvent.id);

        if (childError) {
          throw childError;
        }
      }

      console.log(`✅ Successfully marked mother event and ${childEvents.length} child event(s) as false events`);
      
      // Reload current event and children
      await loadChildEvents(currentEvent.id);
      
      // Update current event state
      setCurrentEvent(prev => ({ ...prev, false_event: true }));
      
      // Notify parent component
      if (onEventUpdated) {
        onEventUpdated();
      }

      alert(`Successfully marked mother event and ${childEvents.length} child event(s) as false events.`);
    } catch (error) {
      console.error('❌ Error marking mother and children as false events:', error);
      alert('Failed to mark events as false. Please try again.');
    } finally {
      setMarkingFalse(false);
    }
  };

  const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
    setIsExporting(true);
    setShowExportDropdown(false);
    
    try {
      // Export current event and its children (if mother event)
      const eventsToExport: PQEvent[] = [currentEvent];
      if (currentEvent.is_mother_event && childEvents.length > 0) {
        eventsToExport.push(...childEvents);
      }
      
      // Create substations map
      const substationsMap = new Map<string, Substation>();
      if (currentSubstation) {
        substationsMap.set(currentSubstation.id, currentSubstation);
      }
      
      // Load substations for child events
      for (const child of childEvents) {
        if (child.substation_id && !substationsMap.has(child.substation_id)) {
          const { data } = await supabase
            .from('substations')
            .select('*')
            .eq('id', child.substation_id)
            .single();
          if (data) substationsMap.set(data.id, data);
        }
      }
      
      // Export based on format
      switch (format) {
        case 'excel':
          await ExportService.exportToExcel(
            eventsToExport, 
            substationsMap,
            `Event_${currentEvent.id.substring(0, 8)}_Export_${Date.now()}.xlsx`
          );
          break;
        case 'csv':
          await ExportService.exportToCSV(
            eventsToExport,
            substationsMap,
            `Event_${currentEvent.id.substring(0, 8)}_Export_${Date.now()}.csv`
          );
          break;
        case 'pdf':
          await ExportService.exportToPDF(
            eventsToExport,
            substationsMap,
            `Event_${currentEvent.id.substring(0, 8)}_Export_${Date.now()}.pdf`
          );
          break;
      }
      
      console.log(`✅ Successfully exported event and ${childEvents.length} children as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export event as ${format.toUpperCase()}. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate child events severity distribution for preview
  const getChildEventsSummary = () => {
    const severityCounts = childEvents.reduce((acc, child) => {
      acc[child.severity] = (acc[child.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const parts = [];
    if (severityCounts.critical) parts.push(`${severityCounts.critical} Critical`);
    if (severityCounts.high) parts.push(`${severityCounts.high} High`);
    if (severityCounts.medium) parts.push(`${severityCounts.medium} Medium`);
    if (severityCounts.low) parts.push(`${severityCounts.low} Low`);
    
    return parts.join(', ');
  };

  // Calculate voltage summary from mother + child events
  const calculateVoltageSummary = (): Record<string, { minVoltage: number | null; maxDuration: number | null }> => {
    const allEvents = currentEvent.is_mother_event 
      ? [currentEvent, ...childEvents] 
      : [currentEvent];
    
    const voltageLevels = ['380V', '11kV', '132kV', '400kV'] as const;
    
    const result: Record<string, { minVoltage: number | null; maxDuration: number | null }> = {};
    
    voltageLevels.forEach(level => {
      const eventsAtLevel = allEvents.filter(e => 
        e.meter?.voltage_level === level || currentMeter?.voltage_level === level
      );
      
      if (eventsAtLevel.length === 0) {
        result[level] = { minVoltage: null, maxDuration: null };
        return;
      }
      
      // Find minimum voltage (lowest value from v1, v2, v3)
      const minVoltage = Math.min(...eventsAtLevel.flatMap(e => 
        [e.v1, e.v2, e.v3].filter(v => v !== null && v !== undefined) as number[]
      ));
      
      // Find maximum duration
      const maxDuration = Math.max(...eventsAtLevel.map(e => e.duration_ms || 0));
      
      result[level] = { 
        minVoltage: isFinite(minVoltage) ? minVoltage : null, 
        maxDuration: isFinite(maxDuration) ? maxDuration : null 
      };
    });
    
    return result;
  };

  // Handle remark edit save
  const handleRemarkSave = async (eventId: string) => {
    const newRemark = remarkValues[eventId] || '';
    
    try {
      const { error } = await supabase
        .from('pq_events')
        .update({ remarks: newRemark })
        .eq('id', eventId);
      
      if (error) throw error;
      
      // Update local state
      if (eventId === currentEvent.id) {
        setCurrentEvent({ ...currentEvent, remarks: newRemark });
      } else {
        setChildEvents(childEvents.map(child => 
          child.id === eventId ? { ...child, remarks: newRemark } : child
        ));
      }
      
      setEditingRemarkId(null);
      console.log(`✅ Remark updated for event ${eventId}`);
    } catch (error) {
      console.error('❌ Error updating remark:', error);
      alert('Failed to update remark');
    }
  };

  // Initialize remark values when events load
  useEffect(() => {
    const allEvents = [currentEvent, ...childEvents];
    const initialRemarks: Record<string, string> = {};
    allEvents.forEach(event => {
      initialRemarks[event.id] = event.remarks || '';
    });
    setRemarkValues(initialRemarks);
  }, [currentEvent.id, childEvents]);

  // Load geographic locations for mother and child events (voltage_dip only)
  useEffect(() => {
    if (currentEvent.event_type !== 'voltage_dip') {
      setEventLocations([]);
      return;
    }

    const loadEventLocations = async () => {
      const allEvents = [currentEvent, ...childEvents];
      const locations: typeof eventLocations = [];

      for (const event of allEvents) {
        let latitude: number | null = null;
        let longitude: number | null = null;
        let voltageLevel = 'N/A';
        let substationCode = 'N/A';

        // Try to get location from meter first
        if (event.meter_id) {
          const { data: meter } = await supabase
            .from('pq_meters')
            .select('latitude, longitude, voltage_level, meter_id')
            .eq('id', event.meter_id)
            .single();

          if (meter?.latitude && meter?.longitude) {
            latitude = meter.latitude;
            longitude = meter.longitude;
            voltageLevel = meter.voltage_level || 'N/A';
            substationCode = meter.meter_id || 'N/A';
          }
        }

        // Fall back to substation if meter location not available
        if (!latitude || !longitude) {
          if (event.substation_id) {
            const { data: substation } = await supabase
              .from('substations')
              .select('latitude, longitude, voltage_level, code')
              .eq('id', event.substation_id)
              .single();

            if (substation?.latitude && substation?.longitude) {
              latitude = substation.latitude;
              longitude = substation.longitude;
              voltageLevel = substation.voltage_level || 'N/A';
              substationCode = substation.code || 'N/A';
            }
          }
        }

        // Add to locations if coordinates found
        if (latitude && longitude) {
          locations.push({
            eventId: event.id,
            isMother: event.id === currentEvent.id,
            latitude,
            longitude,
            voltageLevel,
            substationCode,
            timestamp: event.timestamp
          });
        }
      }

      setEventLocations(locations);
    };

    loadEventLocations();
  }, [currentEvent.id, currentEvent.event_type, childEvents]);

  // Hong Kong geographic bounds (same as SubstationMap)
  const HK_BOUNDS = {
    north: 22.58,
    south: 22.15,
    west: 113.83,
    east: 114.41
  };

  const MAP_WIDTH = 800;
  const MAP_HEIGHT = 480;

  // Convert latitude/longitude to pixel coordinates
  const latLngToPixel = (lat: number, lng: number): { x: number; y: number } => {
    const x = ((lng - HK_BOUNDS.west) / (HK_BOUNDS.east - HK_BOUNDS.west)) * MAP_WIDTH;
    const y = ((HK_BOUNDS.north - lat) / (HK_BOUNDS.north - HK_BOUNDS.south)) * MAP_HEIGHT;
    return { x, y };
  };

  return (
    <div className="space-y-6">
      {/* Back Navigation - only show when viewing child event */}
      {navigationStack.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleBackNavigation}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
        </div>
      )}

      {/* Header with Title and Delete Button */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900">
              Event Details
            </h2>
            {currentEvent.parent_event_id && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded">
                Child
              </span>
            )}
            {currentEvent.is_mother_event && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded">
                Mother
              </span>
            )}
            {currentEvent.false_event && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded">
                False Event
              </span>
            )}
            {currentEvent.is_late_event && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-sm font-semibold rounded">
                Late Event
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Export Button */}
            <div className="relative export-dropdown-container">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={isExporting}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
                title="Export Event"
              >
                <Download className="w-5 h-5" />
              </button>
              
              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                  <button
                    onClick={() => handleExport('excel')}
                    disabled={isExporting}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export to Excel
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    disabled={isExporting}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export to CSV
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={isExporting}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export to PDF
                  </button>
                </div>
              )}
            </div>
            
            {currentEvent.is_mother_event && (
              <>
                <button
                  onClick={handleUngroupEvents}
                  disabled={ungrouping}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all disabled:opacity-50"
                  title="Ungroup Events"
                >
                  <Ungroup className="w-5 h-5" />
                </button>
                <button
                  onClick={handleMarkMotherAndChildrenAsFalse}
                  disabled={markingFalse || childEvents.length === 0}
                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all disabled:opacity-50"
                  title="Mark Mother and All Children as False"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
              title="Delete Event"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-600 mt-1">ID: {currentEvent.id.substring(0, 8)}</p>
      </div>

      {/* Event Location Map - Only for voltage_dip events */}
      {currentEvent.event_type === 'voltage_dip' && eventLocations.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">Event Locations</h3>
            <p className="text-sm text-slate-600 mt-1">
              Geographic distribution of mother and child events
            </p>
          </div>

          {/* Map Container */}
          <div
            className="relative bg-slate-50 rounded-xl overflow-hidden border border-slate-200"
            style={{
              width: MAP_WIDTH,
              height: MAP_HEIGHT,
              backgroundImage: 'url(/hong-kong-map.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              margin: '0 auto'
            }}
          >
            <svg
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
              className="absolute inset-0"
            >
              {eventLocations.map(location => {
                const { x, y } = latLngToPixel(location.latitude, location.longitude);
                const color = location.isMother ? '#ef4444' : '#22c55e'; // Red for mother, Green for children
                const radius = location.isMother ? 12 : 8;

                return (
                  <g key={location.eventId}>
                    <circle
                      cx={x}
                      cy={y}
                      r={radius}
                      fill={color}
                      opacity={0.7}
                      stroke="white"
                      strokeWidth={2}
                      className="cursor-pointer transition-all hover:opacity-90"
                      onMouseEnter={() => setHoveredEventId(location.eventId)}
                      onMouseLeave={() => setHoveredEventId(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Tooltip */}
            {hoveredEventId && (() => {
              const hoveredLocation = eventLocations.find(loc => loc.eventId === hoveredEventId);
              if (!hoveredLocation) return null;

              const { x, y } = latLngToPixel(hoveredLocation.latitude, hoveredLocation.longitude);
              const tooltipX = x + 15;
              const tooltipY = y - 15;

              return (
                <div
                  className="absolute bg-white rounded-lg shadow-xl border border-slate-200 px-3 py-2 z-20 pointer-events-none"
                  style={{
                    left: `${tooltipX}px`,
                    top: `${tooltipY}px`,
                    transform: 'translateY(-100%)'
                  }}
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {hoveredLocation.voltageLevel} / {hoveredLocation.substationCode}
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-500"></div>
              <span className="text-sm text-slate-600">Mother Event</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500"></div>
              <span className="text-sm text-slate-600">Child Events</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('technical')}
            className={`px-4 py-2 font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === 'technical'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Technical
          </button>
          <button
            onClick={() => setActiveTab('impact')}
            className={`px-4 py-2 font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === 'impact'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Customer Impact
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2 font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === 'services'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              PQ Services ({services.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === 'timeline'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setActiveTab('idr')}
            className={`px-4 py-2 font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === 'idr'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              IDR
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-fadeIn">
            {/* 2-Column Layout: Overview Card (Left) + Voltage Summary (Right) */}
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column: Consolidated Overview Card */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-slate-600 px-3 py-2">
                  <h3 className="font-semibold text-white text-sm">Overview</h3>
                </div>
                <div className="p-4">
                  {/* 2-Column Grid Layout */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left Column */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Incident Time</label>
                        <p className="text-xs text-slate-900 mt-1">
                          {new Date(currentEvent.timestamp).toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          })} {new Date(currentEvent.timestamp).toLocaleTimeString('en-GB', { 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            second: '2-digit',
                            hour12: false 
                          })}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Source Substation</label>
                        <p className="text-xs text-slate-900 mt-1">
                          {currentSubstation ? currentSubstation.name : 'N/A'}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Voltage Level</label>
                        <p className="text-xs text-slate-900 mt-1">
                          {currentMeter?.voltage_level || 'N/A'}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ring No.</label>
                        <p className="text-xs text-slate-900 mt-1">
                          TTNR0003
                        </p>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email Sent Time</label>
                        <p className="text-xs text-slate-900 mt-1">
                          {new Date(currentEvent.timestamp).toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          })} 14:24:12
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Incident Condition</label>
                        <p className="text-xs text-slate-900 mt-1">
                          OC+ {currentMeter?.voltage_level || '11kV'} dip event
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* V1, V2, V3 Percentages */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">VL1(%)</label>
                        <p className="text-xs text-slate-900 mt-1">
                          {currentEvent.v1 !== null && currentEvent.v1 !== undefined ? currentEvent.v1.toFixed(1) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">VL2(%)</label>
                        <p className="text-xs text-slate-900 mt-1">
                          {currentEvent.v2 !== null && currentEvent.v2 !== undefined ? currentEvent.v2.toFixed(1) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">VL3(%)</label>
                        <p className="text-xs text-slate-900 mt-1">
                          {currentEvent.v3 !== null && currentEvent.v3 !== undefined ? currentEvent.v3.toFixed(1) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cause */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cause</label>
                    <p className="text-xs text-slate-900 mt-1">
                      {currentEvent.psbg_cause || currentEvent.cause || 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Voltage Summary Table */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-indigo-600 px-3 py-2">
                  <h3 className="font-semibold text-white text-sm">Voltage Summary</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Metric</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">380V</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">11kV</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">132kV</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">400kV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(() => {
                        const summary = calculateVoltageSummary();
                        return (
                          <>
                            <tr className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-medium text-slate-700">Min Voltage (%)</td>
                              <td className="px-3 py-2 text-center text-slate-900">{summary['380V'].minVoltage !== null ? summary['380V'].minVoltage.toFixed(1) : 'N/A'}</td>
                              <td className="px-3 py-2 text-center text-slate-900">{summary['11kV'].minVoltage !== null ? summary['11kV'].minVoltage.toFixed(1) : 'N/A'}</td>
                              <td className="px-3 py-2 text-center text-slate-900">{summary['132kV'].minVoltage !== null ? summary['132kV'].minVoltage.toFixed(1) : 'N/A'}</td>
                              <td className="px-3 py-2 text-center text-slate-900">{summary['400kV'].minVoltage !== null ? summary['400kV'].minVoltage.toFixed(1) : 'N/A'}</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-medium text-slate-700">Max Duration (ms)</td>
                              <td className="px-3 py-2 text-center text-slate-900">{summary['380V'].maxDuration !== null ? summary['380V'].maxDuration : 'N/A'}</td>
                              <td className="px-3 py-2 text-center text-slate-900">{summary['11kV'].maxDuration !== null ? summary['11kV'].maxDuration : 'N/A'}</td>
                              <td className="px-3 py-2 text-center text-slate-900">{summary['132kV'].maxDuration !== null ? summary['132kV'].maxDuration : 'N/A'}</td>
                              <td className="px-3 py-2 text-center text-slate-900">{summary['400kV'].maxDuration !== null ? summary['400kV'].maxDuration : 'N/A'}</td>
                            </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Harmonic Information Card - Only for harmonic events */}
            {currentEvent.event_type === 'harmonic' && (
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-purple-600 px-4 py-3">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Harmonic Information
                  </h3>
                </div>
                <div className="p-4">
                  {currentEvent.harmonic_event && typeof currentEvent.harmonic_event === 'object' ? (
                    <>
                      {/* 380V Display - 30 new columns in 2-column grid with 9 groups */}
                      {currentEvent.meter?.voltage_level === '380V' ? (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                          {/* Left Column */}
                          <div className="space-y-3">
                            {/* Group 1: Voltage (V) */}
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">Voltage (V)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">Va: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.voltage_va !== null && currentEvent.harmonic_event.voltage_va !== undefined ? currentEvent.harmonic_event.voltage_va.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Vb: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.voltage_vb !== null && currentEvent.harmonic_event.voltage_vb !== undefined ? currentEvent.harmonic_event.voltage_vb.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Vc: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.voltage_vc !== null && currentEvent.harmonic_event.voltage_vc !== undefined ? currentEvent.harmonic_event.voltage_vc.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                            
                            {/* Group 2: Current (IL)(A) */}
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">Current (IL)(A)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">Ia: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.current_ia !== null && currentEvent.harmonic_event.current_ia !== undefined ? currentEvent.harmonic_event.current_ia.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Ib: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.current_ib !== null && currentEvent.harmonic_event.current_ib !== undefined ? currentEvent.harmonic_event.current_ib.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Ic: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.current_ic !== null && currentEvent.harmonic_event.current_ic !== undefined ? currentEvent.harmonic_event.current_ic.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">IL Max: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.il_max !== null && currentEvent.harmonic_event.il_max !== undefined ? currentEvent.harmonic_event.il_max.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                            
                            {/* Group 3: THD (Voltage)(%) */}
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">THD (Voltage)(%)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">Phase A: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_voltage_a !== null && currentEvent.harmonic_event.thd_voltage_a !== undefined ? currentEvent.harmonic_event.thd_voltage_a.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase B: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_voltage_b !== null && currentEvent.harmonic_event.thd_voltage_b !== undefined ? currentEvent.harmonic_event.thd_voltage_b.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase C: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_voltage_c !== null && currentEvent.harmonic_event.thd_voltage_c !== undefined ? currentEvent.harmonic_event.thd_voltage_c.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                            
                            {/* Group 4: THD odd (Current) */}
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">THD odd (Current)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">Phase A: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_odd_current_a !== null && currentEvent.harmonic_event.thd_odd_current_a !== undefined ? currentEvent.harmonic_event.thd_odd_current_a.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase B: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_odd_current_b !== null && currentEvent.harmonic_event.thd_odd_current_b !== undefined ? currentEvent.harmonic_event.thd_odd_current_b.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase C: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_odd_current_c !== null && currentEvent.harmonic_event.thd_odd_current_c !== undefined ? currentEvent.harmonic_event.thd_odd_current_c.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                            
                            {/* Group 5: THD even */}
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">THD even</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">Phase A: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_even_a !== null && currentEvent.harmonic_event.thd_even_a !== undefined ? currentEvent.harmonic_event.thd_even_a.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase B: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_even_b !== null && currentEvent.harmonic_event.thd_even_b !== undefined ? currentEvent.harmonic_event.thd_even_b.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase C: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_even_c !== null && currentEvent.harmonic_event.thd_even_c !== undefined ? currentEvent.harmonic_event.thd_even_c.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Right Column */}
                          <div className="space-y-3">
                            {/* Group 6: THD (Current)(%) */}
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">THD (Current)(%)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">Phase A: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_current_a !== null && currentEvent.harmonic_event.thd_current_a !== undefined ? currentEvent.harmonic_event.thd_current_a.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase B: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_current_b !== null && currentEvent.harmonic_event.thd_current_b !== undefined ? currentEvent.harmonic_event.thd_current_b.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase C: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_current_c !== null && currentEvent.harmonic_event.thd_current_c !== undefined ? currentEvent.harmonic_event.thd_current_c.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                            
                            {/* Group 7: TDD Odd (Current) */}
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">TDD Odd (Current)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">Phase A: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.tdd_odd_current_a !== null && currentEvent.harmonic_event.tdd_odd_current_a !== undefined ? currentEvent.harmonic_event.tdd_odd_current_a.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase B: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.tdd_odd_current_b !== null && currentEvent.harmonic_event.tdd_odd_current_b !== undefined ? currentEvent.harmonic_event.tdd_odd_current_b.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase C: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.tdd_odd_current_c !== null && currentEvent.harmonic_event.tdd_odd_current_c !== undefined ? currentEvent.harmonic_event.tdd_odd_current_c.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                            
                            {/* Group 8: TDD even (Current) */}
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">TDD even (Current)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">Phase A: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.tdd_even_current_a !== null && currentEvent.harmonic_event.tdd_even_current_a !== undefined ? currentEvent.harmonic_event.tdd_even_current_a.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase B: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.tdd_even_current_b !== null && currentEvent.harmonic_event.tdd_even_current_b !== undefined ? currentEvent.harmonic_event.tdd_even_current_b.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase C: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.tdd_even_current_c !== null && currentEvent.harmonic_event.tdd_even_current_c !== undefined ? currentEvent.harmonic_event.tdd_even_current_c.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                            
                            {/* Group 9: TDD (Current)(%) */}
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">TDD (Current)(%)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">Phase A: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.tdd_current_a !== null && currentEvent.harmonic_event.tdd_current_a !== undefined ? currentEvent.harmonic_event.tdd_current_a.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase B: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.tdd_current_b !== null && currentEvent.harmonic_event.tdd_current_b !== undefined ? currentEvent.harmonic_event.tdd_current_b.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase C: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.tdd_current_c !== null && currentEvent.harmonic_event.tdd_current_c !== undefined ? currentEvent.harmonic_event.tdd_current_c.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                            
                            {/* Additional info: TDD Limit & Non-Compliance */}
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">Compliance</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">TDD Limit: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.tdd_limit !== null && currentEvent.harmonic_event.tdd_limit !== undefined ? currentEvent.harmonic_event.tdd_limit.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Non-Compliance: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.non_compliance !== null && currentEvent.harmonic_event.non_compliance !== undefined ? currentEvent.harmonic_event.non_compliance.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* 400kV/132kV/11kV Display - Original I1/I2/I3 columns */
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                          {/* Left Column: THD & TEHD */}
                          <div className="space-y-3">
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">THD (Total Harmonic Distortion)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">I1 THD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I1_THD_10m !== null && currentEvent.harmonic_event.I1_THD_10m !== undefined ? currentEvent.harmonic_event.I1_THD_10m.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">I2 THD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I2_THD_10m !== null && currentEvent.harmonic_event.I2_THD_10m !== undefined ? currentEvent.harmonic_event.I2_THD_10m.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">I3 THD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I3_THD_10m !== null && currentEvent.harmonic_event.I3_THD_10m !== undefined ? currentEvent.harmonic_event.I3_THD_10m.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">TEHD (Total Even Harmonic Distortion)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">I1 TEHD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I1_TEHD_10m !== null && currentEvent.harmonic_event.I1_TEHD_10m !== undefined ? currentEvent.harmonic_event.I1_TEHD_10m.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">I2 TEHD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I2_TEHD_10m !== null && currentEvent.harmonic_event.I2_TEHD_10m !== undefined ? currentEvent.harmonic_event.I2_TEHD_10m.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">I3 TEHD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I3_TEHD_10m !== null && currentEvent.harmonic_event.I3_TEHD_10m !== undefined ? currentEvent.harmonic_event.I3_TEHD_10m.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Right Column: TOHD & TDD */}
                          <div className="space-y-3">
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">TOHD (Total Odd Harmonic Distortion)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">I1 TOHD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I1_TOHD_10m !== null && currentEvent.harmonic_event.I1_TOHD_10m !== undefined ? currentEvent.harmonic_event.I1_TOHD_10m.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">I2 TOHD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I2_TOHD_10m !== null && currentEvent.harmonic_event.I2_TOHD_10m !== undefined ? currentEvent.harmonic_event.I2_TOHD_10m.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">I3 TOHD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I3_TOHD_10m !== null && currentEvent.harmonic_event.I3_TOHD_10m !== undefined ? currentEvent.harmonic_event.I3_TOHD_10m.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">TDD (Total Demand Distortion)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">I1 TDD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I1_TDD_10m !== null && currentEvent.harmonic_event.I1_TDD_10m !== undefined ? currentEvent.harmonic_event.I1_TDD_10m.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">I2 TDD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I2_TDD_10m !== null && currentEvent.harmonic_event.I2_TDD_10m !== undefined ? currentEvent.harmonic_event.I2_TDD_10m.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">I3 TDD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I3_TDD_10m !== null && currentEvent.harmonic_event.I3_TDD_10m !== undefined ? currentEvent.harmonic_event.I3_TDD_10m.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-6 text-slate-500">
                      <p className="text-sm">No harmonic data available for this event.</p>
                      <p className="text-xs mt-1">All values show N/A</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* False Event Actions - Only show for voltage_dip and voltage_swell */}
            {(() => {
              console.log('🔍 [Convert Button Condition]', {
                activeTab,
                event_type: currentEvent.event_type,
                false_event: currentEvent.false_event,
                shouldShow: currentEvent.false_event === true && (currentEvent.event_type === 'voltage_dip' || currentEvent.event_type === 'voltage_swell')
              });
              return currentEvent.false_event && (currentEvent.event_type === 'voltage_dip' || currentEvent.event_type === 'voltage_swell');
            })() && (
              <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <div>
                      <h3 className="font-semibold text-slate-900">False Event Detected</h3>
                      <p className="text-sm text-slate-600 mt-0.5">
                        This event has been validated as a false detection
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleConvertFalseToStandalone}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold shadow-md hover:shadow-lg"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Convert to normal event
                  </button>
                </div>
              </div>
            )}

            {/* Combined Mother/Child Events Table */}
            {(currentEvent.is_mother_event || !currentEvent.parent_event_id) && (
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3 flex items-center justify-between">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <GitBranch className="w-5 h-5" />
                    Event Details {currentEvent.is_mother_event && `(Mother + ${childEvents.length} Children)`}
                  </h3>
                  {currentEvent.is_mother_event && childEvents.length > 0 && (
                    <div className="flex items-center gap-2">
                      {!isUngroupMode && !isMarkFalseMode ? (
                        <>
                          <button
                            onClick={handleUngroupMode}
                            disabled={ungrouping || markingFalse}
                            className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-slate-400 text-sm font-medium"
                          >
                            <Ungroup className="w-4 h-4" />
                            Ungroup
                          </button>
                          {childEvents.some(child => !child.false_event) && (
                            <button
                              onClick={handleMarkFalseMode}
                              disabled={ungrouping || markingFalse}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-slate-400 text-sm font-medium"
                            >
                              <XCircle className="w-4 h-4" />
                              Mark False
                            </button>
                          )}
                        </>
                      ) : isUngroupMode ? (
                        <>
                          <button
                            onClick={handleCancelUngroup}
                            disabled={ungrouping}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-500 text-white rounded-lg hover:bg-slate-600 text-sm font-medium"
                          >
                            <XIcon className="w-4 h-4" />
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveUngroup}
                            disabled={ungrouping || selectedChildIds.length === 0}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-slate-400 text-sm font-medium"
                          >
                            <Save className="w-4 h-4" />
                            {ungrouping ? 'Saving...' : `Save (${selectedChildIds.length})`}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={handleCancelMarkFalse}
                            disabled={markingFalse}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-500 text-white rounded-lg hover:bg-slate-600 text-sm font-medium"
                          >
                            <XIcon className="w-4 h-4" />
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveMarkFalse}
                            disabled={markingFalse || selectedFalseChildIds.length === 0}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-slate-400 text-sm font-medium"
                          >
                            <Save className="w-4 h-4" />
                            {markingFalse ? 'Saving...' : `Save (${selectedFalseChildIds.length})`}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {(isUngroupMode || isMarkFalseMode) && (
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">
                            <input
                              type="checkbox"
                              checked={isUngroupMode 
                                ? selectedChildIds.length === childEvents.length && childEvents.length > 0
                                : selectedFalseChildIds.length === childEvents.filter(c => !c.false_event).length && childEvents.filter(c => !c.false_event).length > 0
                              }
                              onChange={isUngroupMode ? handleSelectAllChildren : handleSelectAllForMarkFalse}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                          </th>
                        )}
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">FI</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Incident Time</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Voltage Level</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Source Substation</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Tx No</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase">V1(%)</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase">V2(%)</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase">V3(%)</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase">Duration (ms)</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase">VL1(%) at 380</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase">VL2(%) at 380</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase">VL3(%) at 380</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase">Min volt</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase">FR Trigger</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase">Auto Group</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {/* Mother Event Row */}
                      {(() => {
                        const minVolt = Math.min(...[currentEvent.v1, currentEvent.v2, currentEvent.v3].filter(v => v !== null && v !== undefined) as number[]);
                        return (
                          <tr className="bg-purple-50 hover:bg-purple-100">
                            {(isUngroupMode || isMarkFalseMode) && <td className="px-3 py-2"></td>}
                            <td className="px-3 py-2 font-bold text-purple-700">1</td>
                            <td className="px-3 py-2">
                              {new Date(currentEvent.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(currentEvent.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                            </td>
                            <td className="px-3 py-2">{currentMeter?.voltage_level || 'N/A'}</td>
                            <td className="px-3 py-2">{currentSubstation?.code || 'N/A'}</td>
                            <td className="px-3 py-2 font-mono text-xs">{currentMeter?.circuit_id || 'N/A'}</td>
                            <td className="px-3 py-2 text-center">{currentEvent.v1?.toFixed(1) || 'N/A'}</td>
                            <td className="px-3 py-2 text-center">{currentEvent.v2?.toFixed(1) || 'N/A'}</td>
                            <td className="px-3 py-2 text-center">{currentEvent.v3?.toFixed(1) || 'N/A'}</td>
                            <td className="px-3 py-2 text-center">{currentEvent.duration_ms || 'N/A'}</td>
                            <td className="px-3 py-2 text-center">{currentEvent.v1?.toFixed(1) || 'N/A'}</td>
                            <td className="px-3 py-2 text-center">{currentEvent.v2?.toFixed(1) || 'N/A'}</td>
                            <td className="px-3 py-2 text-center">{currentEvent.v3?.toFixed(1) || 'N/A'}</td>
                            <td className="px-3 py-2 text-center">{isFinite(minVolt) ? (minVolt < 70 ? 'Yes' : 'No') : 'N/A'}</td>
                            <td className="px-3 py-2 text-center">{currentEvent.false_event ? 'No' : 'Yes'}</td>
                            <td className="px-3 py-2 text-center">{currentEvent.is_mother_event ? 'Yes' : 'No'}</td>
                            <td className="px-3 py-2">
                              {editingRemarkId === currentEvent.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={remarkValues[currentEvent.id] || ''}
                                    onChange={(e) => setRemarkValues({ ...remarkValues, [currentEvent.id]: e.target.value })}
                                    className="px-2 py-1 border border-slate-300 rounded text-xs w-full"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleRemarkSave(currentEvent.id)}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                    title="Save"
                                  >
                                    <Save className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingRemarkId(null);
                                      setRemarkValues({ ...remarkValues, [currentEvent.id]: currentEvent.remarks || '' });
                                    }}
                                    className="p-1 text-slate-600 hover:bg-slate-50 rounded"
                                    title="Cancel"
                                  >
                                    <XIcon className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs truncate">{currentEvent.remarks || '-'}</span>
                                  <button
                                    onClick={() => setEditingRemarkId(currentEvent.id)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Edit remark"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })()}
                      
                      {/* Child Event Rows (sorted by timestamp desc) */}
                      {[...childEvents].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((childEvent) => {
                        const minVolt = Math.min(...[childEvent.v1, childEvent.v2, childEvent.v3].filter(v => v !== null && v !== undefined) as number[]);
                        const isFalseEvent = childEvent.false_event;
                        const isDisabledInMarkFalseMode = isMarkFalseMode && isFalseEvent;
                        
                        return (
                          <tr 
                            key={childEvent.id} 
                            className={`hover:bg-slate-50 ${selectedChildIds.includes(childEvent.id) ? 'bg-blue-50' : ''} ${selectedFalseChildIds.includes(childEvent.id) ? 'bg-red-50' : ''} ${isDisabledInMarkFalseMode ? 'opacity-50' : ''} ${isFalseEvent ? 'bg-orange-50' : ''}`}
                          >
                            {isUngroupMode && (
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={selectedChildIds.includes(childEvent.id)}
                                  onChange={() => handleCheckboxChange(childEvent.id)}
                                  className="h-4 w-4 rounded border-slate-300"
                                />
                              </td>
                            )}
                            {isMarkFalseMode && (
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={selectedFalseChildIds.includes(childEvent.id)}
                                  onChange={() => handleMarkFalseCheckboxChange(childEvent.id)}
                                  disabled={isFalseEvent}
                                  className="h-4 w-4 rounded border-slate-300 disabled:opacity-50"
                                  title={isFalseEvent ? 'Already marked as false event' : 'Select to mark as false'}
                                />
                              </td>
                            )}
                            <td className="px-3 py-2 font-bold text-slate-600">
                              0{isFalseEvent && <span className="ml-1 text-xs text-orange-600">(F)</span>}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {new Date(childEvent.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(childEvent.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                            </td>
                            <td className="px-3 py-2 text-xs">{childEvent.meter?.voltage_level || 'N/A'}</td>
                            <td className="px-3 py-2 text-xs">{childEvent.substation?.code || 'N/A'}</td>
                            <td className="px-3 py-2 font-mono text-xs">{childEvent.meter?.circuit_id || 'N/A'}</td>
                            <td className="px-3 py-2 text-center text-xs">{childEvent.v1?.toFixed(1) || 'N/A'}</td>
                            <td className="px-3 py-2 text-center text-xs">{childEvent.v2?.toFixed(1) || 'N/A'}</td>
                            <td className="px-3 py-2 text-center text-xs">{childEvent.v3?.toFixed(1) || 'N/A'}</td>
                            <td className="px-3 py-2 text-center text-xs">{childEvent.duration_ms || 'N/A'}</td>
                            <td className="px-3 py-2 text-center text-xs">{childEvent.v1?.toFixed(1) || 'N/A'}</td>
                            <td className="px-3 py-2 text-center text-xs">{childEvent.v2?.toFixed(1) || 'N/A'}</td>
                            <td className="px-3 py-2 text-center text-xs">{childEvent.v3?.toFixed(1) || 'N/A'}</td>
                            <td className="px-3 py-2 text-center text-xs">{isFinite(minVolt) ? (minVolt < 70 ? 'Yes' : 'No') : 'N/A'}</td>
                            <td className="px-3 py-2 text-center text-xs">{childEvent.false_event ? 'No' : 'Yes'}</td>
                            <td className="px-3 py-2 text-center text-xs">Yes</td>
                            <td className="px-3 py-2">
                              {editingRemarkId === childEvent.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={remarkValues[childEvent.id] || ''}
                                    onChange={(e) => setRemarkValues({ ...remarkValues, [childEvent.id]: e.target.value })}
                                    className="px-2 py-1 border border-slate-300 rounded text-xs w-full"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleRemarkSave(childEvent.id)}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                    title="Save"
                                  >
                                    <Save className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingRemarkId(null);
                                      setRemarkValues({ ...remarkValues, [childEvent.id]: childEvent.remarks || '' });
                                    }}
                                    className="p-1 text-slate-600 hover:bg-slate-50 rounded"
                                    title="Cancel"
                                  >
                                    <XIcon className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs truncate">{childEvent.remarks || '-'}</span>
                                  <button
                                    onClick={() => setEditingRemarkId(childEvent.id)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Edit remark"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TECHNICAL TAB */}
        {activeTab === 'technical' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Technical Specifications */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <h4 className="font-semibold text-slate-900 mb-4">Technical Specifications</h4>
              <dl className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <dt className="text-sm text-slate-600 mb-2">Remaining Voltage:</dt>
                  <dd className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-900">
                        {currentEvent.remaining_voltage ? `${currentEvent.remaining_voltage.toFixed(1)}%` : 'N/A'}
                      </span>
                      <span className="text-slate-600">of nominal</span>
                    </div>
                    {currentEvent.remaining_voltage && (
                      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            currentEvent.remaining_voltage >= 90 ? 'bg-green-500' :
                            currentEvent.remaining_voltage >= 70 ? 'bg-yellow-500' :
                            currentEvent.remaining_voltage >= 50 ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${currentEvent.remaining_voltage}%` }}
                        />
                      </div>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-600">Special Event:</dt>
                  <dd className="flex items-center gap-2 mt-1">
                    {currentEvent.is_special_event ? (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm font-semibold">
                        ⭐ Excluded from SARFI
                      </span>
                    ) : (
                      <span className="text-slate-600 text-sm">No</span>
                    )}
                  </dd>
                </div>
                {/* False Event - Only show for voltage_dip and voltage_swell */}
                {(currentEvent.event_type === 'voltage_dip' || currentEvent.event_type === 'voltage_swell') && (
                  <div>
                    <dt className="text-sm text-slate-600">False Event:</dt>
                    <dd className="flex items-center gap-2 mt-1">
                      {currentEvent.false_event ? (
                        <>
                          <XCircle className="w-5 h-5 text-red-600" />
                          <span className="font-semibold text-red-700">Yes</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-green-700">No</span>
                        </>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* SARFI Analysis - Hidden for harmonic events */}
            {currentEvent.event_type !== 'harmonic' && (
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-4">SARFI Analysis</h4>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-slate-600">S10:</dt>
                    <dd className="font-semibold text-slate-900">{currentEvent.sarfi_10 !== null ? currentEvent.sarfi_10.toFixed(5) : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">S20:</dt>
                    <dd className="font-semibold text-slate-900">{currentEvent.sarfi_20 !== null ? currentEvent.sarfi_20.toFixed(5) : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">S30:</dt>
                    <dd className="font-semibold text-slate-900">{currentEvent.sarfi_30 !== null ? currentEvent.sarfi_30.toFixed(5) : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">S40:</dt>
                    <dd className="font-semibold text-slate-900">{currentEvent.sarfi_40 !== null ? currentEvent.sarfi_40.toFixed(5) : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">S50:</dt>
                    <dd className="font-semibold text-slate-900">{currentEvent.sarfi_50 !== null ? currentEvent.sarfi_50.toFixed(5) : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">S60:</dt>
                    <dd className="font-semibold text-slate-900">{currentEvent.sarfi_60 !== null ? currentEvent.sarfi_60.toFixed(5) : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">S70:</dt>
                    <dd className="font-semibold text-slate-900">{currentEvent.sarfi_70 !== null ? currentEvent.sarfi_70.toFixed(5) : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">S80:</dt>
                    <dd className="font-semibold text-slate-900">{currentEvent.sarfi_80 !== null ? currentEvent.sarfi_80.toFixed(5) : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">S90:</dt>
                    <dd className="font-semibold text-slate-900">{currentEvent.sarfi_90 !== null ? currentEvent.sarfi_90.toFixed(5) : 'N/A'}</dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Waveform Display */}
            <WaveformViewer 
              csvData={waveformCsvData} 
              event={currentEvent}
              eventType={currentEvent.event_type}
            />
          </div>
        )}

        {/* CUSTOMER IMPACT TAB */}
        {activeTab === 'impact' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Impact Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg text-center">
                <div className="text-3xl font-bold text-yellow-900">
                  {currentEvent.customer_count || 0}
                </div>
                <div className="text-sm text-yellow-700 mt-1">Total Customers</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-900">
                  {currentImpacts.length}
                </div>
                <div className="text-sm text-blue-700 mt-1">Detailed Records</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg text-center">
                <div className="text-3xl font-bold text-purple-900">
                  {currentImpacts.length > 0 
                    ? Math.round(currentImpacts.reduce((sum, imp) => sum + (imp.estimated_downtime_min || 0), 0) / currentImpacts.length)
                    : 0}
                </div>
                <div className="text-sm text-purple-700 mt-1">Avg Downtime (min)</div>
              </div>
            </div>

            {/* Customer Impact Table */}
            {currentImpacts.length > 0 ? (
              <div>
                <h3 className="flex items-center gap-2 mb-3 font-semibold text-slate-900">
                  <Users className="w-5 h-5" />
                  Detailed Customer Records
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {currentImpacts.map((impact, index) => {
                    // Debug logging for each impact
                    if (index === 0) {
                      console.log('🔍 [EventDetails] Rendering impacts in Customer Impact tab:', {
                        totalCount: currentImpacts.length,
                        firstImpact: {
                          id: impact.id,
                          customer_id: impact.customer_id,
                          hasCustomerObject: !!impact.customer,
                          customerName: impact.customer?.name || 'NO NAME',
                          customerAddress: impact.customer?.address || 'NO ADDRESS',
                          customerAccount: impact.customer?.account_number || 'NO ACCOUNT',
                          impactLevel: impact.impact_level,
                          downtime: impact.estimated_downtime_min
                        },
                        allImpactStructure: impact
                      });
                    }
                    
                    return (
                      <div key={impact.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <button
                              onClick={() => {
                                console.log('👆 [EventDetails] Customer clicked:', {
                                  customer_id: impact.customer_id,
                                  hasCustomerObject: !!impact.customer,
                                  customer: impact.customer ? {
                                    id: impact.customer.id,
                                    name: impact.customer.name,
                                    account_number: impact.customer.account_number,
                                    address: impact.customer.address
                                  } : 'No customer object'
                                });
                                if (impact.customer) {
                                  setSelectedCustomer(impact.customer);
                                  setShowCustomerHistory(true);
                                }
                              }}
                              disabled={!impact.customer}
                              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline text-left disabled:text-slate-900 disabled:cursor-default disabled:hover:no-underline"
                              title={impact.customer ? 'Click to view event history' : 'Customer data not available'}
                            >
                              {impact.customer?.name || `[Customer ID: ${impact.customer_id}]`}
                            </button>
                            <p className="text-sm text-slate-600">
                              {impact.customer?.address || '[No address]'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Account: {impact.customer?.account_number || '[No account]'}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                              impact.impact_level === 'severe' ? 'bg-red-100 text-red-700' :
                              impact.impact_level === 'moderate' ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {impact.impact_level}
                            </span>
                            <p className="text-xs text-slate-600 mt-1">
                              {impact.estimated_downtime_min} min
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No detailed customer impact records available</p>
                {currentEvent.customer_count && currentEvent.customer_count > 0 && (
                  <p className="text-sm mt-2">Total affected: {currentEvent.customer_count} customers</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* CHILD EVENTS TAB - REMOVED: Child events are now displayed in Overview tab */}
        {/* The Combined Mother/Child Events Table in Overview tab shows all child events */}
        {false && activeTab === 'overview' && currentEvent.is_mother_event && (
          <div className="space-y-6 animate-fadeIn">
            {/* Collapsible Header */}
            <button
              onClick={() => setChildEventsExpanded(!childEventsExpanded)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg hover:from-purple-100 hover:to-purple-150 transition-all"
            >
              <div className="flex items-center gap-3">
                <GitBranch className="w-5 h-5 text-purple-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-slate-900">
                    Child Events ({childEvents.length})
                  </h3>
                  {!childEventsExpanded && childEvents.length > 0 && (
                    <p className="text-sm text-slate-600">
                      {getChildEventsSummary()}
                    </p>
                  )}
                </div>
              </div>
              {childEventsExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-600" />
              )}
            </button>

            {/* Ungroup & Mark False Action Buttons */}
            {childEventsExpanded && childEvents.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  {isUngroupMode && (
                    <>
                      <input
                        type="checkbox"
                        checked={selectedChildIds.length === childEvents.length}
                        onChange={handleSelectAllChildren}
                        className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="font-medium">
                        {selectedChildIds.length > 0 
                          ? `${selectedChildIds.length} selected`
                          : 'Select all'
                        }
                      </span>
                    </>
                  )}
                  {isMarkFalseMode && (
                    <>
                      <input
                        type="checkbox"
                        checked={selectedFalseChildIds.length === childEvents.filter(c => !c.false_event).length && childEvents.filter(c => !c.false_event).length > 0}
                        onChange={handleSelectAllForMarkFalse}
                        className="h-4 w-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                      />
                      <span className="font-medium">
                        {selectedFalseChildIds.length > 0 
                          ? `${selectedFalseChildIds.length} selected`
                          : 'Select all'
                        }
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isUngroupMode && !isMarkFalseMode ? (
                    <>
                      <button
                        onClick={handleUngroupMode}
                        disabled={ungrouping || markingFalse}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <Ungroup className="w-4 h-4" />
                        Ungroup
                      </button>
                      {childEvents.some(child => !child.false_event) && (
                        <button
                          onClick={handleMarkFalseMode}
                          disabled={ungrouping || markingFalse}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Mark False
                        </button>
                      )}
                    </>
                  ) : isUngroupMode ? (
                    <>
                      <button
                        onClick={handleCancelUngroup}
                        disabled={ungrouping}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <XIcon className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveUngroup}
                        disabled={ungrouping || selectedChildIds.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        {ungrouping ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleCancelMarkFalse}
                        disabled={markingFalse}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <XIcon className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveMarkFalse}
                        disabled={markingFalse || selectedFalseChildIds.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        {markingFalse ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Expandable Table */}
            {childEventsExpanded && (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                {loading ? (
                  <div className="py-12 text-center text-slate-500">
                    Loading child events...
                  </div>
                ) : childEvents.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {(isUngroupMode || isMarkFalseMode) && (
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-12">
                            <input
                              type="checkbox"
                              checked={
                                isUngroupMode 
                                  ? selectedChildIds.length === childEvents.length
                                  : selectedFalseChildIds.length === childEvents.filter(c => !c.false_event).length && childEvents.filter(c => !c.false_event).length > 0
                              }
                              onChange={isUngroupMode ? handleSelectAllChildren : handleSelectAllForMarkFalse}
                              className={`h-4 w-4 rounded border-slate-300 ${
                                isUngroupMode ? 'text-blue-600 focus:ring-blue-500' : 'text-red-600 focus:ring-red-500'
                              }`}
                            />
                          </th>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Time</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Meter</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Severity</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Circuit</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">V. Level</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Rem. %</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Duration</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {childEvents.map((childEvent, index) => {
                        const isFalseEvent = childEvent.false_event;
                        const isDisabledInMarkFalseMode = isMarkFalseMode && isFalseEvent;
                        
                        return (
                          <tr
                            key={childEvent.id}
                            className={`transition-colors ${
                              (isUngroupMode || isMarkFalseMode) ? '' : 'cursor-pointer hover:bg-slate-50'
                            } ${
                              selectedChildIds.includes(childEvent.id) ? 'bg-blue-50' : ''
                            } ${
                              selectedFalseChildIds.includes(childEvent.id) ? 'bg-red-50' : ''
                            } ${
                              isDisabledInMarkFalseMode ? 'opacity-50 bg-slate-100' : ''
                            }`}
                            onClick={() => {
                              if (!isUngroupMode && !isMarkFalseMode) {
                                handleChildEventClick(childEvent);
                              }
                            }}
                          >
                            {isUngroupMode && (
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedChildIds.includes(childEvent.id)}
                                  onChange={() => handleCheckboxChange(childEvent.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                />
                              </td>
                            )}
                            {isMarkFalseMode && (
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedFalseChildIds.includes(childEvent.id)}
                                  onChange={() => handleMarkFalseCheckboxChange(childEvent.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  disabled={isFalseEvent}
                                  className="h-4 w-4 text-red-600 rounded border-slate-300 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={isFalseEvent ? 'Already marked as false event' : 'Select to mark as false'}
                                />
                              </td>
                            )}
                          <td className="px-4 py-3 text-sm text-slate-600">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900 capitalize">
                                {childEvent.event_type.replace('_', ' ')}
                              </span>
                              {isFalseEvent && (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded border border-orange-300">
                                  FALSE EVENT
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {new Date(childEvent.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                            {childEvent.meter_id || 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              childEvent.severity === 'critical' ? 'bg-red-100 text-red-700' :
                              childEvent.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                              childEvent.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {childEvent.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {childEvent.meter?.circuit_id || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {childEvent.meter?.voltage_level || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                            {childEvent.remaining_voltage ? `${childEvent.remaining_voltage.toFixed(1)}%` : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {childEvent.duration_ms && childEvent.duration_ms < 1000
                              ? `${childEvent.duration_ms}ms`
                              : `${((childEvent.duration_ms || 0) / 1000).toFixed(2)}s`
                            }
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChildEventClick(childEvent);
                              }}
                              className="text-blue-600 hover:text-blue-700 text-sm font-semibold hover:underline"
                            >
                              View →
                            </button>
                          </td>
                        </tr>
                      );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-12 text-center text-slate-500">
                    <GitBranch className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No child events found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'services' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-600" />
                PQ Service Records
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setServicesDetailView(!servicesDetailView)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium text-slate-700"
                >
                  {servicesDetailView ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      Simple View
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Detail View
                    </>
                  )}
                </button>
                <div className="text-sm text-slate-600">
                  {services.length} service{services.length !== 1 ? 's' : ''} logged for this event
                </div>
              </div>
            </div>

            {loadingServices ? (
              <div className="py-12 text-center text-slate-500">
                <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                <p className="mt-3">Loading services...</p>
              </div>
            ) : services.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                <Wrench className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="font-medium text-lg">No PQ services found</p>
                <p className="text-sm mt-1">No service records have been logged for this event yet</p>
              </div>
            ) : servicesDetailView ? (
              // DETAIL VIEW: 2-column card layout with all fields
              <div className="space-y-4">
                {services.map((service) => {
                  const serviceTypeLabels: Record<string, string> = {
                    site_survey: 'Site Survey',
                    harmonic_analysis: 'Harmonic Analysis',
                    consultation: 'Consultation',
                    on_site_study: 'On-site Study',
                    power_quality_audit: 'Power Quality Audit',
                    installation_support: 'Installation Support',
                  };

                  return (
                    <div key={service.id} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4 pb-4 border-b border-slate-200">
                        <div>
                          <h4 className="text-lg font-bold text-slate-900">
                            Case #{service.case_number || 'N/A'}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {serviceTypeLabels[service.service_type] || service.service_type}
                            </span>
                            {service.is_closed ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                Closed
                              </span>
                            ) : service.is_in_progress ? (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                                In Progress
                              </span>
                            ) : null}
                            {service.completed_before_target !== null && (
                              service.completed_before_target ? (
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                                  ✓ On Time
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                                  ⚠ Late
                                </span>
                              )
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Request Date</p>
                          <p className="font-semibold text-slate-900">
                            {new Date(service.service_date).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                      </div>

                      {/* 2-Column Layout */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        {/* Customer Information */}
                        <div className="space-y-3">
                          <h5 className="font-semibold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-200 pb-2">
                            Customer Information
                          </h5>
                          <div>
                            <p className="text-xs text-slate-500">Customer Premises Location</p>
                            {service.customer ? (
                              <div>
                                <p className="font-medium text-slate-900">{service.customer.name}</p>
                                <p className="text-sm text-slate-600">{service.customer.address || 'N/A'}</p>
                                <p className="text-xs text-slate-500 mt-1">Acc: {service.customer.account_number}</p>
                              </div>
                            ) : (
                              <p className="text-slate-400">N/A</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Tariff Group</p>
                            <p className="font-medium text-slate-900">{service.tariff_group || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Business Nature</p>
                            <p className="font-medium text-slate-900">{service.business_nature || 'N/A'}</p>
                          </div>
                        </div>

                        {/* Service Details */}
                        <div className="space-y-3">
                          <h5 className="font-semibold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-200 pb-2">
                            Service Details
                          </h5>
                          <div>
                            <p className="text-xs text-slate-500">Service</p>
                            <p className="font-medium text-slate-900 text-sm whitespace-pre-wrap">
                              {service.content 
                                ? service.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)
                                : 'No description'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Engineer</p>
                            <p className="font-medium text-slate-900">
                              {service.engineer?.full_name || 'Not assigned'}
                            </p>
                          </div>
                          {service.participant_count && (
                            <div>
                              <p className="text-xs text-slate-500">No. of Participants</p>
                              <p className="font-medium text-slate-900">{service.participant_count}</p>
                            </div>
                          )}
                        </div>

                        {/* Financial Information */}
                        <div className="space-y-3">
                          <h5 className="font-semibold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-200 pb-2">
                            Financial
                          </h5>
                          <div>
                            <p className="text-xs text-slate-500">Service Charging (HKD)</p>
                            <p className="font-medium text-slate-900">
                              {service.service_charge_amount 
                                ? `$${service.service_charge_amount.toLocaleString()}k` 
                                : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Party To Be Charged</p>
                            <p className="font-medium text-slate-900">{service.party_charged || 'N/A'}</p>
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="space-y-3">
                          <h5 className="font-semibold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-200 pb-2">
                            Key Dates
                          </h5>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-slate-500">Planned Reply</p>
                              <p className="font-medium text-slate-900">
                                {service.planned_reply_date 
                                  ? new Date(service.planned_reply_date).toLocaleDateString('en-GB')
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">Actual Reply</p>
                              <p className="font-medium text-slate-900">
                                {service.actual_reply_date 
                                  ? new Date(service.actual_reply_date).toLocaleDateString('en-GB')
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">Planned Report</p>
                              <p className="font-medium text-slate-900">
                                {service.planned_report_issue_date 
                                  ? new Date(service.planned_report_issue_date).toLocaleDateString('en-GB')
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">Actual Report</p>
                              <p className="font-medium text-slate-900">
                                {service.actual_report_issue_date 
                                  ? new Date(service.actual_report_issue_date).toLocaleDateString('en-GB')
                                  : 'N/A'}
                              </p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-slate-500">Service Completion</p>
                              <p className="font-medium text-slate-900">
                                {service.completion_date 
                                  ? new Date(service.completion_date).toLocaleDateString('en-GB')
                                  : 'Not completed'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Substation/Circuit Info */}
                        <div className="space-y-3 md:col-span-2">
                          <h5 className="font-semibold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-200 pb-2">
                            Substation / Circuit Information
                          </h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-slate-500">132kV Primary S/S Name & Txn No.</p>
                              <p className="font-medium text-slate-900">{service.ss132_info || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">11kV Customer S/S Code & Txn No.</p>
                              <p className="font-medium text-slate-900">{service.ss011_info || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // SIMPLE VIEW: Table with crucial columns only
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Case No.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Customer Premises
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Request Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Service Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Completion Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {services.map((service) => {
                      const serviceTypeLabels: Record<string, string> = {
                        site_survey: 'Site Survey',
                        harmonic_analysis: 'Harmonic Analysis',
                        consultation: 'Consultation',
                        on_site_study: 'On-site Study',
                        power_quality_audit: 'Power Quality Audit',
                        installation_support: 'Installation Support',
                      };

                      return (
                        <tr key={service.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-900">
                            #{service.case_number || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {service.customer ? (
                              <div>
                                <div className="font-medium">{service.customer.name}</div>
                                <div className="text-xs text-slate-500 truncate max-w-xs">
                                  {service.customer.address || 'N/A'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                            {new Date(service.service_date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {serviceTypeLabels[service.service_type] || service.service_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {service.is_closed ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                ✓ Closed
                              </span>
                            ) : service.is_in_progress ? (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                                ⏳ In Progress
                              </span>
                            ) : (
                              <span className="text-slate-400">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                            {service.completion_date 
                              ? new Date(service.completion_date).toLocaleDateString('en-GB')
                              : <span className="text-slate-400">Pending</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {services.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Read-Only View</p>
                    <p className="text-xs text-blue-700 mt-1">
                      This tab displays PQ service records linked to this event. To add, edit, or view full details, please use the PQ Services module.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Filter Header */}
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Event Timeline & Audit Log
                </h4>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-600" />
                  <select
                    value={auditLogFilter}
                    onChange={(e) => setAuditLogFilter(e.target.value as EventOperationType | 'all')}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">All Operations</option>
                    <option value="false_event">False Event</option>
                    <option value="group">Group</option>
                    <option value="idr">IDR</option>
                    <option value="status_update">Status Update</option>
                  </select>
                  <span className="text-sm text-slate-600">
                    {auditLogFilter === 'all' 
                      ? `${auditLogs.length} total operations`
                      : `${auditLogs.filter(log => {
                          const categoryMap: Record<string, EventOperationType[]> = {
                            'false_event': ['marked_false', 'converted_from_false', 'batch_marked_false'],
                            'group': ['grouped_automatic', 'grouped_manual', 'ungrouped_full', 'ungrouped_partial'],
                            'idr': ['idr_created', 'idr_updated'],
                            'status_update': ['event_created', 'event_detected', 'status_changed', 'severity_changed', 'cause_updated', 'psbg_cause_updated', 'event_modified', 'event_resolved', 'event_deleted']
                          };
                          return categoryMap[auditLogFilter]?.includes(log.operation_type) || false;
                        }).length} operations`
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline Content */}
            <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              {loadingAuditLogs ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className="ml-3 text-slate-600">Loading timeline...</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">No Timeline Data</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Event history will appear here as operations are performed
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-6 relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-purple-200" />
                    
                    {/* Filter and display audit logs */}
                    {auditLogs
                      .filter(log => {
                        if (auditLogFilter === 'all') return true;
                        
                        // Map categories to operation types
                        const categoryMap: Record<string, EventOperationType[]> = {
                          'false_event': ['marked_false', 'converted_from_false', 'batch_marked_false'],
                          'group': ['grouped_automatic', 'grouped_manual', 'ungrouped_full', 'ungrouped_partial'],
                          'idr': ['idr_created', 'idr_updated'],
                          'status_update': ['event_created', 'event_detected', 'status_changed', 'severity_changed', 'cause_updated', 'psbg_cause_updated', 'event_modified', 'event_resolved', 'event_deleted']
                        };
                        
                        return categoryMap[auditLogFilter]?.includes(log.operation_type) || false;
                      })
                      .map((log) => {
                        const color = EventAuditService.getOperationTypeColor(log.operation_type);
                        const icon = EventAuditService.getOperationTypeIcon(log.operation_type);
                        const label = EventAuditService.getOperationTypeLabel(log.operation_type);
                        
                        return (
                          <div key={log.id} className="flex items-start gap-4 relative">
                            <div 
                              className={`w-8 h-8 rounded-full bg-${color}-500 flex items-center justify-center text-white font-bold text-sm z-10 shadow-md`}
                              style={{
                                backgroundColor: 
                                  color === 'purple' ? '#9333ea' :
                                  color === 'red' ? '#ef4444' :
                                  color === 'green' ? '#10b981' :
                                  color === 'blue' ? '#3b82f6' :
                                  color === 'indigo' ? '#6366f1' :
                                  color === 'orange' ? '#f97316' :
                                  color === 'teal' ? '#14b8a6' :
                                  color === 'cyan' ? '#06b6d4' :
                                  color === 'yellow' ? '#eab308' :
                                  color === 'slate' ? '#64748b' :
                                  '#9ca3af'
                              }}
                            >
                              <span className="text-xs">{icon}</span>
                            </div>
                            <div className="flex-1 pt-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-slate-900">{label}</span>
                                <span className="text-sm text-slate-600">
                                  {new Date(log.created_at).toLocaleString()}
                                </span>
                              </div>
                              
                              {/* Operation Details */}
                              {log.operation_details?.note && (
                                <p className="text-sm text-slate-600">{log.operation_details.note}</p>
                              )}
                              
                              {/* Affected Fields for IDR/Event updates */}
                              {log.operation_details?.affected_fields && (
                                <p className="text-xs text-slate-500 mt-1">
                                  <span className="font-medium">Fields:</span> {log.operation_details.affected_fields.join(', ')}
                                </p>
                              )}
                              
                              {/* Child Events for grouping/ungrouping */}
                              {log.operation_details?.child_event_ids && (
                                <p className="text-xs text-slate-500 mt-1">
                                  <span className="font-medium">Affected Events:</span> {log.operation_details.child_event_ids.length}
                                </p>
                              )}
                              
                              {/* Status/Severity changes */}
                              {(log.operation_details?.from || log.operation_details?.to) && (
                                <p className="text-xs text-slate-500 mt-1">
                                  <span className="font-medium">Changed:</span>{' '}
                                  {log.operation_details.from || 'None'} → {log.operation_details.to || 'None'}
                                </p>
                              )}
                              
                              {/* User Information */}
                              {log.user_id && log.user && (
                                <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {log.user.full_name || log.user.email}
                                </p>
                              )}
                              
                              {!log.user_id && (
                                <p className="text-xs text-slate-400 mt-1 italic">System operation</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Total Duration */}
                  {auditLogs.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-purple-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Event Lifecycle Duration:</span>
                        <span className="font-bold text-purple-900">
                          {(() => {
                            const firstLog = auditLogs[0];
                            const lastLog = auditLogs[auditLogs.length - 1];
                            const durationMs = new Date(lastLog.created_at).getTime() - new Date(firstLog.created_at).getTime();
                            const minutes = Math.round(durationMs / 1000 / 60);
                            
                            if (minutes < 60) {
                              return `${minutes} minutes`;
                            } else if (minutes < 1440) {
                              const hours = Math.floor(minutes / 60);
                              const remainingMinutes = minutes % 60;
                              return `${hours}h ${remainingMinutes}m`;
                            } else {
                              const days = Math.floor(minutes / 1440);
                              const hours = Math.floor((minutes % 1440) / 60);
                              return `${days}d ${hours}h`;
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* IDR TAB */}
        {activeTab === 'idr' && (
          <div className="space-y-4 animate-fadeIn">
            {loadingIDR ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-slate-600">Loading IDR record...</span>
              </div>
            ) : (
              <>
            {/* Edit/Save/Cancel Buttons */}
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-slate-900">Incident Data Record (IDR)</span>
                {idrRecord && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                    Saved
                  </span>
                )}
                {currentEvent.manual_create_idr && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                    Manual
                  </span>
                )}
                {!currentEvent.manual_create_idr && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                    Auto
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isEditingIDR ? (
                  <>
                    {/* Match IDR Button - Show for voltage_dip events (with or without IDR) */}
                    {currentEvent.event_type === 'voltage_dip' && (
                      <button
                        onClick={() => {
                          console.log('🔍 Match IDR button clicked');
                          console.log('Current showMatchIDRPanel state:', showMatchIDRPanel);
                          setShowMatchIDRPanel(true);
                          console.log('Setting showMatchIDRPanel to true');
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all text-sm font-semibold shadow-sm"
                      >
                        <FileText className="w-4 h-4" />
                        Match IDR
                      </button>
                    )}

                    {/* Export Button - Show for voltage_dip events WITH IDR */}
                    {idrRecord && currentEvent.event_type === 'voltage_dip' && (
                      <button
                        onClick={async () => {
                          try {
                            // Export current IDR record to CSV
                            const headers = [
                              'IDR NO', 'OCCURRENCE TIME', 'VOLTAGE LEVEL', 'SOURCE SUBSTATION',
                              'INCIDENT LOCATION', 'DURATION (MS)', 'VL1 (%)', 'VL2 (%)', 'VL3 (%)',
                              'REGION', 'CAUSE', 'EQUIPMENT TYPE', 'WEATHER', 'CIRCUIT',
                              'FAULTY COMPONENT', 'RESPONSIBLE O/C', 'REMARKS'
                            ];
                            
                            const row = [
                              idrRecord.idr_no || '',
                              idrRecord.occurrence_time || '',
                              idrRecord.voltage_level || '',
                              idrRecord.source_substation || '',
                              idrRecord.incident_location || '',
                              idrRecord.duration_ms || '',
                              idrRecord.v1 || '',
                              idrRecord.v2 || '',
                              idrRecord.v3 || '',
                              idrRecord.region || '',
                              idrRecord.cause || '',
                              idrRecord.equipment_type || '',
                              idrRecord.weather || '',
                              idrRecord.circuit || '',
                              idrRecord.faulty_component || '',
                              idrRecord.responsible_oc || '',
                              idrRecord.remarks || ''
                            ];
                            
                            const csvContent = [headers.join(','), row.join(',')].join('\n');
                            const blob = new Blob([csvContent], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `IDR_${idrRecord.idr_no}_${new Date().toISOString().split('T')[0]}.csv`;
                            a.click();
                            window.URL.revokeObjectURL(url);
                            
                            toast.success('IDR record exported successfully');
                          } catch (error) {
                            console.error('Error exporting IDR:', error);
                            toast.error('Failed to export IDR record');
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all text-sm font-semibold shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        Export
                      </button>
                    )}

                    {/* Edit Button */}
                    <button
                      onClick={() => {
                        setIsEditingIDR(true);
                        // Keep existing form data (already loaded from idr_records or empty)
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={async () => {
                        setSavingIDR(true);
                        try {
                          // Validate required fields
                          if (!idrFormData.cause || idrFormData.cause.trim() === '') {
                            alert('Cause is required. Please enter a cause before saving.');
                            setSavingIDR(false);
                            return;
                          }

                          // Get current user
                          const { data: { user } } = await supabase.auth.getUser();

                          // Prepare IDR record data
                          const idrData = {
                            event_id: currentEvent.id,
                            idr_no: idrFormData.idr_no || null,
                            status: idrFormData.status || null,
                            voltage_level: idrFormData.voltage_level || null,
                            address: idrFormData.address || null,
                            duration_ms: idrFormData.duration_ms || null,
                            v1: idrFormData.v1 || null,
                            v2: idrFormData.v2 || null,
                            v3: idrFormData.v3 || null,
                            equipment_type: idrFormData.equipment_type || null,
                            cause_group: idrFormData.cause_group || null,
                            cause: idrFormData.cause,
                            remarks: idrFormData.remarks || null,
                            object_part_group: idrFormData.object_part_group || null,
                            object_part_code: idrFormData.object_part_code || null,
                            damage_group: idrFormData.damage_group || null,
                            damage_code: idrFormData.damage_code || null,
                            fault_type: idrFormData.fault_type || null,
                            outage_type: idrFormData.outage_type || null,
                            weather: idrFormData.weather || null,
                            weather_condition: idrFormData.weather_condition || null,
                            responsible_oc: idrFormData.responsible_oc || null,
                            total_cmi: idrFormData.total_cmi || null,
                            equipment_affected: idrFormData.equipment_affected || null,
                            restoration_actions: idrFormData.restoration_actions || null,
                            notes: idrFormData.notes || null,
                            uploaded_by: user?.id || null,
                            upload_source: 'manual_entry',
                          };

                          // Upsert IDR record (insert or update if exists)
                          const { data, error } = await supabase
                            .from('idr_records')
                            .upsert(idrData, {
                              onConflict: 'event_id',
                              ignoreDuplicates: false
                            })
                            .select()
                            .single();

                          if (error) {
                            console.error('Error saving IDR record:', error);
                            alert('Failed to save IDR changes. Please try again.');
                          } else {
                            console.log('✅ IDR record saved successfully:', data);
                            
                            // Log audit trail
                            try {
                              // Determine if this is a create or update
                              const isCreate = !idrRecord?.id;
                              
                              if (isCreate) {
                                // Log IDR creation
                                await EventAuditService.logIDRCreated(
                                  currentEvent.id,
                                  idrFormData.idr_no || 'N/A',
                                  true // manual create
                                );
                              } else {
                                // Detect changed fields for update
                                const affectedFields: string[] = [];
                                const fieldNames = [
                                  'idr_no', 'status', 'voltage_level', 'address', 'duration_ms',
                                  'v1', 'v2', 'v3', 'equipment_type', 'cause_group', 'cause',
                                  'remarks', 'object_part_group', 'object_part_code', 'damage_group',
                                  'damage_code', 'fault_type', 'outage_type', 'weather', 
                                  'weather_condition', 'responsible_oc', 'total_cmi',
                                  'equipment_affected', 'restoration_actions', 'notes'
                                ];
                                
                                fieldNames.forEach(field => {
                                  const oldVal = idrRecord?.[field as keyof typeof idrRecord];
                                  const newVal = idrFormData[field as keyof typeof idrFormData];
                                  if (oldVal !== newVal) {
                                    affectedFields.push(field);
                                  }
                                });
                                
                                if (affectedFields.length > 0) {
                                  await EventAuditService.logIDRUpdated(currentEvent.id, affectedFields);
                                }
                              }
                              
                              // Reload audit logs to show the new entry
                              await loadAuditLogs(currentEvent.id);
                            } catch (auditError) {
                              console.error('❌ Error logging audit trail:', auditError);
                              // Don't block the save, just log the error
                            }
                            
                            setIDRRecord(data);
                            setIsEditingIDR(false);
                            if (onEventUpdated) onEventUpdated();
                          }
                        } catch (error) {
                          console.error('Error saving IDR record:', error);
                          alert('An unexpected error occurred. Please try again.');
                        } finally {
                          setSavingIDR(false);
                        }
                      }}
                      disabled={savingIDR}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {savingIDR ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingIDR(false);
                        // Reload from idr_records (or reset to empty if no record)
                        loadIDRRecord(currentEvent.id);
                      }}
                      disabled={savingIDR}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm font-semibold disabled:opacity-50"
                    >
                      <XIcon className="w-4 h-4" />
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* IDR Content - Grouped Cards Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* IDR Core Information */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-500 rounded"></span>
                  IDR Core Information
                </h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-slate-600">IDR No.</label>
                      {isEditingIDR ? (
                        <input
                          type="text"
                          value={idrFormData.idr_no}
                          onChange={(e) => setIDRFormData({ ...idrFormData, idr_no: e.target.value })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="Enter IDR No."
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.idr_no || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Timestamp</label>
                      <p className="text-sm font-semibold text-slate-900 mt-1">
                        {new Date(currentEvent.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-slate-600">Status</label>
                      {isEditingIDR ? (
                        <select
                          value={idrFormData.status}
                          onChange={(e) => setIDRFormData({ ...idrFormData, status: e.target.value as any })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="new">New</option>
                          <option value="acknowledged">Acknowledged</option>
                          <option value="investigating">Investigating</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      ) : (
                        <span className={`inline-flex mt-1 px-2 py-0.5 rounded text-xs font-semibold ${
                          idrFormData.status === 'resolved' ? 'bg-green-100 text-green-700' :
                          idrFormData.status === 'investigating' ? 'bg-blue-100 text-blue-700' :
                          idrFormData.status === 'acknowledged' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {idrFormData.status || currentEvent.status}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Voltage Level</label>
                      {isEditingIDR ? (
                        <input
                          type="text"
                          value={idrFormData.voltage_level}
                          onChange={(e) => setIDRFormData({ ...idrFormData, voltage_level: e.target.value })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.voltage_level || '-'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600">Duration (ms)</label>
                    {isEditingIDR ? (
                      <input
                        type="number"
                        value={idrFormData.duration_ms}
                        onChange={(e) => setIDRFormData({ ...idrFormData, duration_ms: Number(e.target.value) })}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">
                        {idrFormData.duration_ms ? `${idrFormData.duration_ms} ms (${(idrFormData.duration_ms / 1000).toFixed(2)}s)` : '-'}
                      </p>
                    )}
                  </div>
                </div>
              </div>


              {/* Fault & Asset Location */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-red-500 rounded"></span>
                  Fault & Asset Location
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Faulty Phase</label>
                    <div className="mt-1 space-y-1">
                      {['A', 'B', 'C'].map(phase => {
                        const isAffected = currentEvent.affected_phases.includes(phase);
                        const voltage = phase === 'A' ? currentEvent.v1 : phase === 'B' ? currentEvent.v2 : currentEvent.v3;
                        return (
                          <div key={phase} className="flex items-center justify-between text-sm">
                            <span className="font-medium">Phase {phase}:</span>
                            <span className={`flex items-center gap-1 ${isAffected ? 'text-red-600 font-semibold' : 'text-green-600'}`}>
                              {voltage ? `${voltage}V` : '-'}
                              {isAffected ? ' (affected)' : ' ✓'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                    <div>
                      <label className="text-xs font-medium text-slate-600">V1 (V)</label>
                      {isEditingIDR ? (
                        <input
                          type="number"
                          step="0.1"
                          value={idrFormData.v1}
                          onChange={(e) => setIDRFormData({ ...idrFormData, v1: Number(e.target.value) })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.v1 || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">V2 (V)</label>
                      {isEditingIDR ? (
                        <input
                          type="number"
                          step="0.1"
                          value={idrFormData.v2}
                          onChange={(e) => setIDRFormData({ ...idrFormData, v2: Number(e.target.value) })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.v2 || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">V3 (V)</label>
                      {isEditingIDR ? (
                        <input
                          type="number"
                          step="0.1"
                          value={idrFormData.v3}
                          onChange={(e) => setIDRFormData({ ...idrFormData, v3: Number(e.target.value) })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.v3 || '-'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600">Address</label>
                    {isEditingIDR ? (
                      <input
                        type="text"
                        value={idrFormData.address}
                        onChange={(e) => setIDRFormData({ ...idrFormData, address: e.target.value })}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.address || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600">Circuit</label>
                    {isEditingIDR ? (
                      <input
                        type="text"
                        value={idrFormData.circuit}
                        onChange={(e) => setIDRFormData({ ...idrFormData, circuit: e.target.value })}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.circuit || '-'}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-slate-600">Region</label>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{currentSubstation?.region || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Equipment Type</label>
                      {isEditingIDR ? (
                        <input
                          type="text"
                          value={idrFormData.equipment_type}
                          onChange={(e) => setIDRFormData({ ...idrFormData, equipment_type: e.target.value })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.equipment_type || '-'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Root Cause Analysis */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-yellow-500 rounded"></span>
                  Root Cause Analysis
                </h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-slate-600">Cause Group</label>
                      {isEditingIDR ? (
                        <input
                          type="text"
                          value={idrFormData.cause_group}
                          onChange={(e) => setIDRFormData({ ...idrFormData, cause_group: e.target.value })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.cause_group || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Cause</label>
                      {isEditingIDR ? (
                        <input
                          type="text"
                          value={idrFormData.cause}
                          onChange={(e) => setIDRFormData({ ...idrFormData, cause: e.target.value })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.cause || '-'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600">Faulty Component</label>
                    {isEditingIDR ? (
                      <input
                        type="text"
                        value={idrFormData.faulty_component}
                        onChange={(e) => setIDRFormData({ ...idrFormData, faulty_component: e.target.value })}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.faulty_component || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600">Remarks</label>
                    {isEditingIDR ? (
                      <textarea
                        value={idrFormData.remarks}
                        onChange={(e) => setIDRFormData({ ...idrFormData, remarks: e.target.value })}
                        rows={2}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.remarks || '-'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Extended Technical Detail */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-purple-500 rounded"></span>
                  Extended Technical Detail
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-slate-600">External / Internal</label>
                    {isEditingIDR ? (
                      <select
                        value={idrFormData.external_internal}
                        onChange={(e) => setIDRFormData({ ...idrFormData, external_internal: e.target.value as 'external' | 'internal' | '' })}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select...</option>
                        <option value="external">External</option>
                        <option value="internal">Internal</option>
                      </select>
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.external_internal ? (idrFormData.external_internal === 'external' ? 'External' : 'Internal') : '-'}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-slate-600">Object Part Group</label>
                      {isEditingIDR ? (
                        <input
                          type="text"
                          value={idrFormData.object_part_group}
                          onChange={(e) => setIDRFormData({ ...idrFormData, object_part_group: e.target.value })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.object_part_group || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Object Part Code</label>
                      {isEditingIDR ? (
                        <input
                          type="text"
                          value={idrFormData.object_part_code}
                          onChange={(e) => setIDRFormData({ ...idrFormData, object_part_code: e.target.value })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.object_part_code || '-'}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-slate-600">Damage Group</label>
                      {isEditingIDR ? (
                        <input
                          type="text"
                          value={idrFormData.damage_group}
                          onChange={(e) => setIDRFormData({ ...idrFormData, damage_group: e.target.value })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.damage_group || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Damage Code</label>
                      {isEditingIDR ? (
                        <input
                          type="text"
                          value={idrFormData.damage_code}
                          onChange={(e) => setIDRFormData({ ...idrFormData, damage_code: e.target.value })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.damage_code || '-'}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-slate-600">Fault Type</label>
                      {isEditingIDR ? (
                        <input
                          type="text"
                          value={idrFormData.fault_type}
                          onChange={(e) => setIDRFormData({ ...idrFormData, fault_type: e.target.value })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.fault_type || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Outage Type</label>
                      {isEditingIDR ? (
                        <input
                          type="text"
                          value={idrFormData.outage_type}
                          onChange={(e) => setIDRFormData({ ...idrFormData, outage_type: e.target.value })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.outage_type || '-'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Environment & Operations */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 lg:col-span-2">
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-orange-500 rounded"></span>
                  Environment & Operations
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Weather (Code)</label>
                    {isEditingIDR ? (
                      <input
                        type="text"
                        value={idrFormData.weather}
                        onChange={(e) => setIDRFormData({ ...idrFormData, weather: e.target.value })}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g., W01"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.weather || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600">Weather Condition</label>
                    {isEditingIDR ? (
                      <input
                        type="text"
                        value={idrFormData.weather_condition}
                        onChange={(e) => setIDRFormData({ ...idrFormData, weather_condition: e.target.value })}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g., Heavy Rain"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.weather_condition || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600">Responsible OC</label>
                    {isEditingIDR ? (
                      <input
                        type="text"
                        value={idrFormData.responsible_oc}
                        onChange={(e) => setIDRFormData({ ...idrFormData, responsible_oc: e.target.value })}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.responsible_oc || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600">Total CMI</label>
                    {isEditingIDR ? (
                      <input
                        type="number"
                        value={idrFormData.total_cmi}
                        onChange={(e) => setIDRFormData({ ...idrFormData, total_cmi: Number(e.target.value) })}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.total_cmi || '-'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Delete Event</h3>
            </div>
            
            <p className="text-slate-600 mb-2">
              Are you sure you want to delete this event?
            </p>
            
            {currentEvent.is_mother_event && childEvents.length > 0 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg mb-4">
                <p className="text-sm text-orange-800 font-semibold">
                  ⚠️ This is a mother event
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  {childEvents.length} child event{childEvents.length !== 1 ? 's' : ''} will also be deleted.
                </p>
              </div>
            )}
            
            <p className="text-sm text-slate-500 mb-6">
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Event History Panel */}
      {showCustomerHistory && selectedCustomer && (
        <CustomerEventHistoryPanel
          customer={selectedCustomer}
          onClose={() => {
            setShowCustomerHistory(false);
            setSelectedCustomer(null);
          }}
        />
      )}

      {/* IDR Import Results Modal */}
      {showImportModal && importResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${
                  importResults.failed === 0 ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  {importResults.failed === 0 ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">IDR Import Results</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {importResults.successful} successful, {importResults.failed} failed
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResults(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Success Summary */}
              {importResults.successful > 0 && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-green-900">
                      Successfully Imported: {importResults.successful} record(s)
                    </h4>
                  </div>
                  <p className="text-sm text-green-700">
                    IDR records have been created or updated in the system.
                  </p>
                </div>
              )}

              {/* Errors Summary */}
              {importResults.errors.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <h4 className="font-semibold text-red-900">
                      Errors: {importResults.errors.length} issue(s)
                    </h4>
                  </div>
                  
                  {/* Errors Table */}
                  <div className="border border-red-200 rounded-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-red-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-red-900">Row</th>
                            <th className="px-3 py-2 text-left font-semibold text-red-900">Event ID</th>
                            <th className="px-3 py-2 text-left font-semibold text-red-900">Column</th>
                            <th className="px-3 py-2 text-left font-semibold text-red-900">Error Message</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-100">
                          {importResults.errors.map((error, idx) => (
                            <tr key={idx} className="hover:bg-red-50">
                              <td className="px-3 py-2 font-mono text-slate-700">{error.row}</td>
                              <td className="px-3 py-2 font-mono text-slate-700 text-xs">
                                {error.eventId ? error.eventId.substring(0, 8) : '-'}
                              </td>
                              <td className="px-3 py-2 text-slate-700">{error.column}</td>
                              <td className="px-3 py-2 text-red-700">{error.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mt-2">
                    💡 Tip: Fix the errors in your CSV file and try importing again.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResults(null);
                }}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PSBG Config Modal */}
      {showPSBGConfig && (
        <PSBGConfigModal
          isOpen={showPSBGConfig}
          onClose={() => setShowPSBGConfig(false)}
          onSave={setPsbgOptions}
          currentOptions={psbgOptions}
          usedOptions={usedPsbgOptions}
        />
      )}

      {/* Match IDR Panel Modal */}
      {showMatchIDRPanel && (() => {
        console.log('🎯 Rendering Match IDR Panel Modal - showMatchIDRPanel:', showMatchIDRPanel);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-bold text-slate-900">Match IDR</h2>
            </div>
            <p className="text-sm text-slate-600 mt-1">Matching IDR records to Event</p>
          </div>
          <button
            onClick={() => {
              setShowMatchIDRPanel(false);
              handleResetMatchFilters();
            }}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <XIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Filter Section */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-3 gap-4 items-end">
            {/* Time Range Filter */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                IDR Malfunction start time range
              </label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">-</span>
                  <input
                    type="number"
                    value={timeRangeFromMinutes}
                    onChange={(e) => setTimeRangeFromMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                  <span className="text-slate-600">min</span>
                </div>
                <span className="text-slate-400 font-semibold">to</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">+</span>
                  <input
                    type="number"
                    value={timeRangeToMinutes}
                    onChange={(e) => setTimeRangeToMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                  <span className="text-slate-600">min</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Event time: {new Date(currentEvent.timestamp).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
            </div>

            {/* Outage Type Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Outage Type
              </label>
              <select
                value={outageTypeFilter}
                onChange={(e) => setOutageTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">ALL</option>
                {availableOutageTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSearchMatchingIDRs}
              disabled={searchingIDRs}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searchingIDRs ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search
                </>
              )}
            </button>
            <button
              onClick={handleResetMatchFilters}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Results Table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {matchedIDRs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="font-medium">No matching IDR records found</p>
              <p className="text-sm mt-1">Adjust the search filters and try again</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">
                      <input
                        type="checkbox"
                        checked={!!selectedMatchedIDRId}
                        onChange={() => setSelectedMatchedIDRId(null)}
                        className="rounded border-slate-300"
                        disabled
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">IDR No</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Occurrence Time</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Voltage Level</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Faulty Phase</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Incident Address / Circuit Affected</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Duration (ms)</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase">V1 (%)</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase">V2 (%)</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase">V3 (%)</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Region</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Equipment Type</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Cause Group</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Cause</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Faulty Component</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">External / Internal</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Weather Code</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Weather Condition</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Responsible O/C</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Outage Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {matchedIDRs.map((idr) => (
                    <tr
                      key={idr.id}
                      className={`hover:bg-blue-50 transition-colors cursor-pointer ${
                        selectedMatchedIDRId === idr.id ? 'bg-blue-100' : ''
                      }`}
                      onClick={() => setSelectedMatchedIDRId(idr.id)}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedMatchedIDRId === idr.id}
                          onChange={() => setSelectedMatchedIDRId(idr.id)}
                          className="rounded border-slate-300"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-3 py-2 text-sm font-medium text-blue-600">{idr.idr_no}</td>
                      <td className="px-3 py-2 text-sm text-slate-900">
                        {new Date(idr.occurrence_time).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-900">{idr.voltage_level || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm text-slate-900">
                        {[idr.v1, idr.v2, idr.v3].filter(v => v !== null && v < 90).length > 0
                          ? `L${[1, 2, 3].filter((_, i) => [idr.v1, idr.v2, idr.v3][i] !== null && [idr.v1, idr.v2, idr.v3][i]! < 90).join('')}`
                          : 'N/A'}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-900">
                        <div className="max-w-xs truncate" title={idr.incident_location || idr.circuit || ''}>
                          {idr.incident_location || idr.circuit || 'N/A'}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-900">{idr.duration_ms || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm text-center text-slate-900">
                        {idr.v1 !== null ? idr.v1.toFixed(0) : 'N/A'}
                      </td>
                      <td className="px-3 py-2 text-sm text-center text-slate-900">
                        {idr.v2 !== null ? idr.v2.toFixed(0) : 'N/A'}
                      </td>
                      <td className="px-3 py-2 text-sm text-center text-slate-900">
                        {idr.v3 !== null ? idr.v3.toFixed(0) : 'N/A'}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-900">{idr.region || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm text-slate-900">{idr.equipment_type || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm text-slate-900">{idr.cause_group || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm text-slate-900">
                        <div className="max-w-xs truncate" title={idr.cause || ''}>
                          {idr.cause || 'N/A'}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-900">{idr.faulty_component || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm text-slate-900 capitalize">{idr.external_internal || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm text-slate-900">{idr.weather || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm text-slate-900">{idr.weather_condition || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm text-slate-900">{idr.responsible_oc || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm text-slate-900">{idr.outage_type || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={() => {
              setShowMatchIDRPanel(false);
              handleResetMatchFilters();
            }}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSaveMatchedIDR}
            disabled={!selectedMatchedIDRId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
    );
  })()}
    </div>
  );
}
