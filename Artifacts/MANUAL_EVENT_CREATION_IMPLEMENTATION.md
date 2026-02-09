# Manual Voltage Dip Event Creation - Implementation Guide

**Date:** February 9, 2026  
**Feature:** Create Voltage Dip Event Workspace (Mother + Child Events)  
**Status:** ✅ Implementation Complete

---

## Overview

This implementation adds a new dedicated workspace for manually creating voltage dip events with Mother-Child relationships. The workspace opens in a new browser tab to prevent data loss and allows batch entry of multiple incidents.

---

## Database Migration

### Step 1: Run Migration Script

```bash
# Navigate to project directory
cd /workspaces/codespaces-react

# Run the migration script
psql $DATABASE_URL -f scripts/add_manual_event_fields.sql
```

### Migration Details

**New Fields Added:**
- `min_volt_recorded` (BOOLEAN) - Minimum voltage recorded flag
- `non_clp_system_fault` (BOOLEAN) - Fault originated outside CLP network

**Field Mappings:**
- `circuit_id` → Tx No (Transformer Number)
- `v1`, `v2`, `v3` → VL1, VL2, VL3 percentages (already exists)
- `false_event` → FR Trigger (Fault Recorder triggered) (already exists)
- `fault_type` → Deprecated, use `non_clp_system_fault` instead

**Indexes Created:**
- `idx_pq_events_non_clp_fault` - For filtering non-CLP faults
- `idx_pq_events_min_volt` - For filtering min voltage recorded events
- `idx_pq_events_manual_create` - For filtering manually created events

---

## Files Changed/Created

### 1. Database Migration
- **`scripts/add_manual_event_fields.sql`** ✅ NEW
  - Adds new boolean fields to pq_events table
  - Creates indexes for performance
  - Verification queries

### 2. TypeScript Interface
- **`src/types/database.ts`** ✅ UPDATED
  - Added `min_volt_recorded: boolean`
  - Added `non_clp_system_fault: boolean`
  - Marked `fault_type` as deprecated

### 3. New Workspace Component
- **`src/components/EventManagement/CreateVoltageDipWorkspace.tsx`** ✅ NEW
  - Full workspace component (700+ lines)
  - Multi-row table interface
  - Single Mother Event enforcement
  - Batch save logic
  - Notification integration

### 4. Entry Point for New Tab
- **`create-voltage-dip-event.html`** ✅ NEW
  - Standalone HTML entry point
- **`src/create-voltage-dip-event.tsx`** ✅ NEW
  - React root for workspace

### 5. Updated Event Management
- **`src/components/EventManagement/EventManagement.tsx`** ✅ UPDATED
  - Replaced "Create Event" button with "Create Voltage Dip Event"
  - Opens new tab instead of modal
  - Removed old modal code (~450 lines removed)

---

## Features Implemented

### ✅ AC1 - Entry Trigger
- "Create Voltage Dip Event" button on Event List page
- Opens in new browser tab (prevents data loss)
- URL: `/create-voltage-dip-event`

### ✅ AC2 - Entry Form Fields (Per Row)
All fields implemented:
- **Is Mother Event** (Checkbox) - Only one per group enforced
- **Incident Date/Time** - High-precision timestamp (datetime-local input)
- **Voltage Level** - Dropdown (400kV, 132kV, 11kV, 380V)
- **Source Substation** - Searchable dropdown from database
- **Tx No** - Transformer ID (text input, maps to `circuit_id`)
- **Phase Data** - VL1 (%), VL2 (%), VL3 (%) - Number inputs (0-100)
- **Duration (ms)** - Total duration (number input)
- **Min Volt** - Yes/No toggle (maps to `min_volt_recorded`)
- **FR Trigger** - Yes/No toggle (maps to `false_event`)
- **Remarks** - Free text field

### ✅ AC3 - System-Level Flags
- **Non-CLP System Fault** - Global checkbox (applies to all events in group)
- **Send Notification** - Triggers notification system (demo mode - log only)

### ✅ AC4 - Batch Save & Grouping
- Validates exactly one Mother Event selected
- Creates Mother Event first with `is_mother_event=true`
- Creates Child Events with `parent_event_id` reference
- Grouping type set to `'manual'`
- All events marked with `manual_create_idr=true`
- Audit log created for tracking
- Refreshes Event List after save
- Triggers notification if checkbox enabled (demo mode)

---

## User Workflow

### Step-by-Step Usage

1. **Navigate to Event Management**
   - Click "Events" in sidebar
   - View existing events

2. **Click "Create Voltage Dip Event"**
   - Green button in top-right toolbar
   - Opens new browser tab

3. **Add Incident Rows**
   - First row is Mother Event by default
   - Click "+ Add Incident" to add child events
   - Delete rows with trash icon (minimum 1 row required)

4. **Fill in Event Details**
   - **Required fields** marked with *
   - Select Mother Event checkbox (only one allowed)
   - Enter incident time, substation, transformer number
   - Input VL1/VL2/VL3 percentages (0-100%)
   - Set duration in milliseconds
   - Toggle Min Volt and FR Trigger as needed

