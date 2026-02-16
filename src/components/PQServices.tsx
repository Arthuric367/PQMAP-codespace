import { useState, useEffect, useRef } from 'react';
import {
  Wrench,
  Search,
  Download,
  Filter,
  Users,
  Calendar,
  BarChart3,
  Eye,
  EyeOff,
  ChevronDown,
  FileDown,
  Building2,
  MapPin,
  AlertTriangle,
  X,
  Upload,
  Check,
  Edit2,
  Trash2,
  Database,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Customer, PQServiceRecord, ServiceType } from '../types/database';
import EditServiceModal from './PQServices/EditServiceModal';
import ViewDetailsModal from './PQServices/ViewDetailsModal';
import EventDetails from './EventManagement/EventDetails';
import * as XLSX from 'xlsx';

// PQSIS Types
type PQSISRecord = {
  caseNo: string;
  customerName: string;
  customerGroup: string;
  requestDate: string;
  serviceType: string;
  service: string;
  serviceCharging: number;
  chargedDepartment: string;
  serviceCompletionDate: string;
  closedCase: string;
  inProgressCase: string;
  completedBeforeTargetDate: string;
  plannedReplyDate: string;
  actualReplyDate: string;
  plannedReportIssueDate: string;
  actualReportIssueDate: string;
  idrNumber?: string;
};

type PQSISServiceType = 
  | 'Harmonics' 
  | 'Supply Enquiry' 
  | 'Site Survey' 
  | 'Technical Services' 
  | 'PQ Site Investigation' 
  | 'Enquiry' 
  | 'All';

