# Artifacts Folder - Document Index

**Last Updated:** January 14, 2026

---

## 📚 Core Documentation (5 Documents)

### Active Reference Documents ⭐

1. **[PROJECT_FUNCTION_DESIGN.md](PROJECT_FUNCTION_DESIGN.md)** - Complete functional specifications
   - All modules and features documented
   - Change history with dates
   - Architecture and workflows
   - **Version: 1.6 (Updated Jan 14, 2026)**
   - **Latest: Notification System Module**

2. **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - Complete database reference
   - All table schemas with columns
   - Migration history log (32+ migrations)
   - Indexes and constraints
   - **Latest: Notification System (7 new tables)**

3. **[ROADMAP.md](ROADMAP.md)** - Feature roadmap and planning
   - In Progress features (Q1 2026)
   - Short/Medium/Long-term plans
   - Power BI integration options
   - Deferred features tracking

4. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture
   - System overview and tech stack
   - Component architecture
   - Integration points (PQMS, SCADA, Power BI)
   - Security and development workflow

5. **[STYLES_GUIDE.md](STYLES_GUIDE.md)** - UI/UX design guidelines
   - Component patterns and best practices
   - Color schemes and typography
   - **Version: 1.6 (RefreshKey Pattern added)**

---

## 📋 Supporting Documentation (3 Documents)

### Database & Security Guides

6. **[ROLE_SYSTEM_CLARIFICATION.md](ROLE_SYSTEM_CLARIFICATION.md)** ⚠️ CRITICAL
   - Database roles vs UAM TypeScript roles
   - Prevents SQL enum errors
   - Required reading for database work

7. **[ROLE_ERROR_RESOLUTION.md](Archive/ROLE_ERROR_RESOLUTION.md)**
   - Detailed role error fixes (10 fixes documented)
   - Migration troubleshooting

8. **[QUICK_FIX_SUMMARY.md](Archive/QUICK_FIX_SUMMARY.md)**
   - Quick reference card for role errors
   - Fast re-run instructions

---

## ✅ Recently Completed (January 2026)

### Notification System Migration - COMPLETED ✅
**Completion Date:** January 14, 2026  
**Duration:** 5 days (as planned)  
**Summary:** [Archive/NOTIFICATION_SYSTEM_COMPLETION_SUMMARY.md](Archive/NOTIFICATION_SYSTEM_COMPLETION_SUMMARY.md)

**Deliverables:**
- ✅ 7 new database tables (channels, templates, groups, rules, logs, config)
- ✅ Backend service (notificationService.ts, 800+ lines)
- ✅ 14 UI components (Template/Channel/Group/Rule/Logs management)
- ✅ Multi-channel support (Email, SMS, Microsoft Teams)
- ✅ Template engine with variable substitution
- ✅ Complex rule builder with multi-condition logic
- ✅ Approval workflow (Draft → Approved)
- ✅ RefreshKey pattern implementation
- ✅ Comprehensive logging system

**Archived Documents:**
- [Archive/NOTIFICATION_SYSTEM_MIGRATION_PLAN.md](Archive/NOTIFICATION_SYSTEM_MIGRATION_PLAN.md) - Original 51-page plan
- [Archive/DAY2_COMPLETION_GUIDE.md](Archive/DAY2_COMPLETION_GUIDE.md) - Backend implementation
- [Archive/DAY3_COMPLETION_SUMMARY.md](Archive/DAY3_COMPLETION_SUMMARY.md) - Template UI implementation

---

## 📦 Archive Folder (27 Documents)

Complete implementation plans, guides, and historical documentation are archived to keep the main Artifacts folder clean and focused on active reference documents.

**Categories:**
- ✅ Completed feature implementations (SARFI, Report Builder, Customer Transformer, etc.)
- ✅ Migration guides and setup instructions
- ✅ Historical roadmaps and planning documents (Phase 2)
- ✅ Integration documentation (Power BI, GitHub)
- ✅ Database update summaries
- ✅ Notification System implementation (completed Jan 14, 2026)