5. **Set System Flags**
   - Check "Non-CLP System Fault" if external fault
   - Check "Send Notification" to trigger notification (demo mode)

6. **Save Events**
   - Click "Save All Events" button
   - System validates all fields
   - Creates Mother + Child events in database
   - Shows success message
   - Tab closes automatically

---

## Technical Details

### Mother Event Selection Logic
```typescript
// Enforce single Mother checkbox
const handleMotherCheckChange = (id: string, checked: boolean) => {
  if (checked) {
    // Uncheck all other mother checkboxes
    setRows(rows.map(r => ({ ...r, is_mother: r.id === id })));
  } else {
    // Don't allow unchecking if it's the only mother
    alert('At least one Mother Event must be selected.');
  }
};
```

### Severity Calculation
```typescript
const calculateSeverity = (v1: number, v2: number, v3: number): SeverityLevel => {
  const minVoltage = Math.min(v1, v2, v3);
  if (minVoltage < 50) return 'critical';
  if (minVoltage < 70) return 'high';
  if (minVoltage < 85) return 'medium';
  return 'low';
};
```

### Notification Integration (Demo Mode)
```typescript
// Create notification log entry without sending actual notification
await supabase.from('notification_logs').insert({
  rule_id: rule.id,
  event_id: motherEvent.id,
  status: 'suppressed',
  suppression_reason: 'Demo mode - notification not sent (manual event creation)',
  triggered_by: { system: false, manual_creation: true }
});
```

---

## Validation Rules

### Per-Row Validation
- **Timestamp**: Required, valid datetime format
- **Substation**: Required, must exist in database
- **Tx No (circuit_id)**: Required, non-empty string
- **VL1/VL2/VL3**: Required, 0-100% range
- **Duration**: Required, must be > 0 milliseconds

### Global Validation
- **Exactly ONE Mother Event** - Enforced before save
- **At least ONE row** - Cannot save empty table

---

## Testing Checklist

### ✅ Functional Testing
- [ ] Button opens new tab correctly
- [ ] First row defaults to Mother Event
- [ ] Can add multiple incident rows
- [ ] Cannot delete last remaining row
- [ ] Checking Mother checkbox unchecks others
- [ ] All form fields save correctly
- [ ] Validation errors display properly
- [ ] System flags apply to all events
- [ ] Success message shows after save
- [ ] Tab closes after successful save
- [ ] Events appear in Event List after save

### ✅ Database Testing
```sql
-- Verify Mother Event created
SELECT id, is_mother_event, is_child_event, parent_event_id, 
       v1, v2, v3, circuit_id, min_volt_recorded, non_clp_system_fault
FROM pq_events 
WHERE manual_create_idr = true
ORDER BY created_at DESC LIMIT 10;

-- Verify Child Events linked correctly
SELECT 
  mother.id as mother_id,
  mother.timestamp as mother_time,
  child.id as child_id,
  child.timestamp as child_time,
  child.parent_event_id
FROM pq_events mother
LEFT JOIN pq_events child ON child.parent_event_id = mother.id
WHERE mother.is_mother_event = true
  AND mother.manual_create_idr = true
ORDER BY mother.created_at DESC LIMIT 20;

-- Verify audit logs
SELECT 
  event_id, 
  operation_type, 
  operation_details->>'source' as source,
  operation_details->>'child_count' as child_count,
  created_at
FROM event_audit_logs
WHERE operation_type = 'event_created'
  AND operation_details->>'source' = 'manual_workspace'
ORDER BY created_at DESC LIMIT 10;
```

---

## Known Limitations

1. **Browser Tab Dependency**: Requires pop-up blocker disabled
2. **No Draft Save**: Cannot save work-in-progress (add if needed)
3. **No Bulk Edit**: Must edit events individually after creation
4. **Demo Mode Notifications**: Notifications logged but not sent (for demonstration)

---

## Future Enhancements

### Short-term (Optional)
- Add "Save as Draft" feature
- Export incident table to CSV before save
- Import incidents from CSV file
- Real-time validation as user types

### Medium-term
- Support for other event types (voltage swell, interruption)
- Waveform CSV upload for each incident
- Customer impact automatic calculation
- IDR number auto-generation

---

## Troubleshooting

### Issue: Button doesn't open new tab
**Solution**: Check browser pop-up blocker settings

### Issue: Substations dropdown empty
**Solution**: Verify database has substation records
```sql
SELECT COUNT(*) FROM substations;
```

### Issue: Save button disabled
**Solution**: 
- Check if exactly one Mother Event selected
- Verify all required fields filled
- Look for validation errors (red borders)

### Issue: Events not appearing in Event List
**Solution**:
- Refresh the main Event List page
- Check filters (don't filter out manual events)
- Verify database insert succeeded (check console logs)

---

## Support

**Questions?** Contact:
- **Product Manager**: Feature requirements
- **Tech Lead**: Technical implementation
- **DBA**: Database schema questions

**Feedback?** Create GitHub Issue with label `manual-event-creation`

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-09 | 1.0.0 | Initial implementation - All 4 ACs complete |

---

**Implementation Status:** ✅ COMPLETE - Ready for Business Review
