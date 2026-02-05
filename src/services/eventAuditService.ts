import { supabase } from '../lib/supabase';
import { EventOperationType, EventAuditLog } from '../types/database';

/**
 * Event Audit Logging Service
 * Provides functions to log user operations on events and retrieve audit trail
 */

export class EventAuditService {
  /**
   * Get current authenticated user ID
   */
  private static async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Log an operation on an event
   */
  static async logOperation(
    eventId: string,
    operationType: EventOperationType,
    operationDetails: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      const userId = await this.getCurrentUserId();

      const { error } = await supabase
        .from('event_audit_log')
        .insert({
          event_id: eventId,
          operation_type: operationType,
          operation_details: operationDetails,
          user_id: userId
        });

      if (error) {
        console.error('❌ Error logging audit entry:', error);
        return false;
      }

      console.log(`✅ Audit log created: ${operationType} for event ${eventId}`);
      return true;
    } catch (error) {
      console.error('❌ Unexpected error logging audit entry:', error);
      return false;
    }
  }

  /**
   * Get audit logs for a specific event
   */
  static async getEventAuditLogs(eventId: string): Promise<EventAuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('event_audit_log')
        .select(`
          *,
          user:profiles(
            id,
            email,
            full_name
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching audit logs:', error);
        return [];
      }

      return (data || []) as EventAuditLog[];
    } catch (error) {
      console.error('❌ Unexpected error fetching audit logs:', error);
      return [];
    }
  }

  /**
   * Log: Event marked as false
   */
  static async logMarkFalse(eventId: string, note?: string): Promise<boolean> {
    return this.logOperation(eventId, 'marked_false', {
      note: note || 'Event marked as false detection'
    });
  }

  /**
   * Log: Event converted from false to normal
   */
  static async logConvertFromFalse(eventId: string, note?: string): Promise<boolean> {
    return this.logOperation(eventId, 'converted_from_false', {
      note: note || 'Event converted from false to normal'
    });
  }

  /**
   * Log: Batch of events marked as false (mother + children)
   */
  static async logBatchMarkFalse(motherEventId: string, childEventIds: string[]): Promise<boolean> {
    return this.logOperation(motherEventId, 'batch_marked_false', {
      note: `Mother event and ${childEventIds.length} child events marked as false`,
      child_event_ids: childEventIds,
      total_events: childEventIds.length + 1
    });
  }

  /**
   * Log: Full ungroup (all children ungrouped from mother)
   */
  static async logUngroupFull(motherEventId: string, childEventIds: string[]): Promise<boolean> {
    return this.logOperation(motherEventId, 'ungrouped_full', {
      note: `All ${childEventIds.length} child events ungrouped`,
      child_event_ids: childEventIds,
      total_children: childEventIds.length
    });
  }

  /**
   * Log: Partial ungroup (specific children ungrouped)
   */
  static async logUngroupPartial(motherEventId: string, childEventIds: string[]): Promise<boolean> {
    return this.logOperation(motherEventId, 'ungrouped_partial', {
      note: `${childEventIds.length} child event(s) ungrouped`,
      child_event_ids: childEventIds,
      ungrouped_count: childEventIds.length
    });
  }

  /**
   * Log: IDR record created
   */
  static async logIDRCreated(eventId: string, idrNo: string, manualCreate: boolean): Promise<boolean> {
    return this.logOperation(eventId, 'idr_created', {
      idr_no: idrNo,
      manual_create: manualCreate,
      note: manualCreate ? 'IDR record manually created' : 'IDR record automatically created'
    });
  }

  /**
   * Log: IDR record updated
   */
  static async logIDRUpdated(
    eventId: string,
    affectedFields: string[],
    fieldChanges?: Record<string, { from: any; to: any }>
  ): Promise<boolean> {
    return this.logOperation(eventId, 'idr_updated', {
      affected_fields: affectedFields,
      field_changes: fieldChanges,
      note: `IDR fields updated: ${affectedFields.join(', ')}`
    });
  }

  /**
   * Log: Event status changed
   */
  static async logStatusChange(
    eventId: string,
    fromStatus: string,
    toStatus: string
  ): Promise<boolean> {
    return this.logOperation(eventId, 'status_changed', {
      from: fromStatus,
      to: toStatus,
      note: `Status changed from ${fromStatus} to ${toStatus}`
    });
  }

  /**
   * Log: Event severity changed
   */
  static async logSeverityChange(
    eventId: string,
    fromSeverity: string,
    toSeverity: string
  ): Promise<boolean> {
    return this.logOperation(eventId, 'severity_changed', {
      from: fromSeverity,
      to: toSeverity,
      note: `Severity changed from ${fromSeverity} to ${toSeverity}`
    });
  }

  /**
   * Log: Event cause updated
   */
  static async logCauseUpdate(eventId: string, affectedFields: string[]): Promise<boolean> {
    return this.logOperation(eventId, 'cause_updated', {
      affected_fields: affectedFields,
      note: `Cause analysis updated: ${affectedFields.join(', ')}`
    });
  }

  /**
   * Log: PSBG cause updated
   */
  static async logPSBGCauseUpdate(
    eventId: string,
    fromCause: string | null,
    toCause: string | null
  ): Promise<boolean> {
    return this.logOperation(eventId, 'psbg_cause_updated', {
      from: fromCause,
      to: toCause,
      note: `PSBG cause updated: ${fromCause || 'None'} → ${toCause || 'None'}`
    });
  }

  /**
   * Log: General event modification
   */
  static async logEventModified(
    eventId: string,
    affectedFields: string[],
    note?: string
  ): Promise<boolean> {
    return this.logOperation(eventId, 'event_modified', {
      affected_fields: affectedFields,
      note: note || `Event fields modified: ${affectedFields.join(', ')}`
    });
  }

  /**
   * Log: Event resolved
   */
  static async logEventResolved(eventId: string, finalStatus: string): Promise<boolean> {
    return this.logOperation(eventId, 'event_resolved', {
      final_status: finalStatus,
      note: `Event resolved with status: ${finalStatus}`
    });
  }

  /**
   * Log: Event deleted
   */
  static async logEventDeleted(eventId: string, reason?: string): Promise<boolean> {
    return this.logOperation(eventId, 'event_deleted', {
      reason: reason,
      note: reason || 'Event deleted'
    });
  }

  /**
   * Get operation type display label
   */
  static getOperationTypeLabel(operationType: EventOperationType): string {
    const labels: Record<EventOperationType, string> = {
      event_created: 'Event Created',
      event_detected: 'Event Detected',
      marked_false: 'Marked as False Event',
      converted_from_false: 'Converted from False Event',
      grouped_automatic: 'Automatically Grouped',
      grouped_manual: 'Manually Grouped',
      ungrouped_full: 'Fully Ungrouped',
      ungrouped_partial: 'Partially Ungrouped',
      idr_created: 'IDR Created',
      idr_updated: 'IDR Updated',
      status_changed: 'Status Changed',
      severity_changed: 'Severity Changed',
      cause_updated: 'Cause Updated',
      psbg_cause_updated: 'PSBG Cause Updated',
      event_modified: 'Event Modified',
      batch_marked_false: 'Batch Marked False',
      event_resolved: 'Event Resolved',
      event_deleted: 'Event Deleted'
    };
    return labels[operationType] || operationType;
  }

  /**
   * Get operation type icon
   */
  static getOperationTypeIcon(operationType: EventOperationType): string {
    const icons: Record<EventOperationType, string> = {
      event_created: '📝',
      event_detected: '👁️',
      marked_false: '🚫',
      converted_from_false: '✅',
      grouped_automatic: '🤖🔗',
      grouped_manual: '👤🔗',
      ungrouped_full: '🔓',
      ungrouped_partial: '🔓',
      idr_created: '📄',
      idr_updated: '📝',
      status_changed: '🔄',
      severity_changed: '⚠️',
      cause_updated: '🔍',
      psbg_cause_updated: '🌿',
      event_modified: '✏️',
      batch_marked_false: '🚫📦',
      event_resolved: '✅',
      event_deleted: '🗑️'
    };
    return icons[operationType] || '📋';
  }

  /**
   * Get operation type color class
   */
  static getOperationTypeColor(operationType: EventOperationType): string {
    const colors: Record<EventOperationType, string> = {
      event_created: 'purple',
      event_detected: 'purple',
      marked_false: 'red',
      converted_from_false: 'green',
      grouped_automatic: 'blue',
      grouped_manual: 'indigo',
      ungrouped_full: 'orange',
      ungrouped_partial: 'orange',
      idr_created: 'teal',
      idr_updated: 'cyan',
      status_changed: 'blue',
      severity_changed: 'yellow',
      cause_updated: 'slate',
      psbg_cause_updated: 'green',
      event_modified: 'slate',
      batch_marked_false: 'red',
      event_resolved: 'green',
      event_deleted: 'gray'
    };
    return colors[operationType] || 'gray';
  }
}
