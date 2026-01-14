import { useEffect, useState } from 'react';
import { Search, Mail, MessageSquare, Radio, CheckCircle, XCircle, Clock, AlertCircle, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import NotificationLogDetail from './NotificationLogDetail';

interface NotificationLog {
  id: string;
  event_id: string | null;
  rule_id: string | null;
  template_id: string | null;
  recipient_id: string;
  recipient_email: string;
  channel: string;
  status: 'pending' | 'sent' | 'failed' | 'suppressed';
  subject: string | null;
  message_body: string;
  metadata: any;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  rule?: { name: string };
  template?: { name: string; code: string };
  recipient?: { full_name: string; email: string };
}

type StatusFilter = 'all' | 'pending' | 'sent' | 'failed' | 'suppressed';
type ChannelFilter = 'all' | 'email' | 'sms' | 'teams';

export default function NotificationLogs() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, statusFilter, channelFilter, searchQuery, startDate, endDate]);

  const loadLogs = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('notification_logs')
      .select(`
        *,
        rule:notification_rules(name),
        template:notification_templates(name, code),
        recipient:profiles!recipient_id(full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      toast.error('Failed to load notification logs');
      console.error('Error loading logs:', error);
    } else if (data) {
      setLogs(data as any);
    }
    
    setLoading(false);
  };

  const filterLogs = () => {
    let filtered = logs;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    // Filter by channel
    if (channelFilter !== 'all') {
      filtered = filtered.filter(log => log.channel === channelFilter);
    }

    // Filter by search query (recipient email or name)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.recipient_email.toLowerCase().includes(query) ||
        log.recipient?.full_name?.toLowerCase().includes(query) ||
        log.subject?.toLowerCase().includes(query)
      );
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(log => new Date(log.created_at) >= new Date(startDate));
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      filtered = filtered.filter(log => new Date(log.created_at) <= endDateTime);
    }

    setFilteredLogs(filtered);
  };

  const handleViewDetails = (log: NotificationLog) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedLog(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
            <CheckCircle className="w-3 h-3" />
            Sent
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'suppressed':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
            <AlertCircle className="w-3 h-3" />
            Suppressed
          </span>
        );
      default:
        return null;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-4 h-4 text-blue-600" />;
      case 'sms':
        return <MessageSquare className="w-4 h-4 text-green-600" />;
      case 'teams':
        return <Radio className="w-4 h-4 text-purple-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Notification Logs</h2>
        <p className="text-slate-600 mt-1">View notification history and delivery status</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Total Sent</p>
              <p className="text-3xl font-bold text-slate-900">{logs.length}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <Mail className="w-6 h-6 text-slate-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Successful</p>
              <p className="text-3xl font-bold text-green-600">
                {logs.filter(l => l.status === 'sent').length}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Failed</p>
              <p className="text-3xl font-bold text-red-600">
                {logs.filter(l => l.status === 'failed').length}
              </p>
            </div>
            <div className="bg-red-50 p-3 rounded-xl">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Success Rate</p>
              <p className="text-3xl font-bold text-blue-600">
                {logs.length > 0 
                  ? Math.round((logs.filter(l => l.status === 'sent').length / logs.length) * 100)
                  : 0}%
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by recipient name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
                <option value="suppressed">Suppressed</option>
              </select>
            </div>

            {/* Channel Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Channel</label>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value as ChannelFilter)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Channels</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="teams">Teams</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Clear Filters */}
          {(statusFilter !== 'all' || channelFilter !== 'all' || searchQuery || startDate || endDate) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setChannelFilter('all');
                setSearchQuery('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Recipient
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Template
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-medium">No notifications found</p>
                    <p className="text-sm mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-medium text-slate-900">
                          {new Date(log.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-slate-600">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {log.recipient?.full_name || 'Unknown'}
                        </p>
                        <p className="text-sm text-slate-600">{log.recipient_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getChannelIcon(log.channel)}
                        <span className="text-sm font-medium text-slate-700 capitalize">
                          {log.channel}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">
                          {log.template?.name || 'N/A'}
                        </p>
                        {log.template?.code && (
                          <code className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {log.template.code}
                          </code>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleViewDetails(log)}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-all group"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Info */}
        {filteredLogs.length > 0 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Showing {filteredLogs.length} of {logs.length} notifications
              {logs.length >= 500 && ' (limited to most recent 500)'}
            </p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedLog && (
        <NotificationLogDetail log={selectedLog} onClose={handleCloseDetail} />
      )}
    </div>
  );
}
