# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`  
**Created**: [DATE]  
**Status**: Draft  
**Implementation Status**: [✅ Implemented | 🚧 Partial | ❌ Not Implemented]  
**Input**: User description: "$ARGUMENTS"

## Implementation Status Overview

### Status Legend
- ✅ **Fully Implemented**: Feature is complete and deployed
- 🚧 **Partially Implemented**: Some components exist, but incomplete
- ❌ **Not Implemented**: Feature planned but not started
- 🔄 **In Progress**: Currently being developed

### Feature Components Status
| Component | Status | Notes |
|-----------|--------|-------|
| [Component Name] | ✅/🚧/❌ | [Brief note if needed] |

---

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently - e.g., "Can be fully tested by [specific action] and delivers [specific value]"]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

**Acceptance Criteria** *(detailed)*:

**AC1 - [Category Name]** (e.g., Core Event Data):
- **Database**: Retrieved from `[table_name]` table
  - Column: `[column_name]` ([data_type]) - [description] - Example: `[value]`
  - Column: `[column_name]` ([data_type]) - [description] - Example: `[value]`
- **UI Component**: [Component type] (e.g., "Date picker with DD/MM/YYYY HH:mm:ss format")
- **Validation Rules**:
  - [Rule 1] (e.g., "Date cannot be in the future")
  - [Rule 2] (e.g., "Voltage must be > 0 and ≤ 100")
- **Display Format**: [How data is shown] (e.g., "DD/MM/YYYY HH:mm:ss")

**AC2 - [Category Name]**:
- **Database**: Retrieved from `[table_name]` table
  - Column: `[column_name]` ([data_type]) - [description] - Example: `[value]`
- **UI Component**: [Component type]
- **Validation Rules**:
  - [Rule]
- **Display Format**: [Format]

**AC3 - [Category Name]**:
[Same structure as AC1]

**AC4 - [Category Name]**:
[Same structure as AC1]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- What happens when [boundary condition]?
- How does system handle [error scenario]?

---

## Database Schema Integration *(include if feature involves data)*

### Tables Referenced

**Table: `[table_name]`**
- **Purpose**: [What this table stores]
- **Columns Used**:
  | Column | Type | Constraint | Description | Example |
  |--------|------|------------|-------------|---------||
  | `column_name` | varchar(255) | NOT NULL | [Description] | `value` |
  | `column_name` | integer | DEFAULT 0 | [Description] | `123` |
  | `column_name` | timestamp | | [Description] | `2026-02-02 10:30:00` |
- **Indexes**: [List relevant indexes for performance]
  - Index on `column_name` for faster queries
- **RLS Policies**: [Row-level security rules if applicable]
  - Users can only view records where `user_id = auth.uid()`

**Table: `[table_name_2]`**
- **Purpose**: [What this table stores]
- **Columns Used**:
  | Column | Type | Constraint | Description | Example |
  |--------|------|------------|-------------|---------||
  | `column_name` | uuid | PRIMARY KEY | [Description] | `550e8400-...` |

### Relationships
- `[table_1].[column]` → `[table_2].[column]` (Foreign Key)
- [Describe relationship logic and business rules]

### Migrations Required
- [List any new migrations needed, or reference existing ones]
- Migration: `[migration_filename].sql` - [Purpose]

---

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST [specific capability, e.g., "allow users to create accounts"]
- **FR-002**: System MUST [specific capability, e.g., "validate email addresses"]  
- **FR-003**: Users MUST be able to [key interaction, e.g., "reset their password"]
- **FR-004**: System MUST [data requirement, e.g., "persist user preferences"]
- **FR-005**: System MUST [behavior, e.g., "log all security events"]

*Example of marking unclear requirements:*

- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Key Entities *(include if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: [Measurable metric, e.g., "Users can complete account creation in under 2 minutes"]
- **SC-002**: [Measurable metric, e.g., "System handles 1000 concurrent users without degradation"]
- **SC-003**: [User satisfaction metric, e.g., "90% of users successfully complete primary task on first attempt"]
- **SC-004**: [Business metric, e.g., "Reduce support tickets related to [X] by 50%"]

---

## Technical Implementation Reference *(for developers)*

<!--
  This section is for technical teams. Business users can skip this.
  Maps user stories to actual code components for implementation.
-->

### Frontend Components

**Component: `[ComponentName].tsx`**
- **Location**: `src/components/[Module]/[ComponentName].tsx`
- **Purpose**: [Brief description of what this component does]
- **Props Interface**:
  ```typescript
  interface [ComponentName]Props {
    prop1: type;  // [Description]
    prop2: type;  // [Description]
    onAction?: (data: type) => void;  // [Description]
  }
  ```
- **State Management**: [Local state / Context API / Props only]
- **Key Functions**:
  - `functionName()` - [What it does, parameters, return type]
  - `handleAction()` - [What it does]
- **Related User Stories**: [List story numbers, e.g., "User Story 1, User Story 3"]

**Component: `[AnotherComponent].tsx`**
- **Location**: `src/components/[Module]/[AnotherComponent].tsx`
- **Purpose**: [Brief description]
- [Continue same structure]

### Backend Services

**Service: `[serviceName].ts`**
- **Location**: `src/services/[serviceName].ts`
- **Purpose**: [Brief description of business logic handled]
- **Key Functions**:
  - `async functionName(params: Type): Promise<ReturnType>` - [What it does]
    - Example call: `await functionName({ param1: value })`
    - Returns: [Description of return value]
    - Throws: [Error conditions]
  - `async anotherFunction()` - [What it does]
- **Dependencies**: [External libraries or other services used]
- **Related User Stories**: [List story numbers]

### API Endpoints (Supabase Queries)

**Query: Get [Resource]**
- **Purpose**: [What data this retrieves]
- **Query**:
  ```typescript
  const { data, error } = await supabase
    .from('[table_name]')
    .select('[columns]')
    .eq('[field]', value)
    .order('[column]', { ascending: false });
  ```
- **Returns**: `[InterfaceName][]`
- **Error Handling**: [How errors are handled in the UI]
- **RLS**: [What RLS policies apply]

**Query: Create [Resource]**
- **Purpose**: [What this creates]
- **Query**:
  ```typescript
  const { data, error } = await supabase
    .from('[table_name]')
    .insert([{ field1: value1, field2: value2 }])
    .select();
  ```
- **Returns**: `[InterfaceName]`
- **Validation**: [Client-side validation before insert]

### TypeScript Interfaces

**Interface: `[InterfaceName]`**
```typescript
interface [InterfaceName] {
  id: string;              // UUID primary key
  field1: string;          // [Description]
  field2: number | null;   // [Description]
  created_at: string;      // ISO timestamp
  // ... other fields
}
```
- **Location**: `src/types/[filename].ts`
- **Used By**: [List components/services that use this interface]
- **Maps To Database**: `[table_name]` table

### Utility Functions

**Function: `[utilityName]()`**
- **Location**: `src/utils/[filename].ts`
- **Purpose**: [What helper function does]
- **Signature**: `function [utilityName](param: Type): ReturnType`
- **Example**:
  ```typescript
  const result = [utilityName](inputValue);
  ```

### Design Patterns Used

- **Pattern**: [Pattern name, e.g., "RefreshKey Pattern"]
  - **Purpose**: [Why this pattern is used]
  - **Reference**: [Link to STYLES_GUIDE.md or other documentation]
  - **Implementation**: [Brief description of how it's applied]

### Testing Considerations

- **Unit Tests**: [Which functions need unit tests]
- **Integration Tests**: [API endpoint testing scenarios]
- **E2E Tests**: [User workflow testing scenarios]
- **Test Data**: [Any mock data or fixtures needed]
