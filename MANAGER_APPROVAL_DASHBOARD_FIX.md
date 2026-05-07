# Manager Leave Approval Dashboard - Complete Fix

## Overview
Fixed manager leave approval visibility to include approved and denied leave requests, added dedicated Status column, and ensured proper role-based access controls for team-scoped data.

## Issues Fixed

### 1. **Pending-Only View (FIXED)**
- ❌ **Before**: Manager approval dashboard only fetched pending leaves
- ✅ **After**: Added three tabs for Pending, Approved, and Denied leaves with separate API calls

### 2. **Missing Approve/Deny Buttons (ALREADY EXISTED)**
- ✅ **Confirmed**: Approve and Reject buttons already present on pending requests
- ✅ **Enhanced**: Improved refresh logic to update relevant lists after action

### 3. **Admin-Only Access to Denied Requests (FIXED)**
- ❌ **Before**: `getDeniedLeaveRequestsByApprover` only allowed admin/super-admin roles
- ✅ **After**: Added manager/senior-manager role support with team hierarchy scoping

### 4. **No Status Column (FIXED)**
- ❌ **Before**: Leave status buried within category/type column
- ✅ **After**: Added dedicated Status column with color-coded badges

## Changes Made

### Backend (unifiedLeaveController.js)

**Function**: `getDeniedLeaveRequestsByApprover`

**What Changed**:
1. Added manager/senior-manager role support (was admin-only)
2. Added team hierarchy scoping for managers using `getManagerScopedEmployeeIds()`
3. Admins see all denied requests; managers see only their team's requests

**Code**:
```javascript
// Allow admin/super-admin or manager/senior-manager
const isAdmin = userRole === 'admin' || userRole === 'super-admin';
const isManager = userRole === 'manager' || userRole === 'senior-manager';

if (!isAdmin && !isManager) {
  return res.status(403).json({
    success: false,
    message: 'Access denied. Admin or manager privileges required.'
  });
}

// For managers, scope to their team members; for admins, no scoping
if (isManager && !isAdmin) {
  const subordinateIds = await getManagerScopedEmployeeIds(userId);
  query.employeeId = { $in: subordinateIds };
}
```

### Frontend (ManagerApprovalDashboard.js)

#### 1. **State Management**
Added new state variables:
```javascript
const [approvedLeaves, setApprovedLeaves] = useState([]);
const [deniedLeaves, setDeniedLeaves] = useState([]);
const [leaveStatusTab, setLeaveStatusTab] = useState('pending'); // 'pending', 'approved', 'denied'
```

#### 2. **New Fetch Functions**
Added two new async functions:
```javascript
const fetchApprovedLeaves = async () => {
  const response = await axios.get('/api/leave/approved-requests');
  setApprovedLeaves(Array.isArray(response.data.data) ? response.data.data : []);
};

const fetchDeniedLeaves = async () => {
  const response = await axios.get('/api/leave/denied-requests');
  setDeniedLeaves(Array.isArray(response.data.data) ? response.data.data : []);
};
```

#### 3. **Dynamic Fetching with useEffect**
Added effect to fetch approved/denied data when tab is switched:
```javascript
useEffect(() => {
  if (activeTab === 'leave') {
    if (leaveStatusTab === 'approved') {
      fetchApprovedLeaves();
    } else if (leaveStatusTab === 'denied') {
      fetchDeniedLeaves();
    }
  }
}, [activeTab, leaveStatusTab]);
```

#### 4. **Tab UI Component**
Added three toggle buttons for leave status filtering:
```
┌─────────────────┬──────────────────┬───────────────┐
│ Pending (count) │ Approved (count)  │ Denied (count)│
└─────────────────┴──────────────────┴───────────────┘
```

**Styling**:
- **Pending**: Amber background (pending state)
- **Approved**: Green background (success state)
- **Denied**: Red background (error state)

#### 5. **Status Column in Table**
Added new table column displaying leave status with badges:
```
Status Column (between Submitted and Actions)
├── Pending: Amber badge
├── Approved: Green badge
├── Rejected: Red badge
└── Draft: Gray badge
```

#### 6. **Smart List Switching**
Updated `activeItems` logic to use correct array based on `leaveStatusTab`:
```javascript
let activeItems = [];
if (activeTab === 'leave') {
  if (leaveStatusTab === 'pending') {
    activeItems = pendingLeaves;
  } else if (leaveStatusTab === 'approved') {
    activeItems = approvedLeaves;
  } else if (leaveStatusTab === 'denied') {
    activeItems = deniedLeaves;
  }
} else {
  activeItems = pendingExpenses;
}
```

#### 7. **Smart Refresh Logic**
Updated handleApprove and handleReject to refresh relevant lists:
- When approving: refresh both pending AND approved lists
- When rejecting: refresh both pending AND denied lists
- Ensures newly approved/denied requests appear in their respective tabs