**View Full List:** [Archive/](Archive/)

**Key Documents:**
- [NOTIFICATION_SYSTEM_MIGRATION_PLAN.md](Archive/NOTIFICATION_SYSTEM_MIGRATION_PLAN.md) - Completed Jan 14, 2026
- [NOTIFICATION_SYSTEM_COMPLETION_SUMMARY.md](Archive/NOTIFICATION_SYSTEM_COMPLETION_SUMMARY.md) - Full summary
- [ROOT_CAUSE_RESTORATION.md](Archive/ROOT_CAUSE_RESTORATION.md)
- [SARFI_ARCHITECTURE.md](Archive/SARFI_ARCHITECTURE.md)
- [REPORT_BUILDER_IMPLEMENTATION.md](Archive/REPORT_BUILDER_IMPLEMENTATION.md)
- [CUSTOMER_TRANSFORMER_MATCHING_IMPLEMENTATION.md](Archive/CUSTOMER_TRANSFORMER_MATCHING_IMPLEMENTATION.md)
- [IDR_TAB_IMPLEMENTATION.md](Archive/IDR_TAB_IMPLEMENTATION.md)
- [METER_MAP_IMPLEMENTATION.md](Archive/METER_MAP_IMPLEMENTATION.md)
- [SUBSTATION_MAP_IMPLEMENTATION.md](Archive/SUBSTATION_MAP_IMPLEMENTATION.md)
- [ASSET_MANAGEMENT_EVENT_HISTORY.md](Archive/ASSET_MANAGEMENT_EVENT_HISTORY.md)
- [POWER_BI_INTEGRATION_QA.md](Archive/POWER_BI_INTEGRATION_QA.md)
- [GITHUB_REQUIREMENTS_MANAGEMENT.md](Archive/GITHUB_REQUIREMENTS_MANAGEMENT.md)
- [PHASE_2_ROADMAP.md](Archive/PHASE_2_ROADMAP.md)
- [Dec2025/](Archive/Dec2025/) - December 2025 fixes

**Retention Policy:** Archive documents kept for 12 months, then reviewed for deletion

---

## 📊 Recent Updates

### January 14, 2026 - Notification System Completed ✅
**Milestone:** Enterprise Notification Center fully implemented and integrated

**Summary:**
- ✅ 5-day implementation plan completed on schedule
- ✅ 7 new database tables with RLS policies
- ✅ 14 UI components created (Template/Channel/Group/Rule/Logs management)
- ✅ Backend service with template engine and rule evaluation
- ✅ Multi-channel support (Email, SMS, Microsoft Teams)
- ✅ RefreshKey pattern documented in STYLES_GUIDE.md (v1.6)

**Documentation Updates:**
- Created [Archive/NOTIFICATION_SYSTEM_COMPLETION_SUMMARY.md](Archive/NOTIFICATION_SYSTEM_COMPLETION_SUMMARY.md)
- Moved migration plan to Archive (completed)
- Updated [DOCUMENTATION_RESTRUCTURING.md](DOCUMENTATION_RESTRUCTURING.md)
- Updated this README with new document counts

**See:** [Archive/NOTIFICATION_SYSTEM_COMPLETION_SUMMARY.md](Archive/NOTIFICATION_SYSTEM_COMPLETION_SUMMARY.md) for full details

### January 5, 2026 - Major Documentation Refresh
- ✅ Added **User Management Module** documentation (Section 9)
- ✅ Added **SCADA Substation Management Module** documentation (Section 10)
- ✅ Updated PROJECT_FUNCTION_DESIGN.md to v1.5
- ✅ Created [SCRIPTS_INDEX.md](../scripts/SCRIPTS_INDEX.md)
- ✅ Organized Phase 2 documents as legacy reference

---

## 📊 Documentation Statistics

