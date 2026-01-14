# Day 2 Setup Guide - TypeScript Types & Services

**Date:** January 14, 2026  
**Status:** ✅ COMPLETED  
**Migration Phase:** Day 2 of 5-day implementation plan

---

## Summary

Day 2 focused on building the TypeScript foundation for the notification system:
- ✅ Added 7 notification table interfaces to `database.ts`
- ✅ Created comprehensive `notificationService.ts` with 40+ functions
- ✅ Implemented variable substitution engine
- ✅ Built rule evaluation engine with multi-condition logic
- ✅ Added demo notification sender
- ✅ Extended user management with template approval permissions

---

## Files Modified

### 1. src/types/database.ts
**Added:** 7 notification system interfaces (lines 620+)

**New Types:**
```typescript
- NotificationChannel
- NotificationTemplate  
- NotificationGroup
- NotificationGroupMember
- NotificationRule
- NotificationLog
- NotificationSystemConfig
```

**Key Features:**
- Full type definitions matching database schema
- Proper TypeScript types for enums (status, channel types, etc.)
- Nested object types for config and monitoring metrics
- Variable definition structure with required/default value support

---

### 2. src/services/notificationService.ts
**Created:** New file with 800+ lines, 40+ exported functions

#### Template Management (9 functions)
- `getTemplates(status?)` - List all templates with optional status filter
- `getTemplate(id)` - Get single template by ID
- `getTemplateByCode(code)` - Get approved template by code for rules
- `createTemplate(template)` - Create new draft template
- `updateTemplate(id, updates)` - Update template (versions approved templates)
- `approveTemplate(id)` - Approve template (admin only)
- `archiveTemplate(id)` - Archive template
- `deleteTemplate(id)` - Delete draft template only

**Versioning Logic:**
- Approved templates cannot be edited directly
- Updating creates new draft version with incremented version number
- Original approved template remains unchanged

#### Channel Management (4 functions)
- `getChannels()` - List all channels
- `getChannel(id)` - Get single channel
- `updateChannel(id, updates)` - Update channel config
- `updateChannelStatus(id, status)` - Change channel status

#### Group Management (8 functions)
- `getGroups()` - List all groups with member counts
- `getGroup(id)` - Get group with members and profiles
- `createGroup(group)` - Create new group
- `updateGroup(id, updates)` - Update group
- `deleteGroup(id)` - Delete group and members
- `addGroupMember(member)` - Add user to group
- `removeGroupMember(id)` - Remove user from group
- `updateGroupMember(id, updates)` - Update member preferences

#### Rule Management (6 functions)
- `getRules(activeOnly?)` - List rules with template details
- `getRule(id)` - Get single rule with full template
- `createRule(rule)` - Create new rule
- `updateRule(id, updates)` - Update rule
- `toggleRule(id, active)` - Enable/disable rule
- `deleteRule(id)` - Delete rule

#### Logs (3 functions)
- `getLogs(filters?)` - Get logs with filters (rule, event, channel, status, date range)
- `getEventLogs(eventId)` - Get all logs for specific event
- `createLog(log)` - Create log entry

#### System Config (4 functions)
- `getSystemConfig()` - Get system configuration
- `updateSystemConfig(updates)` - Update config
- `setTyphoonMode(enabled, until?)` - Toggle typhoon mode
- `setMaintenanceMode(enabled, until?)` - Toggle maintenance mode

#### Variable Substitution Engine
**Function:** `substituteVariables(template, variables)`

**How It Works:**
1. Finds all `{{variable}}` placeholders in template string
2. Replaces with actual values from variables object
3. Handles different data types:
   - Dates → ISO string
   - Numbers → Localized string with commas
   - Objects/Arrays → JSON.stringify
   - undefined/null → Keeps placeholder
4. Returns processed string

**Helper:** `prepareEventVariables(event)`
- Converts PQEvent to variable dictionary
- Formats duration (ms → seconds)
- Formats magnitude (decimal → percentage)
- Provides fallbacks for optional fields