type PQSISColumn = 
  | 'Customer Group'
  | 'Request Date'
  | 'Service Type'
  | 'Service'
  | 'Service Charging'
  | 'Charged Dept'
  | 'Completion Date'
  | 'Closed Case'
  | 'In-Progress'
  | 'Before Target'
  | 'Planned Reply'
  | 'Actual Reply'
  | 'Planned Report'
  | 'Actual Report'
  | 'IDR Number';

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function PQServices() {
  // State Management
  // Main View State
  const [mainView, setMainView] = useState<'customers' | 'pqsis'>('customers');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<PQServiceRecord[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'main' | 'services'>('main');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<'month' | '3months' | 'year' | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [servicesDetailView, setServicesDetailView] = useState(false); // Toggle between simple and detail view
  
  // Filters
  const [serviceTypeFilter, setServiceTypeFilter] = useState<ServiceType | 'all'>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'7days' | '30days' | 'custom' | 'all'>('all');
  const [benchmarkFilter, setBenchmarkFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'last_service' | 'total_services'>('name');
  
  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedService, setSelectedService] = useState<PQServiceRecord | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<PQServiceRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  type EventDetailsTab = 'overview' | 'technical' | 'impact' | 'services' | 'timeline' | 'idr';
  const [eventDetailsInitialTab, setEventDetailsInitialTab] = useState<EventDetailsTab>('overview');
  const [selectedEventData, setSelectedEventData] = useState<{
    event: any;
    substation: any;
    impacts: any[];
  } | null>(null);

  // PQSIS Import states
  const [showImportDropdown, setShowImportDropdown] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PQSIS States
  const [pqsisRecords, setPqsisRecords] = useState<PQSISRecord[]>([]);
  const [filteredPqsisRecords, setFilteredPqsisRecords] = useState<PQSISRecord[]>([]);
  const [pqsisServiceTypeFilter, setPqsisServiceTypeFilter] = useState<PQSISServiceType>('All');
  const [pqsisIdrSearch, setPqsisIdrSearch] = useState('');
  const [pqsisCustomerSearch, setPqsisCustomerSearch] = useState('');
  const [pqsisSelectedColumns, setPqsisSelectedColumns] = useState<Set<PQSISColumn>>(new Set([
    'Service Type',
    'Service',
    'Completion Date',
    'Closed Case',
    'In-Progress',
    'Before Target',
    'IDR Number'
  ]));
  const [pqsisCurrentPage, setPqsisCurrentPage] = useState(1);
  const [pqsisItemsPerPage] = useState(50);

  // Load data
  useEffect(() => {
    loadCustomers();
    loadServices();
    loadPQSISRecords();
  }, []);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*, substation:substations(*)')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error loading customers:', err);
    }
  };

  const loadServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pq_service_records')
        .select('*, customer:customers(*), engineer:profiles(*)')
        .order('service_date', { ascending: false });

      if (error) throw error;

      const serviceRows = (data || []) as PQServiceRecord[];
      const idrNumbers = Array.from(
        new Set(
          serviceRows
            .map((s) => (s.idr_no || '').trim())
            .filter((v) => v.length > 0)
        )
      );

      let idrToVoltageDipEvent = new Map<string, { id: string; idr_no: string }>();
      if (idrNumbers.length > 0) {
        const { data: eventsData, error: eventsError } = await supabase
          .from('pq_events')
          .select('id, idr_no, event_type')
          .in('idr_no', idrNumbers)
          .eq('event_type', 'voltage_dip');

        if (eventsError) throw eventsError;
        (eventsData || []).forEach((e: any) => {
          if (e.idr_no) {
            idrToVoltageDipEvent.set(String(e.idr_no), { id: e.id, idr_no: String(e.idr_no) });
          }
        });
      }

      const enriched = serviceRows.map((s) => {
        const idrNo = (s.idr_no || '').trim();
        if (idrNo && idrToVoltageDipEvent.has(idrNo)) {
          return { ...s, event: idrToVoltageDipEvent.get(idrNo) };
        }
        return { ...s, event: undefined };
      });

      setServices(enriched);
    } catch (err) {
      console.error('Error loading services:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPQSISRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('pq_service_records')
        .select('*, customer:customers(name)')
        .order('service_date', { ascending: false });

      if (error) throw error;

      // Transform service records to PQSIS records
      const pqsisData: PQSISRecord[] = (data || []).map(record => ({
        caseNo: record.case_number || record.id.toString(),
        customerName: record.customer?.name || 'Unknown',
        customerGroup: record.customer_group || 'N/A',
        requestDate: new Date(record.service_date).toLocaleDateString(),
        serviceType: record.service_type || 'N/A',
        service: record.description || 'N/A',
        serviceCharging: record.service_charging || 0,
        chargedDepartment: record.charged_department || 'N/A',
        serviceCompletionDate: record.completion_date 
          ? new Date(record.completion_date).toLocaleDateString() 
          : 'N/A',
        closedCase: record.status === 'completed' ? 'Yes' : 'No',
        inProgressCase: record.status === 'in_progress' ? 'Yes' : 'No',
        completedBeforeTargetDate: record.completed_before_target ? 'Yes' : 'No',
        plannedReplyDate: record.planned_reply_date 
          ? new Date(record.planned_reply_date).toLocaleDateString() 
          : 'N/A',
        actualReplyDate: record.actual_reply_date 
          ? new Date(record.actual_reply_date).toLocaleDateString() 
          : 'N/A',
        plannedReportIssueDate: record.planned_report_date 
          ? new Date(record.planned_report_date).toLocaleDateString() 
          : 'N/A',
        actualReportIssueDate: record.actual_report_date 
          ? new Date(record.actual_report_date).toLocaleDateString() 
          : 'N/A',
        idrNumber: record.idr_no || undefined,
      }));

      setPqsisRecords(pqsisData);
    } catch (err) {
      console.error('Error loading PQSIS records:', err);
    }
  };

  // PQSIS Filtering
  useEffect(() => {
    let filtered = pqsisRecords;

    // Service Type filter
    if (pqsisServiceTypeFilter !== 'All') {
      filtered = filtered.filter(r => r.serviceType === pqsisServiceTypeFilter);
    }

    // IDR search
    if (pqsisIdrSearch) {
      const search = pqsisIdrSearch.toLowerCase();
      filtered = filtered.filter(r => 
        r.idrNumber?.toLowerCase().includes(search)
      );
    }

    // Customer search
    if (pqsisCustomerSearch) {
      const search = pqsisCustomerSearch.toLowerCase();
      filtered = filtered.filter(r => 
        r.customerName.toLowerCase().includes(search) ||
        r.customerGroup.toLowerCase().includes(search)
      );
    }

    setFilteredPqsisRecords(filtered);
    setPqsisCurrentPage(1); // Reset to first page when filters change
  }, [pqsisRecords, pqsisServiceTypeFilter, pqsisIdrSearch, pqsisCustomerSearch]);

  // Dashboard metrics
  const getDashboardMetrics = () => {
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    let filteredServices = services;
    if (timeRange === 'month') {
      filteredServices = services.filter(s => new Date(s.service_date) >= oneMonthAgo);
    } else if (timeRange === '3months') {
      filteredServices = services.filter(s => new Date(s.service_date) >= threeMonthsAgo);
    } else if (timeRange === 'year') {
      filteredServices = services.filter(s => new Date(s.service_date) >= oneYearAgo);
    }

    const thisMonthServices = services.filter(s => new Date(s.service_date) >= oneMonthAgo).length;

    const serviceCounts = filteredServices.reduce((acc, service) => {
      acc[service.service_type] = (acc[service.service_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCustomers: customers.length,
      totalServices: filteredServices.length,
      thisMonthServices,
      serviceCounts,
    };
  };

  const metrics = getDashboardMetrics();

  // Filter customers
  const getFilteredCustomers = () => {
    let filtered = customers;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.name.toLowerCase().includes(query) ||
          c.account_number.toLowerCase().includes(query)
      );
    }

    // Sort
    if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'last_service') {
      filtered.sort((a, b) => {
        const aService = services.filter(s => s.customer_id === a.id).sort((x, y) => 
          new Date(y.service_date).getTime() - new Date(x.service_date).getTime()
        )[0];
        const bService = services.filter(s => s.customer_id === b.id).sort((x, y) => 
          new Date(y.service_date).getTime() - new Date(x.service_date).getTime()
        )[0];
        
        if (!aService && !bService) return 0;
        if (!aService) return 1;
        if (!bService) return -1;
        return new Date(bService.service_date).getTime() - new Date(aService.service_date).getTime();
      });
    } else if (sortBy === 'total_services') {
      filtered.sort((a, b) => {
        const aCount = services.filter(s => s.customer_id === a.id).length;
        const bCount = services.filter(s => s.customer_id === b.id).length;
        return bCount - aCount;
      });
    }

    return filtered;
  };

  // Filter services for selected customer
  const getFilteredServices = () => {
    if (!selectedCustomer) return [];
    
    let filtered = services.filter(s => s.customer_id === selectedCustomer.id);

    // Service type filter
    if (serviceTypeFilter !== 'all') {
      filtered = filtered.filter(s => s.service_type === serviceTypeFilter);
    }

    // Date range filter
    if (dateRangeFilter === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filtered = filtered.filter(s => new Date(s.service_date) >= sevenDaysAgo);
    } else if (dateRangeFilter === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(s => new Date(s.service_date) >= thirtyDaysAgo);
    }

    // Benchmark filter
    if (benchmarkFilter !== 'all') {
      filtered = filtered.filter(s => s.benchmark_standard === benchmarkFilter);
    }

    return filtered;
  };

  // Get customer service stats
  const getCustomerStats = (customerId: string) => {
    const customerServices = services.filter(s => s.customer_id === customerId);
    const lastService = customerServices.sort((a, b) => 
      new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
    )[0];

    return {
      totalServices: customerServices.length,
      lastServiceDate: lastService?.service_date || null,
    };
  };

  // Download PQSIS import template
  const handleDownloadPQSISTemplate = () => {
    const headers = [
      'Case No.',
      'Customer Name',
      'Customer Group',
      'Request Date',
      'Service Type',
      'Service',
      'Service Charging (k)',
      'Charged Department',
      'Service Completion Date',
      'Closed Case',
      'In-Progress Case',
      'Completed before Target Date',
      'Planned Reply Date',
      'Actual Reply Date',
      'Planned Report Issue Date',
      'Actual Report Issue Date',
      'IDR Number'
    ];

    const exampleData = [
      '5337.2',
      'ABC Corporation',
      'TG1',
      '01/01/2026',
      'Harmonics',
      'Harmonic Analysis Study',
      '25.5',
      'PQ Department',
      '15/01/2026',
      'No',
      'Yes',
      'Yes',
      '10/01/2026',
      '09/01/2026',
      '20/01/2026',
      '18/01/2026',
      'IDR-2026-001'
    ];

    const csvContent = [
      '# PQSIS Import Template',
      '# Upload this file with your PQSIS service records',
      '# Date format: dd/mm/yyyy',
      '# Closed Case / In-Progress / Completed before Target: Yes or No',
      '',
      headers.join(','),
      exampleData.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PQSIS_Import_Template_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setShowImportDropdown(false);
  };

  // Handle PQSIS CSV import
  const handleImportPQSIS = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResults(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'));

      if (lines.length < 2) {
        alert('CSV file is empty or invalid');
        setIsImporting(false);
        return;
      }

      // Skip header row
      let successCount = 0;
      let failedCount = 0;
      const errors: Array<{ row: number; message: string }> = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));

        if (values.length < 17) {
          errors.push({ row: i + 1, message: 'Invalid CSV format - missing columns' });
          failedCount++;
          continue;
        }

        try {
          // Map CSV to pq_service_records table structure
          const serviceRecord = {
            case_number: values[0],
            service_date: values[3], // Request Date
            service_type: values[4].toLowerCase().replace(/ /g, '_'),
            content: values[5], // Service
            service_charge_amount: parseFloat(values[6]) || 0,
            party_charged: values[7],
            completion_date: values[8],
            is_closed: values[9].toLowerCase() === 'yes',
            is_in_progress: values[10].toLowerCase() === 'yes',
            completed_before_target: values[11].toLowerCase() === 'yes',
            tariff_group: values[2], // Customer Group
            planned_reply_date: values[12],
            actual_reply_date: values[13],
            planned_report_issue_date: values[14],
            actual_report_issue_date: values[15],
            idr_no: values[16] || null,
            // Find customer_id from customer name
            customer_id: null as string | null
          };

          // Find customer by name
          const customerName = values[1];
          const customer = customers.find(c => 
            c.name.toLowerCase() === customerName.toLowerCase()
          );

          if (!customer) {
            errors.push({ 
              row: i + 1, 
              message: `Customer "${customerName}" not found in database` 
            });
            failedCount++;
            continue;
          }

          serviceRecord.customer_id = customer.id;

          // Insert into database
          const { error } = await supabase
            .from('pq_service_records')
            .insert(serviceRecord);

          if (error) {
            errors.push({ row: i + 1, message: error.message });
            failedCount++;
          } else {
            successCount++;
          }
        } catch (err: any) {
          errors.push({ row: i + 1, message: err.message || 'Unknown error' });
          failedCount++;
        }
      }

      setImportResults({
        success: successCount,
        failed: failedCount,
        errors
      });
      setShowImportModal(true);

      // Reload services if any succeeded
      if (successCount > 0) {
        await loadServices();
      }
    } catch (error: any) {
      console.error('CSV import error:', error);
      alert(`Failed to process CSV file: ${error.message}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle View Event button click
  const handleViewEvent = async (eventId: string, initialTab: EventDetailsTab = 'overview') => {
    console.log('🔍 [PQServices] View Event clicked:', eventId);
    
    try {
      // Fetch event data
      const { data: eventData, error: eventError } = await supabase
        .from('pq_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('❌ [PQServices] Error fetching event:', eventError);
        alert('Failed to load event details. Please try again.');
        return;
      }

      console.log('✅ [PQServices] Event data loaded:', eventData);

      // Fetch substation data
      const { data: substationData } = await supabase
        .from('substations')
        .select('*')
        .eq('id', eventData.substation_id)
        .single();

      console.log('✅ [PQServices] Substation data loaded:', substationData);

      // Fetch impacts
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
        .eq('event_id', eventId);

      if (impactsError) {
        console.error('❌ [PQServices] Error fetching impacts:', impactsError);
      }

      console.log('✅ [PQServices] Impacts loaded:', {
        count: impactsData?.length || 0,
        firstImpact: impactsData?.[0]
      });

      setEventDetailsInitialTab(initialTab);

      setSelectedEventData({
        event: eventData,
        substation: substationData,
        impacts: impactsData || []
      });
      setShowEventDetailsModal(true);

      console.log('✅ [PQServices] Event details modal opened');
    } catch (error) {
      console.error('❌ [PQServices] Unexpected error loading event:', error);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  // Export functionality
  const handleExportCustomerServices = async () => {
    if (!selectedCustomer) return;

    const customerServices = getFilteredServices();
    
    const exportData = customerServices.map(service => ({
      'Service Date': new Date(service.service_date).toLocaleDateString('en-GB'),
      'Service Type': service.service_type.replace(/_/g, ' ').toUpperCase(),
      'Event ID': service.event_id || 'N/A',
      'Benchmark Standard': service.benchmark_standard || 'None',
      'Engineer': service.engineer?.full_name || 'Not assigned',
      'Created': new Date(service.created_at).toLocaleDateString('en-GB'),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Services');

    // Add header
    const header = [
      [`PQ Services Report - ${selectedCustomer.name}`],
      [`Account Number: ${selectedCustomer.account_number}`],
      [`Export Date: ${new Date().toLocaleDateString('en-GB')}`],
      [`Total Services: ${customerServices.length}`],
      [],
    ];
    XLSX.utils.sheet_add_aoa(ws, header, { origin: 'A1' });

    XLSX.writeFile(wb, `PQ_Services_${selectedCustomer.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportDropdown(false);
  };

  // Recent activities (last 10 services across all customers)
  const recentActivities = services.slice(0, 10);

  // Click outside to close import dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showImportDropdown && !target.closest('.import-dropdown-container')) {
        setShowImportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showImportDropdown]);

  // Helper function to convert service_type enum to display label
  const formatServiceTypeLabel = (serviceType: string): string => {
    return serviceType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get unique service types from actual database data
  const getServiceTypeLabels = (): Record<string, string> => {
    const uniqueTypes = Array.from(new Set(services.map(s => s.service_type)));
    const labels: Record<string, string> = {};
    uniqueTypes.forEach(type => {
      labels[type] = formatServiceTypeLabel(type);
    });
    return labels;
  };

  const serviceTypeLabels = getServiceTypeLabels();

  // Handle main view tab change
  const handleMainViewChange = (view: 'customers' | 'pqsis') => {
    setMainView(view);
    if (view === 'pqsis') {
      setSelectedCustomer(null); // Clear customer selection when switching to PQSIS
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Main View Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => handleMainViewChange('customers')}
              className={`flex-1 px-8 py-4 font-bold text-lg transition-colors ${
                mainView === 'customers'
                  ? 'text-blue-600 border-b-4 border-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Customer Services
            </button>
            <button
              onClick={() => handleMainViewChange('pqsis')}
              className={`flex-1 px-8 py-4 font-bold text-lg transition-colors flex items-center justify-center gap-2 ${
                mainView === 'pqsis'
                  ? 'text-blue-600 border-b-4 border-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Database className="w-5 h-5" />
              PQSIS Maintenance
            </button>
          </div>
        </div>
      </div>

      {/* Customer Services View */}
      {mainView === 'customers' && (
        <>
          {/* Dashboard Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wrench className="w-8 h-8 text-slate-700" />
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">PQ Services</h1>
                  <p className="text-slate-600 mt-1">Customer-centric power quality service logging</p>
            </div>
          </div>

          {/* Time Range Selector + PQSIS Import */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">Time Range:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="month">This Month</option>
              <option value="3months">Last 3 Months</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
            </select>

            {/* PQSIS Import Dropdown */}
            <div className="relative import-dropdown-container">
              <button
                onClick={() => setShowImportDropdown(!showImportDropdown)}
                disabled={isImporting}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                title="Upload PQSIS CSV"
              >
                <Upload className="w-4 h-4" />
                {isImporting ? 'Importing...' : 'Upload CSV'}
                <ChevronDown className={`w-4 h-4 transition-transform ${showImportDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showImportDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-30">
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowImportDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-2 text-slate-700 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">Import CSV</span>
                  </button>
                  <button
                    onClick={handleDownloadPQSISTemplate}
                    className="w-full px-4 py-2 text-left hover:bg-green-50 flex items-center gap-2 text-slate-700 transition-colors"
                  >
                    <FileDown className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Download Template</span>
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImportPQSIS}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Compact Dashboard: 30% Metrics + 70% Chart */}
        <div className="grid grid-cols-12 gap-3 h-[320px]">
          {/* Left: Vertical Metrics (30%) */}
          <div className="col-span-12 lg:col-span-4 space-y-2">
            {/* Total Customers */}
            <div className="bg-white rounded-lg shadow-md p-3 border border-slate-100 h-[calc((100%-1rem)/3)]">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-600" />
                <p className="text-[11px] font-semibold text-slate-600">Total Customers</p>
              </div>
              <p className="text-xl font-bold text-slate-900">{metrics.totalCustomers}</p>
            </div>

            {/* Total Services */}
            <div className="bg-white rounded-lg shadow-md p-3 border border-slate-100 h-[calc((100%-1rem)/3)]">
              <div className="flex items-center gap-2 mb-1">
                <Wrench className="w-4 h-4 text-green-600" />
                <p className="text-[11px] font-semibold text-slate-600">Total Services</p>
              </div>
              <p className="text-xl font-bold text-slate-900">{metrics.totalServices}</p>
            </div>

            {/* This Month */}
            <div className="bg-white rounded-lg shadow-md p-3 border border-slate-100 h-[calc((100%-1rem)/3)]">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-purple-600" />
                <p className="text-[11px] font-semibold text-slate-600">This Month</p>
              </div>
              <p className="text-xl font-bold text-slate-900">{metrics.thisMonthServices}</p>
            </div>
          </div>

          {/* Right: Vertical Bar Chart (70%) */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-lg shadow-md p-3 border border-slate-100 h-full">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-slate-700" />
                <h2 className="text-sm font-bold text-slate-900">Services by Category</h2>
              </div>
              
              {/* Vertical Bars Container */}
              <div className="h-[calc(100%-1.75rem)] flex items-end justify-between gap-2">
                {Object.entries(serviceTypeLabels).map(([key, label]) => {
                  const count = metrics.serviceCounts[key] || 0;
                  const maxCount = Math.max(...Object.values(metrics.serviceCounts), 1);
                  const heightPercentage = (count / maxCount) * 100;

                  return (
                    <div key={key} className="flex-1 flex flex-col items-center gap-2">
                      {/* Bar */}
                      <div className="w-full flex flex-col justify-end items-center" style={{ height: 'calc(100% - 3rem)' }}>
                        <div className="w-full relative">
                          <div
                            className="w-full bg-gradient-to-t from-blue-500 to-indigo-500 rounded-t-lg transition-all duration-500 relative group cursor-pointer hover:from-blue-600 hover:to-indigo-600"
                            style={{ height: `${heightPercentage}%`, minHeight: count > 0 ? '20px' : '0px' }}
                          >
                            {/* Count Label on Hover */}
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
                                {count}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Label */}
                      <div className="text-center">
                        <p className="text-[10px] font-medium text-slate-600 leading-tight" style={{ wordBreak: 'break-word' }}>
                          {label.split(' ').map((word, i) => (
                            <span key={i}>
                              {word}
                              {i < label.split(' ').length - 1 && <br />}
                            </span>
                          ))}
                        </p>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{count}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl shadow-lg p-4 border border-slate-100">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer name or account number..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="name">Name</option>
              <option value="last_service">Last Service Date</option>
              <option value="total_services">Total Services</option>
            </select>
          </div>

          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Filter className="w-5 h-5" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && selectedCustomer && (
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Service Type</label>
              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Types</option>
                {Object.entries(serviceTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Date Range</label>
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Benchmark Standard</label>
              <select
                value={benchmarkFilter}
                onChange={(e) => setBenchmarkFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Standards</option>
                <option value="IEEE 519">IEEE 519</option>
                <option value="IEC 61000">IEC 61000</option>
                <option value="ITIC Curve">ITIC Curve</option>
                <option value="SEMI F47">SEMI F47</option>
                <option value="EN 50160">EN 50160</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Content: Customer List + Customer Detail */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Customer Sidebar */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white p-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5" />
                Customers ({getFilteredCustomers().length})
              </h2>
            </div>
            <div className="divide-y divide-slate-200 max-h-[600px] overflow-y-auto">
              {getFilteredCustomers().map((customer) => {
                const stats = getCustomerStats(customer.id);
                const isSelected = selectedCustomer?.id === customer.id;

                return (
                  <button
                    key={customer.id}
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setActiveTab('main');
                    }}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                      isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-slate-900 truncate">{customer.name}</p>
                          {customer.critical_customer && (
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600">{customer.account_number}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                          <span className="px-2 py-0.5 bg-slate-100 rounded font-medium">
                            {stats.totalServices} services
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                );
              })}

              {getFilteredCustomers().length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No customers found</p>
                  <p className="text-sm mt-1">Try adjusting your search</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customer Detail */}
        <div className="xl:col-span-3">
          {selectedCustomer ? (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
              {/* Tabs */}
              <div className="border-b border-slate-200">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('main')}
                    className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                      activeTab === 'main'
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Main Info
                  </button>
                  <button
                    onClick={() => setActiveTab('services')}
                    className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                      activeTab === 'services'
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    PQ Services
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'main' && (
                  <div className="space-y-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                          {selectedCustomer.name}
                          {selectedCustomer.critical_customer && (
                            <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4" />
                              Critical Customer
                            </span>
                          )}
                        </h2>
                        <p className="text-slate-600 mt-1">Account: {selectedCustomer.account_number}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-5 h-5 text-slate-600" />
                          <p className="text-sm font-semibold text-slate-700">Customer Type</p>
                        </div>
                        <p className="text-slate-900 capitalize">{selectedCustomer.customer_type}</p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-5 h-5 text-slate-600" />
                          <p className="text-sm font-semibold text-slate-700">Location</p>
                        </div>
                        <p className="text-slate-900">{selectedCustomer.address || 'Not specified'}</p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-5 h-5 text-slate-600" />
                          <p className="text-sm font-semibold text-slate-700">Substation</p>
                        </div>
                        <p className="text-slate-900">
                          {selectedCustomer.substation?.name || 'Not linked'}
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Wrench className="w-5 h-5 text-slate-600" />
                          <p className="text-sm font-semibold text-slate-700">Contract Demand</p>
                        </div>
                        <p className="text-slate-900">
                          {selectedCustomer.contract_demand_kva 
                            ? `${selectedCustomer.contract_demand_kva} kVA`
                            : 'Not specified'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm font-semibold text-slate-700 mb-2">Total Services</p>
                        <p className="text-3xl font-bold text-blue-600">
                          {getCustomerStats(selectedCustomer.id).totalServices}
                        </p>
                      </div>

                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm font-semibold text-slate-700 mb-2">Last Service</p>
                        <p className="text-lg font-bold text-green-600">
                          {getCustomerStats(selectedCustomer.id).lastServiceDate
                            ? new Date(getCustomerStats(selectedCustomer.id).lastServiceDate!).toLocaleDateString('en-GB')
                            : 'No services yet'}
                        </p>
                      </div>

                      <div className="p-4 bg-white rounded-lg border border-slate-200 md:col-span-2">
                        <p className="text-sm font-semibold text-slate-700 mb-3">IDR Numbers</p>
                        {services.filter(s => s.customer_id === selectedCustomer.id).length === 0 ? (
                          <p className="text-sm text-slate-500">No services yet</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {services
                              .filter(s => s.customer_id === selectedCustomer.id)
                              .map((s) => {
                                const idrNo = (s.idr_no || s.event?.idr_no || '').trim();
                                const mappedEventId = s.event?.id;
                                const hasEvent = !!mappedEventId;
                                return (
                                  <button
                                    key={s.id}
                                    type="button"
                                    disabled={!hasEvent}
                                    onClick={() => {
                                      if (mappedEventId) handleViewEvent(mappedEventId, 'idr');
                                    }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                                      hasEvent
                                        ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                        : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                                    }`}
                                    title={hasEvent ? 'Open IDR details' : 'No related event linked'}
                                  >
                                    {idrNo || 'No IDR'}
                                  </button>
                                );
                              })}
                          </div>
                        )}
                        <p className="text-xs text-slate-500 mt-2">
                          Click an IDR number to open the related event and view IDR details.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'services' && (
                  <div className="space-y-4">
                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900">
                        Service Log ({getFilteredServices().length})
                      </h3>
                      <div className="flex items-center gap-3">
                        {/* View Toggle */}
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
                        {/* Export */}
                        <div className="relative export-dropdown-container">
                          <button
                            onClick={() => setShowExportDropdown(!showExportDropdown)}
                            disabled={getFilteredServices().length === 0}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Export"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          {showExportDropdown && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                              <button
                                onClick={handleExportCustomerServices}
                                className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                              >
                                <FileDown className="w-4 h-4 text-green-600" />
                                Export to Excel
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>

                    {/* Services Table */}
                    {loading ? (
                      <div className="py-12 text-center text-slate-500">
                        <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                        <p className="mt-3">Loading services...</p>
                      </div>
                    ) : getFilteredServices().length === 0 ? (
                      <div className="py-12 text-center text-slate-500">
                        <Wrench className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="font-medium text-lg">No services found</p>
                        <p className="text-sm mt-1">Add a service to get started</p>
                      </div>
                    ) : servicesDetailView ? (
                      // DETAIL VIEW: 2-column card layout
                      <div className="space-y-4">
                        {getFilteredServices().map((service) => (
                          <div key={service.id} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4 pb-4 border-b border-slate-200">
                              <div>
                                <h4 className="text-lg font-bold text-slate-900">
                                  Case #{service.case_number || 'N/A'}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                    {serviceTypeLabels[service.service_type]}
                                  </span>
                                  {service.is_closed ? (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                      ✓ Closed
                                    </span>
                                  ) : service.is_in_progress ? (
                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                                      ⏳ In Progress
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

                              {/* Linked Event */}
                              {service.event?.id && (
                                <div className="md:col-span-2 pt-4 border-t border-slate-200">
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <button
                                      onClick={() => handleViewEvent(service.event!.id, 'overview')}
                                      className="text-blue-600 hover:text-blue-700 font-medium underline"
                                    >
                                      View Linked Event
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // SIMPLE VIEW: Table with crucial columns
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Case No.
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Customer Premises
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Request Date
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Service Type
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Completion Date
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {getFilteredServices().map((service) => (
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
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                                    {serviceTypeLabels[service.service_type]}
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
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => {
                                        setSelectedService(service);
                                        setShowEditModal(true);
                                      }}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Edit Service"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setServiceToDelete(service);
                                        setShowDeleteModal(true);
                                      }}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Delete Service"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-12 text-center">
              <Users className="w-20 h-20 mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Customer Selected</h3>
              <p className="text-slate-600">Select a customer from the list to view details and service history</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-lg p-6 text-white">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          Recent Activities
        </h2>
        <div className="space-y-3">
          {recentActivities.map((service) => (
            <div key={service.id} className="p-4 bg-white/10 rounded-lg backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{service.customer?.name}</p>
                  <div className="flex items-center gap-2 mt-1 text-sm opacity-75">
                    <span>{new Date(service.service_date).toLocaleDateString('en-GB')}</span>
                    <span>•</span>
                    <span>{serviceTypeLabels[service.service_type]}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm opacity-75">Engineer</p>
                  <p className="font-medium">{service.engineer?.full_name || 'Not assigned'}</p>
                </div>
              </div>
            </div>
          ))}

          {recentActivities.length === 0 && (
            <div className="p-8 text-center opacity-50">
              <p>No recent activities</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedCustomer && (
        <EditServiceModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedService(null);
          }}
          onSuccess={() => {
            loadServices();
            setShowEditModal(false);
            setSelectedService(null);
          }}
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
          serviceToEdit={selectedService}
        />
      )}

      <ViewDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedService(null);
        }}
        service={selectedService}
        onViewEvent={handleViewEvent}
      />

      {/* Event Details Modal */}
      {showEventDetailsModal && selectedEventData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-y-auto">
            {/* Modal Header with Close Button */}
            <div className="sticky top-0 bg-gradient-to-r from-slate-700 to-slate-900 text-white p-4 rounded-t-2xl flex items-center justify-between z-10">
              <h2 className="text-xl font-bold">Event Details</h2>
              <button
                onClick={() => {
                  console.log('❌ [PQServices] Closing event details modal');
                  setShowEventDetailsModal(false);
                  setSelectedEventData(null);
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Event Details Component */}
            <div className="p-6">
              <EventDetails
                event={selectedEventData.event}
                substation={selectedEventData.substation}
                impacts={selectedEventData.impacts}
                initialTab={eventDetailsInitialTab}
                onStatusChange={async (eventId, status) => {
                  console.log('🔄 [PQServices] Status change requested:', { eventId, status });
                  // Reload services after status change
                  await loadServices();
                }}
                onEventDeleted={() => {
                  console.log('🗑️ [PQServices] Event deleted, reloading services');
                  setShowEventDetailsModal(false);
                  setSelectedEventData(null);
                  setEventDetailsInitialTab('overview');
                  loadServices();
                }}
                onEventUpdated={() => {
                  console.log('🔄 [PQServices] Event updated, reloading services');
                  loadServices();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* PQSIS Import Results Modal */}
      {showImportModal && importResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl flex-shrink-0">
              <h2 className="text-2xl font-bold">Import Results</h2>
              <p className="text-blue-100 mt-1">PQSIS CSV Import Summary</p>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Check className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="text-sm text-green-700 font-medium">Successful</p>
                      <p className="text-3xl font-bold text-green-900">{importResults.success}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <X className="w-8 h-8 text-red-600" />
                    <div>
                      <p className="text-sm text-red-700 font-medium">Failed</p>
                      <p className="text-3xl font-bold text-red-900">{importResults.failed}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Details */}
              {importResults.errors.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Error Details ({importResults.errors.length})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {importResults.errors.map((error, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 text-sm">
                        <p className="font-semibold text-slate-900">Row {error.row}</p>
                        <p className="text-red-600 mt-1">{error.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success Message */}
              {importResults.success > 0 && importResults.failed === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-green-900">Import Completed Successfully!</p>
                    <p className="text-sm text-green-700 mt-1">
                      All {importResults.success} records have been imported to the database.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer - Always Visible */}
            <div className="border-t border-slate-200 p-4 flex justify-end flex-shrink-0">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResults(null);
                }}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && serviceToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                Confirm Delete
              </h2>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-slate-700 mb-4">
                Are you sure you want to delete this PQ service record?
              </p>
              
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-600">Case Number:</span>
                  <span className="text-slate-900">{serviceToDelete.case_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-600">Service Type:</span>
                  <span className="text-slate-900">{formatServiceTypeLabel(serviceToDelete.service_type)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-600">Service Date:</span>
                  <span className="text-slate-900">
                    {serviceToDelete.service_date 
                      ? new Date(serviceToDelete.service_date).toLocaleDateString('en-GB')
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>

              <p className="text-sm text-red-600 mt-4 font-semibold">
                This action cannot be undone.
              </p>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setServiceToDelete(null);
                }}
                disabled={isDeleting}
                className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!serviceToDelete?.id) return;

                  setIsDeleting(true);
                  try {
                    const { error } = await supabase
                      .from('pq_service_records')
                      .delete()
                      .eq('id', serviceToDelete.id);

                    if (error) throw error;

                    // Reload services
                    await loadServices();
                    setShowDeleteModal(false);
                    setServiceToDelete(null);
                    alert('PQ service record deleted successfully');
                  } catch (error) {
                    console.error('Error deleting service:', error);
                    alert('Failed to delete service record. Please try again.');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* PQSIS Maintenance View */}
      {mainView === 'pqsis' && (
        <div className="space-y-6">
          {/* PQSIS Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-slate-700" />
              <div>
                <h2 className="text-xl font-bold text-slate-900">PQSIS Maintenance</h2>
                <p className="text-sm text-slate-600 mt-1">An overview of service records uploaded from PQSIS</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  try {
                    const exportData = filteredPqsisRecords.map(r => ({
                      'Case No.': r.caseNo,
                      'Customer Name': r.customerName,
                      'Customer Group': r.customerGroup,
                      'Request Date': r.requestDate,
                      'Service Type': r.serviceType,
                      'Service': r.service,
                      'Service Charging (k)': r.serviceCharging,
                      'Charged Department': r.chargedDepartment,
                      'Service Completion Date': r.serviceCompletionDate,
                      'Closed Case': r.closedCase,
                      'In-Progress Case': r.inProgressCase,
                      'Completed before Target Date': r.completedBeforeTargetDate,
                      'Planned Reply Date': r.plannedReplyDate,
                      'Actual Reply Date': r.actualReplyDate,
                      'Planned Report Issue Date': r.plannedReportIssueDate,
                      'Actual Report Issue Date': r.actualReportIssueDate,
                      'IDR Number': r.idrNumber || ''
                    }));

                    const wb = XLSX.utils.book_new();
                    
                    const summary = [
                      ['PQSIS Export Summary'],
                      ['Export Date:', new Date().toLocaleDateString()],
                      ['Service Type Filter:', pqsisServiceTypeFilter],
                      ['IDR Search:', pqsisIdrSearch || 'None'],
                      ['Customer Search:', pqsisCustomerSearch || 'None'],
                      ['Total Records:', filteredPqsisRecords.length.toString()],
                      [],
                    ];

                    const ws = XLSX.utils.aoa_to_sheet(summary);
                    XLSX.utils.sheet_add_json(ws, exportData, { origin: -1 });
                    XLSX.utils.book_append_sheet(wb, ws, 'PQSIS Data');

                    const fileName = `PQSIS_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
                    XLSX.writeFile(wb, fileName);
                  } catch (error) {
                    console.error('Export error:', error);
                    alert('Failed to export data');
                  }
                }}
                disabled={filteredPqsisRecords.length === 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export to Excel
              </button>
            </div>
          </div>

          {/* Select Columns Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Select Columns to Display:
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
              {['Customer Group', 'Request Date', 'Service Type', 'Service', 'Service Charging', 'Charged Dept', 'Completion Date', 'Closed Case', 'In-Progress', 'Before Target', 'Planned Reply', 'Actual Reply', 'Planned Report', 'Actual Report', 'IDR Number'].map((column) => (
                <label
                  key={column}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={pqsisSelectedColumns.has(column as PQSISColumn)}
                    onChange={() => {
                      setPqsisSelectedColumns(prev => {
                        const next = new Set(prev);
                        if (next.has(column as PQSISColumn)) {
                          next.delete(column as PQSISColumn);
                        } else {
                          next.add(column as PQSISColumn);
                        }
                        return next;
                      });
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-xs font-medium text-slate-700">{column}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">Filter</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Service Type</label>
                <select
                  value={pqsisServiceTypeFilter}
                  onChange={(e) => setPqsisServiceTypeFilter(e.target.value as PQSISServiceType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="All">All Types</option>
                  <option value="Harmonics">Harmonics</option>
                  <option value="Supply Enquiry">Supply Enquiry</option>
                  <option value="Site Survey">Site Survey</option>
                  <option value="Technical Services">Technical Services</option>
                  <option value="PQ Site Investigation">PQ Site Investigation</option>
                  <option value="Enquiry">Enquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">IDR Number</label>
                <input
                  type="text"
                  value={pqsisIdrSearch}
                  onChange={(e) => setPqsisIdrSearch(e.target.value)}
                  placeholder="Search IDR..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={pqsisCustomerSearch}
                  onChange={(e) => setPqsisCustomerSearch(e.target.value)}
                  placeholder="Search customer..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Showing <span className="font-bold text-slate-900">{filteredPqsisRecords.length}</span> of{' '}
                <span className="font-bold text-slate-900">{pqsisRecords.length}</span> records
              </p>
              <button
                type="button"
                onClick={() => {
                  setPqsisServiceTypeFilter('All');
                  setPqsisIdrSearch('');
                  setPqsisCustomerSearch('');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
              >
                Clear All Filters
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Case No.</th>
                    <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Customer Name</th>
                    {pqsisSelectedColumns.has('Customer Group') && (
                      <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Customer Group</th>
                    )}
                    {pqsisSelectedColumns.has('Request Date') && (
                      <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Request Date</th>
                    )}
                    {pqsisSelectedColumns.has('Service Type') && (
                      <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Service Type</th>
                    )}
                    {pqsisSelectedColumns.has('Service') && (
                      <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Service</th>
                    )}
                    {pqsisSelectedColumns.has('Service Charging') && (
                      <th className="px-3 py-3 text-right font-bold whitespace-nowrap">Service Charging (k)</th>
                    )}
                    {pqsisSelectedColumns.has('Charged Dept') && (
                      <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Charged Dept</th>
                    )}
                    {pqsisSelectedColumns.has('Completion Date') && (
                      <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Completion Date</th>
                    )}
                    {pqsisSelectedColumns.has('Closed Case') && (
                      <th className="px-3 py-3 text-center font-bold whitespace-nowrap">Closed Case</th>
                    )}
                    {pqsisSelectedColumns.has('In-Progress') && (
                      <th className="px-3 py-3 text-center font-bold whitespace-nowrap">In-Progress</th>
                    )}
                    {pqsisSelectedColumns.has('Before Target') && (
                      <th className="px-3 py-3 text-center font-bold whitespace-nowrap">Before Target</th>
                    )}
                    {pqsisSelectedColumns.has('Planned Reply') && (
                      <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Planned Reply</th>
                    )}
                    {pqsisSelectedColumns.has('Actual Reply') && (
                      <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Actual Reply</th>
                    )}
                    {pqsisSelectedColumns.has('Planned Report') && (
                      <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Planned Report</th>
                    )}
                    {pqsisSelectedColumns.has('Actual Report') && (
                      <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Actual Report</th>
                    )}
                    {pqsisSelectedColumns.has('IDR Number') && (
                      <th className="px-3 py-3 text-left font-bold whitespace-nowrap">IDR Number</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPqsisRecords.slice((pqsisCurrentPage - 1) * pqsisItemsPerPage, pqsisCurrentPage * pqsisItemsPerPage).length === 0 ? (
                    <tr>
                      <td colSpan={17} className="px-3 py-8 text-center text-slate-500">
                        <Database className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                        <p>No PQSIS records found. Upload a CSV file to get started.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPqsisRecords.slice((pqsisCurrentPage - 1) * pqsisItemsPerPage, pqsisCurrentPage * pqsisItemsPerPage).map((record, idx) => (
                      <tr key={idx} className="hover:bg-blue-50">
                        <td className="px-3 py-2 text-slate-700 font-semibold">{record.caseNo}</td>
                        <td className="px-3 py-2 text-slate-700">{record.customerName}</td>
                        {pqsisSelectedColumns.has('Customer Group') && (
                          <td className="px-3 py-2 text-slate-700">{record.customerGroup}</td>
                        )}
                        {pqsisSelectedColumns.has('Request Date') && (
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{record.requestDate}</td>
                        )}
                        {pqsisSelectedColumns.has('Service Type') && (
                          <td className="px-3 py-2 text-slate-700">{record.serviceType}</td>
                        )}
                        {pqsisSelectedColumns.has('Service') && (
                          <td className="px-3 py-2 text-slate-700">{record.service}</td>
                        )}
                        {pqsisSelectedColumns.has('Service Charging') && (
                          <td className="px-3 py-2 text-slate-700 text-right">{record.serviceCharging.toFixed(1)}</td>
                        )}
                        {pqsisSelectedColumns.has('Charged Dept') && (
                          <td className="px-3 py-2 text-slate-700">{record.chargedDepartment}</td>
                        )}
                        {pqsisSelectedColumns.has('Completion Date') && (
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{record.serviceCompletionDate}</td>
                        )}
                        {pqsisSelectedColumns.has('Closed Case') && (
                          <td className="px-3 py-2 text-center">
                            <span className={classNames(
                              'px-2 py-1 rounded-full text-xs font-semibold',
                              record.closedCase === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                            )}>
                              {record.closedCase}
                            </span>
                          </td>
                        )}
                        {pqsisSelectedColumns.has('In-Progress') && (
                          <td className="px-3 py-2 text-center">
                            <span className={classNames(
                              'px-2 py-1 rounded-full text-xs font-semibold',
                              record.inProgressCase === 'Yes' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                            )}>
                              {record.inProgressCase}
                            </span>
                          </td>
                        )}
                        {pqsisSelectedColumns.has('Before Target') && (
                          <td className="px-3 py-2 text-center">
                            <span className={classNames(
                              'px-2 py-1 rounded-full text-xs font-semibold',
                              record.completedBeforeTargetDate === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            )}>
                              {record.completedBeforeTargetDate}
                            </span>
                          </td>
                        )}
                        {pqsisSelectedColumns.has('Planned Reply') && (
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{record.plannedReplyDate}</td>
                        )}
                        {pqsisSelectedColumns.has('Actual Reply') && (
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{record.actualReplyDate}</td>
                        )}
                        {pqsisSelectedColumns.has('Planned Report') && (
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{record.plannedReportIssueDate}</td>
                        )}
                        {pqsisSelectedColumns.has('Actual Report') && (
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{record.actualReportIssueDate}</td>
                        )}
                        {pqsisSelectedColumns.has('IDR Number') && (
                          <td className="px-3 py-2 text-slate-700 font-mono text-xs">{record.idrNumber || '-'}</td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {Math.ceil(filteredPqsisRecords.length / pqsisItemsPerPage) > 1 && (
              <div className="px-4 py-4 border-t border-slate-200 flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Page {pqsisCurrentPage} of {Math.ceil(filteredPqsisRecords.length / pqsisItemsPerPage)}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPqsisCurrentPage(Math.max(1, pqsisCurrentPage - 1))}
                    disabled={pqsisCurrentPage === 1}
                    className="px-3 py-1 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPqsisCurrentPage(Math.min(Math.ceil(filteredPqsisRecords.length / pqsisItemsPerPage), pqsisCurrentPage + 1))}
                    disabled={pqsisCurrentPage === Math.ceil(filteredPqsisRecords.length / pqsisItemsPerPage)}
                    className="px-3 py-1 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals (shared between both views) */}
      {selectedCustomer && (
        <EditServiceModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedService(null);
          }}
          onSuccess={() => {
            loadServices();
            setShowEditModal(false);
            setSelectedService(null);
          }}
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
          serviceToEdit={selectedService}
        />
      )}

      <ViewDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedService(null);
        }}
        service={selectedService}
        onViewEvent={handleViewEvent}
      />

      {/* Event Details Modal */}
      {showEventDetailsModal && selectedEventData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-t-2xl flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-bold">Event Details</h2>
              <button
                onClick={() => {
                  console.log('❌ [PQServices] Closing event details modal');
                  setShowEventDetailsModal(false);
                  setSelectedEventData(null);
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Event Details Component */}
            <div className="p-6">
              <EventDetails
                event={selectedEventData.event}
                substation={selectedEventData.substation}
                impacts={selectedEventData.impacts}
                initialTab={eventDetailsInitialTab}
                onStatusChange={async (eventId, status) => {
                  console.log('🔄 [PQServices] Status change requested:', { eventId, status });
                  // Reload services after status change
                  await loadServices();
                }}
                onEventDeleted={() => {
                  console.log('🗑️ [PQServices] Event deleted, reloading services');
                  setShowEventDetailsModal(false);
                  setSelectedEventData(null);
                  setEventDetailsInitialTab('overview');
                  loadServices();
                }}
                onEventUpdated={() => {
                  console.log('🔄 [PQServices] Event updated, reloading services');
                  loadServices();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* PQSIS Import Results Modal */}
      {showImportModal && importResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl flex-shrink-0">
              <h2 className="text-2xl font-bold">Import Results</h2>
              <p className="text-blue-100 mt-1">PQSIS CSV Import Summary</p>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Check className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="text-sm text-green-700 font-medium">Successful</p>
                      <p className="text-3xl font-bold text-green-900">{importResults.success}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <X className="w-8 h-8 text-red-600" />
                    <div>
                      <p className="text-sm text-red-700 font-medium">Failed</p>
                      <p className="text-3xl font-bold text-red-900">{importResults.failed}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Details */}
              {importResults.errors.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Error Details ({importResults.errors.length})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {importResults.errors.map((error, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 text-sm">
                        <p className="font-semibold text-slate-900">Row {error.row}</p>
                        <p className="text-red-600 mt-1">{error.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success Message */}
              {importResults.success > 0 && importResults.failed === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-green-900">Import Completed Successfully!</p>
                    <p className="text-sm text-green-700 mt-1">
                      All {importResults.success} records have been imported to the database.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 p-4 flex justify-end flex-shrink-0">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResults(null);
                }}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Service Modal */}
      {showDeleteModal && serviceToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-2xl">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                Delete Service Record
              </h2>
              <p className="text-red-100 mt-1 text-sm">This action cannot be undone</p>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-slate-700 mb-4">
                Are you sure you want to delete this PQ service record?
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-sm text-slate-600">Customer</p>
                <p className="font-semibold text-slate-900">{serviceToDelete.customer?.name}</p>
                <p className="text-sm text-slate-600 mt-2">Service Date</p>
                <p className="font-semibold text-slate-900">
                  {new Date(serviceToDelete.service_date).toLocaleDateString('en-GB')}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 p-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setServiceToDelete(null);
                }}
                disabled={isDeleting}
                className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!serviceToDelete?.id) return;

                  setIsDeleting(true);
                  try {
                    const { error } = await supabase
                      .from('pq_service_records')
                      .delete()
                      .eq('id', serviceToDelete.id);

                    if (error) throw error;

                    // Reload services
                    await loadServices();
                    setShowDeleteModal(false);
                    setServiceToDelete(null);
                    alert('PQ service record deleted successfully');
                  } catch (error) {
                    console.error('Error deleting service:', error);
                    alert('Failed to delete service record. Please try again.');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
