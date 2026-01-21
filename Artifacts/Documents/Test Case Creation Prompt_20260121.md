# 📋 Test Case Creation Prompt (PQMAP)

## 🎯 Objective
Create comprehensive, detailed manual QA test cases for all PQMAP modules based on source materials (UI prototype files in src and documentation in Artifacts). Test cases must be actionable, data-linked across scenarios, and exclude integrations.

---

## 📝 Prompt

I need you to create comprehensive test cases for all PQMAP modules. This is not for automated testing but for manual QA testing documentation.

**Requirements:**
1. Separate test cases into 4 categories: Happy Flow, Unhappy Flow, Edge Cases, Exception/Error scenarios
2. Create a structured CSV with columns:
   - Key identifier
   - Category
   - Core function
   - Sub-core name
   - Function name
   - Test cases
   - Data need to prepare
3. Group test cases by epics/modules and functions
4. Include specific test data examples and expected values
5. Use shared placeholder data across test cases (linked IDs reused for group/ungroup and follow-up actions)
6. Exclude integrations and external system connectivity tests

**Test Case Detail Requirements:**
- Write detailed step-by-step actions using numbered sequences
- Include specific UI element identification (buttons, dropdowns, input fields, tabs)
- Add intermediate verification steps between major actions
- Specify expected outcomes and confirmation messages
- Include prerequisites and test data requirements
- Cover both positive and negative scenarios for each function
- Use consistent placeholder IDs across related cases (e.g., event created in one case is used for grouping/ungrouping in another)

**Action Format Example:**
1. User clicks "Event Management" in the sidebar and navigates to Event Management page
2. Verify the list displays only voltage_dip and voltage_swell for base dataset
   - Location, event_type, severity, timestamp match the base dataset
   - Child events display under the parent in Tree View
3. User clicks "Tree View" toggle to display hierarchy
4. Verify parent-child relationships display correctly
5. User clicks Sort by Timestamp (ascending)
6. Verify list is sorted oldest to newest
7. User clicks Sort by Timestamp again
8. Verify list is sorted newest to oldest
9. User selects event ID = 557acb3d
10. Verify Event Details panel shows matching event data

**Coverage Areas:**
- All CRUD operations (Create, Read, Update, Delete)
- UI interactions (filters, search, pagination, sorting)
- Validation scenarios (required fields, format checks, duplicates)
- Permission and role-based access testing
- Error handling and recovery scenarios
- Performance edge cases (large datasets)
- Security scenarios (unauthorized access, session management)

**Priority Levels:**
- High: Core business functionality, critical user paths
- Medium: Important features, secondary workflows
- Low: Nice-to-have features, minor edge cases

**Severity Levels:**
- Critical: System crashes, data loss, security breaches
- High: Major functionality broken, significant user impact
- Medium: Feature limitations, workarounds available
- Low: Minor issues, cosmetic problems

**Test Data Requirements:**
Create a shared base dataset and reference it across cases:
- Valid values for all data fields
- Invalid values that should trigger validation
- Edge cases (boundary values, special characters)
- System limit scenarios
- Error condition data

**Sources to Analyze:**
1. UI prototype files in src/
2. Project documentation in Artifacts/

**Deliverables:**
1. All_Modules_Test_Cases_YYYYMMDD.csv - Comprehensive test cases

Focus on creating actionable, detailed test cases that a QA engineer can execute without ambiguity.

---

## ✅ Success Criteria
- Each test case has clear, numbered steps
- Placeholder data is consistent and reused across related cases
- Expected outcomes are explicit
- Error scenarios and edge cases are covered
- UI interactions are specific
- Integration tests are excluded