**Example:**
```typescript
const template = "Event {{event_type}} at {{location}} with magnitude {{magnitude}}";
const variables = { 
  event_type: "Voltage Dip", 
  location: "SS001", 
  magnitude: "85%" 
};

substituteVariables(template, variables);
// Returns: "Event Voltage Dip at SS001 with magnitude 85%"
```

#### Rule Evaluation Engine
**Function:** `evaluateRule(event, rule)`

**Condition Operators:**
- `equals` - Exact match
- `not_equals` - Not equal
- `greater_than` - Numeric comparison >
- `less_than` - Numeric comparison <
- `in` - Value in array
- `contains` - String/array contains

**Logic:**
- All conditions must match (AND logic)
- No conditions = matches all events
- Inactive rules always return false
- Supports nested field access (e.g., `substation.name`)

**Helper:** `findMatchingRules(event)`
- Finds all active rules that match event
- Returns sorted by priority (ascending)

**Example:**
```typescript
const rule = {
  conditions: [
    { field: 'event_type', operator: 'equals', value: 'voltage_dip' },
    { field: 'severity', operator: 'in', value: ['critical', 'high'] },
    { field: 'magnitude', operator: 'less_than', value: 90 }
  ]
};

evaluateRule(event, rule);
// Returns true only if ALL conditions match
```

#### Demo Notification Sender
**Function:** `sendDemoNotification(channel, recipient, subject, message, metadata?)`

**Demo Mode Features:**
- Logs to console instead of real channels
- Structured console output with borders
- Records in notification_logs table with 'sent' status
- Useful for testing without real email/SMS/Teams integrations

**Function:** `processEventNotifications(event)`
- Complete workflow: Find rules → Generate messages → Send notifications
- Finds matching rules for event
- Prepares event variables
- Gets group members for each rule
- Sends notification on each channel to all recipients
- Logs all sends to database

---

### 3. src/services/userManagementService.ts
**Modified:** Added 2 new permission functions

**New Functions:**
1. `canApproveNotificationTemplates(userRole)`
   - Returns true for `system_admin` and `system_owner`
   - Returns false for `manual_implementator` and `watcher`

2. `hasPermission(role, moduleId, action)`
   - Generic permission checker
   - Checks if role has specific action for module
   - Used for granular access control

**Permission Model:**
- **system_admin** & **system_owner**: Full access, can approve templates
- **manual_implementator**: Can create draft templates, cannot approve
- **watcher**: Read-only access

---

## Testing Checklist

### TypeScript Compilation
```bash
# Check for type errors
npm run type-check
# or
tsc --noEmit
```

Expected: ✅ No errors

### Service Functions (Manual Testing)

#### 1. Template Management
```typescript
import * as notificationService from './services/notificationService';

// Create draft template
const template = await notificationService.createTemplate({
  name: "Test Template",
  code: "TEST001",
  description: "Test template",
  email_subject: "Test: {{event_type}}",
  email_body: "Event at {{location}} with magnitude {{magnitude}}",
  sms_body: null,
  teams_body: null,
  variables: [
    { name: "event_type", description: "Type of event", required: true },
    { name: "location", description: "Event location", required: true },
    { name: "magnitude", description: "Event magnitude", required: false }
  ],
  applicable_channels: ["email"],
  tags: ["test"]
});

// Approve template (requires admin role)
await notificationService.approveTemplate(template.data.id);
```

#### 2. Variable Substitution
```typescript
const template = "Event {{event_type}} occurred at {{location}}. Magnitude: {{magnitude}}%";
const variables = {
  event_type: "Voltage Dip",
  location: "Substation A",
  magnitude: 85
};

const result = notificationService.substituteVariables(template, variables);
console.log(result);
// Expected: "Event Voltage Dip occurred at Substation A. Magnitude: 85%"
```