- **Active Core Documents:** 5
- **Supporting Guides:** 3 (Database/Security)
- **Archived Documents:** 27
- **Total Active:** 8 documents (13 archived, 27 total)
- **Last Major Update:** January 14, 2026 (Notification System completion)

---

## 🔍 Finding Information

### Quick Reference Guide

**Need to know...?** → **Check...**
- How a feature works → [PROJECT_FUNCTION_DESIGN.md](PROJECT_FUNCTION_DESIGN.md)
- Database table structure → [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- What features are planned → [ROADMAP.md](ROADMAP.md)
- Technical architecture → [ARCHITECTURE.md](ARCHITECTURE.md)
- UI design patterns → [STYLES_GUIDE.md](STYLES_GUIDE.md)
- Database role errors → [ROLE_SYSTEM_CLARIFICATION.md](ROLE_SYSTEM_CLARIFICATION.md)
- When features were added → [PROJECT_FUNCTION_DESIGN.md](PROJECT_FUNCTION_DESIGN.md) (Change History)
- Migration history → [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) (Migration Log)
- Completed implementations → [Archive/](Archive/) folder

### By Role

**Developers:**
1. Start with [ARCHITECTURE.md](ARCHITECTURE.md)
2. Review [PROJECT_FUNCTION_DESIGN.md](PROJECT_FUNCTION_DESIGN.md)
3. Check [STYLES_GUIDE.md](STYLES_GUIDE.md) for UI patterns

**Product Managers:**
1. Review [PROJECT_FUNCTION_DESIGN.md](PROJECT_FUNCTION_DESIGN.md)
2. Check [ROADMAP.md](ROADMAP.md) for planning
3. Review feature history in Change History section

**DBAs:**
1. Start with [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
2. **CRITICAL:** Read [ROLE_SYSTEM_CLARIFICATION.md](ROLE_SYSTEM_CLARIFICATION.md)
3. Review Migration History Log

**QA Testers:**
1. Check [PROJECT_FUNCTION_DESIGN.md](PROJECT_FUNCTION_DESIGN.md) for acceptance criteria
2. Review [STYLES_GUIDE.md](STYLES_GUIDE.md) for UI behavior

---

## ✅ Documentation Maintenance

### Update Schedule
- **Per Sprint (2 weeks):** Update Change History when features completed
- **After Migration:** Update DATABASE_SCHEMA.md migration log
- **Monthly:** Update ROADMAP.md feature statuses
- **Quarterly:** Review ARCHITECTURE.md for tech stack changes
- **Annual:** Full documentation review and cleanup

### Contributing Guidelines
When adding new features:
1. Implement code + database migration
2. Update [PROJECT_FUNCTION_DESIGN.md](PROJECT_FUNCTION_DESIGN.md) (module + change history)
3. Update [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) (migration log)
4. Update [ROADMAP.md](ROADMAP.md) (move to completed)
5. Archive implementation guides after 3 months

---

## 📞 Quick Links

- **Main App:** [/src/App.tsx](../src/App.tsx)
- **Database Client:** [/src/lib/supabase.ts](../src/lib/supabase.ts)
- **Type Definitions:** [/src/types/database.ts](../src/types/database.ts)
- **Services:** [/src/services/](../src/services/)
- **Notification Components:** [/src/components/Notifications/](../src/components/Notifications/)
- **Scripts:** [/scripts/](../scripts/)

---

**Last Reviewed:** January 14, 2026  
**Next Review:** April 2026  
**Maintained By:** PQMAP Development Team

**Questions?** Contact Product Manager or Tech Lead  
**Feedback?** Create GitHub Issue with label `documentation`
**Need feature details?** → See feature-specific docs  
**Need requirements?** → REQUIREMENTS_TRACEABILITY.md  
**Looking for old docs?** → Check Archive/ folders

---

**Last Cleanup:** December 15, 2025  
**Next Review:** As needed when major features completed  
**Maintained By:** Development Team