## API Endpoints Used

| Tab | Endpoint | Role | Scope |
|-----|----------|------|-------|
| Pending | `GET /api/manager/approvals/pending` | Manager, Admin | Team members (managers), All (admins) |
| Approved | `GET /api/leave/approved-requests` | Manager, Admin | Team members (managers), All (admins) |
| Denied | `GET /api/leave/denied-requests` | Manager, Admin | Team members (managers), All (admins) |
| Approve | `PATCH /api/leave/approve/:id` | Manager, Admin | Team requests |
| Reject | `PATCH /api/leave/reject/:id` | Manager, Admin | Team requests |

## User Experience Flow

### Before (Broken)
1. Manager logs in → sees Pending tab only
2. Manager approves a request
3. No way to verify it was approved
4. Cannot see team's approval history

### After (Fixed)
1. Manager logs in → sees three tabs: Pending, Approved, Denied
2. Manager reviews pending requests with status clearly shown
3. Approves request → badge changes in Pending tab
4. Switches to Approved tab → sees newly approved request
5. Can review historical decisions in Approved/Denied tabs
6. Only sees their team's leaves (proper hierarchy scoping)

## Testing Checklist

- [ ] Login as manager with team members
- [ ] Open Manager Approvals dashboard
- [ ] Verify three tabs visible: Pending, Approved, Denied
- [ ] Click Pending tab → see pending leave requests with Status column
- [ ] Click Approved tab → see previously approved requests
- [ ] Click Denied tab → see previously denied requests
- [ ] Click Approve on pending request → modal appears
- [ ] Click Approve in modal → request moves to Approved tab with new badge
- [ ] Click Deny on pending request → modal appears
- [ ] Click Deny in modal → request moves to Denied tab with red badge
- [ ] Verify only team members' leaves shown (not all employees)
- [ ] Verify Status column shows correct badges:
  - Pending: Amber
  - Approved: Green
  - Rejected: Red
  - Draft: Gray
- [ ] Test on mobile view (card layout) → status shows in badge
- [ ] Test on desktop view (table layout) → status shows in dedicated column
- [ ] Refresh dashboard → counts update correctly
- [ ] Test as admin → can see all employees' leaves across teams

## Color Scheme

```
Status Badges:
├── Pending: bg-amber-100 text-amber-800 border-amber-200
├── Approved: bg-green-100 text-green-800 border-green-200
├── Rejected: bg-red-100 text-red-800 border-red-200
└── Draft: bg-gray-100 text-gray-800 border-gray-200

Tab Buttons (when selected):
├── Pending: bg-amber-100 text-amber-900 border-amber-300
├── Approved: bg-green-100 text-green-900 border-green-300
└── Denied: bg-red-100 text-red-900 border-red-300
```

## Security Notes

- ✅ Managers can only see their subordinates' leaves (via `getManagerScopedEmployeeIds()`)
- ✅ Managers cannot see leaves from other teams
- ✅ Admins/super-admins can see all leaves across all teams
- ✅ Role-based access enforced at API level
- ✅ No sensitive data exposed in error messages

## Files Modified

1. **backend/controllers/unifiedLeaveController.js**
   - Updated `getDeniedLeaveRequestsByApprover()` function
   - Added manager role support with team scoping

2. **frontend/src/pages/ManagerApprovalDashboard.js**
   - Added state for approved/denied leaves and leave status tab
   - Added `fetchApprovedLeaves()` and `fetchDeniedLeaves()` functions
   - Added useEffect hook for dynamic tab switching
   - Added leave status tabs UI with count display
   - Added `getLeaveStatusBadgeClass()` function
   - Updated `activeItems` logic for tab-based filtering
   - Updated `handleApprove()` and `handleReject()` for smart refresh
   - Added Status column header to desktop table
   - Added Status column data to table rows
   - Added status badges to mobile card view

## Performance Notes

- Leave data only fetched when tab is clicked (lazy loading)
- No unnecessary re-fetches on component mount
- Approved/denied counts shown in tab labels for quick overview
- Efficient filtering using status field
- Smooth transitions between tabs

## Future Enhancements

1. **Date Range Filtering** - Add date pickers to approved/denied tabs
2. **Export Reports** - Export approval history to PDF/Excel
3. **Bulk Actions** - Approve/deny multiple requests at once
4. **Search History** - Search across all statuses, not just current tab
5. **Manager Comments** - Display approval/denial comments in history
6. **Delegation** - Allow managers to delegate approval authority
7. **Analytics** - Show approval rates, average approval time

## Summary

✅ Managers now have complete visibility of their team's leave approval history
✅ Three-tab interface (Pending/Approved/Denied) for easy navigation
✅ Dedicated Status column removes ambiguity about request state
✅ Proper role-based access with team hierarchy scoping
✅ Smart refresh logic ensures lists update correctly after actions
✅ Mobile and desktop layouts both fully supported