#### 3. Rule Evaluation
```typescript
const event = {
  event_type: 'voltage_dip',
  severity: 'critical',
  magnitude: 80,
  // ... other fields
};

const rule = {
  conditions: [
    { field: 'event_type', operator: 'equals', value: 'voltage_dip' },
    { field: 'magnitude', operator: 'less_than', value: 90 }
  ],
  active: true
};

const matches = notificationService.evaluateRule(event, rule);
console.log(matches); // Expected: true
```

#### 4. Demo Notification
```typescript
await notificationService.sendDemoNotification(
  'email',
  'test@example.com',
  'Test Subject',
  'Test message body',
  { event_id: '123', template_id: '456' }
);
// Check console for formatted output
// Check notification_logs table for entry
```

#### 5. Permission Check
```typescript
import * as userService from './services/userManagementService';

// Check admin can approve
console.log(userService.canApproveNotificationTemplates('system_admin')); // true

// Check operator cannot approve
console.log(userService.canApproveNotificationTemplates('manual_implementator')); // false
```

---

## Integration Points

### Database
- All services use `supabase` client from `lib/supabase`
- RLS policies enforced automatically
- All functions return Supabase response format: `{ data, error }`

### Authentication
- User ID retrieved via `supabase.auth.getUser()`
- Used for `created_by`, `approved_by`, `updated_by` fields

### Type Safety
- All functions strongly typed with TypeScript interfaces
- IDE autocomplete for all database fields
- Compile-time error checking

---

## Next Steps: Day 3

### Template Management UI
**Files to create:**
1. `src/pages/Notifications/TemplateList.tsx`
   - Table with all templates
   - Filter by status (draft/approved/archived)
   - Edit/Approve/Archive actions

2. `src/pages/Notifications/TemplateEditor.tsx`
   - Form for template details
   - Tab interface for Email/SMS/Teams content
   - Variable manager
   - Preview pane with sample substitution

3. `src/pages/Notifications/TemplateApprovalModal.tsx`
   - Preview all channels
   - Approve/Reject buttons (admin only)
   - Comments field for rejection

4. Update navigation to include Templates page

**Required Components:**
- Rich text editor for email HTML (TipTap or Quill)
- Markdown editor for Teams (SimpleMDE)
- Variable insertion helper (dropdown)
- Character counter for SMS (160 chars)

---

## Troubleshooting

### Error: "Cannot find module 'lib/supabase'"
**Solution:** Ensure Supabase client is configured at `src/lib/supabase.ts`

### Error: Type errors in notificationService.ts
**Solution:** 
1. Ensure `database.ts` types are imported correctly
2. Check that all 7 notification interfaces are defined
3. Run `npm install` if types are missing

### Error: RLS policy violation when testing
**Solution:**
1. Ensure you're authenticated: `supabase.auth.getUser()`
2. Check your profile role in database (should be 'admin' for testing)
3. Verify migration applied successfully with RLS policies

### Variable substitution not working
**Solution:**
1. Check variable names match template exactly (case-sensitive)
2. Ensure variables object has all required fields
3. Test with `console.log(variables)` before substitution

---

## Performance Considerations

### Caching
- Consider caching approved templates (rarely change)
- Cache system config (checked frequently)
- Cache channel list (static data)

### Query Optimization
- Use `.select('*')` sparingly, select only needed columns
- Use indexes on frequently queried fields (created_at, status, active)
- Batch group member queries when processing rules

### Rule Evaluation
- Active rules only loaded (filter inactive in DB query)
- Sort by priority in DB, not in memory
- Consider limiting max rules per event (system config)

---

## API Documentation

Full function signatures available in:
- [notificationService.ts](vscode-vfs://github/Arthuric367/PQMAP-codespace/src/services/notificationService.ts)
- [userManagementService.ts](vscode-vfs://github/Arthuric367/PQMAP-codespace/src/services/userManagementService.ts)
- [database.ts](vscode-vfs://github/Arthuric367/PQMAP-codespace/src/types/database.ts) - Type definitions

---

**Status:** ✅ Day 2 Complete - Ready for Day 3 (UI Implementation)  
**No errors:** TypeScript compiles successfully  
**Next:** Create Template Management UI components
