# Manager Role Integration - Architecture & Implementation Plan

## Executive Summary
This document outlines a comprehensive plan to fully integrate Manager-level permissions into the HRMS system following a three-tier role hierarchy: **Admin** (full control) → **Manager** (team-level control) → **Employee** (self-access only).

**Current State:** Manager role exists in schema but lacks proper enforcement and frontend integration.
**Target State:** Complete role-based access control with manager-team hierarchy fully operational.

---

## 1. CURRENT SYSTEM ANALYSIS

### 1.1 Existing Infrastructure

#### Database Schema Status
- ✅ **EmployeesHub Model:**
  - `role`: enum ['employee', 'manager', 'senior-manager', 'hr', 'admin', 'super-admin']
  - `managerId`: ObjectId reference to manager's EmployeeHub record
  - Reporting hierarchy structure already exists

- ✅ **LeaveRequest Model:**
  - Has `approverRole` field (admin, super-admin, hr, manager)
  - Has `approverId` tracking
  - Supports manager approvals

- ✅ **User Model:**
  - `role`: enum ['profile', 'user', 'super-admin', 'admin']
  - **Gap:** No 'manager' role at User level (only in EmployeesHub)

#### Backend Utilities
- ✅ **hierarchyHelper.js:**
  - `canApproveLeave()` - Currently only checks admin/super-admin
  - `canApproveExpense()` - Currently only checks admin/super-admin
  - `isInHierarchy()` - Exists but not fully utilized in approval flows
  - `getSubordinates()` - Works with direct and indirect reports
  - `getPendingApprovalsForManager()` - Started but incomplete

- **Gap:** Manager-specific permission checks are missing or incomplete in controllers

#### Frontend Status
- ✅ Basic role checking exists (user?.role === 'admin')
- **Gap:** No manager-specific UI components or conditional rendering
- **Gap:** Manager dashboards don't exist
- **Gap:** No team-level data filtering

### 1.2 Existing Gaps

| Area | Current State | Required |
|------|---------------|----------|
| **DB Schema** | Manager role defined | Manager role fully operational |
| **Auth** | Only admin approvals | Manager + Admin approvals |
| **Hierarchy** | Helper functions exist | Enforced in all controllers |
| **Frontend** | Admin/Employee only | Admin/Manager/Employee views |
| **Approval Flows** | Admin only | Manager + Admin |
| **Team Access** | Not enforced | Strictly enforced |
| **Dashboard** | Employee-centric | Role-based dashboards |

---

## 2. MANAGER & EMPLOYEE CREATION WORKFLOWS

### 2.1 Overview

The system supports 5 creation scenarios:

1. **Admin creates new Manager** (standalone, no team initially)
2. **Admin creates new Employee** (assigned to existing Manager)
3. **Admin promotes existing Employee to Manager** (converts role, keeps employees)
4. **Admin demotes Manager to Employee** (reassign team members first)
5. **Manager creates Employee under their team** (limited, manager-created employees only)

### 2.2 Scenario 1: Admin Creates New Manager (Standalone)

**Flow Diagram:**
```
Admin Portal 
  ↓
Add Employee Form (with role selection)
  ↓
Select Role = "Manager"
  ↓
Validate Manager Requirements
  ↓
Create in EmployeesHub (role: 'manager', managerId: null)
  ↓
Optional: Create login credentials (User record)
  ↓
Send Manager onboarding email
```

**Backend Process - `employeeHubController.createEmployee()`:**

```javascript
exports.createEmployee = async (req, res) => {
  const { firstName, lastName, email, role, managerId, ...otherFields } = req.body;
  
  // ====== NEW: Manager Role Validation ======
  if (role === 'manager' || role === 'senior-manager') {
    // New managers must NOT have a manager themselves
    if (managerId) {
      return res.status(400).json({
        success: false,
        message: `${role} cannot report to another manager. Only employees can have managers.`
      });
    }
    
    // Optional: Check if email is unique across Users and EmployeesHub
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists in system'
      });
    }
  }
  
  // Create employee record
  const employee = new EmployeeHub({
    firstName,
    lastName,
    email,
    role: role || 'employee',
    managerId: role === 'manager' ? null : managerId,
    jobTitle: req.body.jobTitle,
    department: req.body.department,
    startDate: req.body.startDate,
    employmentType: req.body.employmentType,
    ...otherFields
  });
  
  await employee.save();
  
  // ====== NEW: If manager role, send manager onboarding email ======
  if (role === 'manager' || role === 'senior-manager') {
    await sendManagerOnboardingEmail(employee);
  }
  
  res.status(201).json({
    success: true,
    message: `${role === 'manager' ? 'Manager' : 'Employee'} created successfully`,
    data: employee
  });
};
```

**Frontend Process - `AddEmployee.js`:**

```javascript
const [role, setRole] = useState('employee');
const [managerId, setManagerId] = useState('');
const [managers, setManagers] = useState([]);

useEffect(() => {
  if (role === 'manager' || role === 'senior-manager') {
    // Disable manager selection for new managers
    setManagerId('');
  } else {
    // Load available managers for regular employees
    fetchAvailableManagers();
  }
}, [role]);

const fetchAvailableManagers = async () => {
  const res = await axios.get('/api/employees?role=manager');
  setManagers(res.data.data);
};

return (
  <>
    <Select value={role} onValueChange={setRole}>
      <SelectItem value="employee">Employee</SelectItem>
      <SelectItem value="manager">Manager</SelectItem>
      <SelectItem value="senior-manager">Senior Manager</SelectItem>
    </Select>
    
    {(role === 'employee') && (
      <Select value={managerId} onValueChange={setManagerId}>
        <SelectItem value="">-- Select Manager --</SelectItem>
        {managers.map(m => (
          <SelectItem key={m._id} value={m._id}>
            {m.firstName} {m.lastName} ({m.department})
          </SelectItem>
        ))}
      </Select>
    )}
    
    {(role === 'manager' || role === 'senior-manager') && (
      <div className="p-3 bg-blue-50 rounded">
        <p className="text-sm text-blue-700">
          ℹ️ New {role}s will have no direct manager. They can be assigned employees.
        </p>
      </div>
    )}
  </>
);
```

**Data State After Creation:**

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  firstName: "John",
  lastName: "Smith",
  email: "john.smith@company.com",
  role: "manager",           // ← Set to 'manager'
  managerId: null,           // ← Explicitly null (no manager)
  department: "Engineering",
  jobTitle: "Engineering Manager",
  status: "Active",
  isActive: true,
  // No userId yet - can be created later
}
```

---

### 2.3 Scenario 2: Admin Creates New Employee (Under Existing Manager)

**Flow Diagram:**
```
Admin Portal
  ↓
Add Employee Form
  ↓
Select Role = "Employee"
  ↓
Select Manager (required)
  ↓
Create in EmployeesHub (role: 'employee', managerId: managerId)
  ↓
Optional: Create login credentials
  ↓
Send Employee + Manager notification emails
  ↓
Manager can now approve their leave/expenses
```

**Backend Process:**

```javascript
// In createEmployee()
if (role === 'employee' && !managerId) {
  return res.status(400).json({
    success: false,
    message: 'Employees must be assigned to a manager'
  });
}

// Verify manager exists and is actually a manager
const manager = await EmployeeHub.findById(managerId);
if (!manager || !['manager', 'senior-manager', 'hr'].includes(manager.role)) {
  return res.status(400).json({
    success: false,
    message: 'Selected person is not a valid manager'
  });
}

// Verify manager is not already assigned to someone else's team
// (Optional: prevents circular assignments)

const employee = new EmployeeHub({
  firstName,
  lastName,
  email,
  role: 'employee',
  managerId,  // ← Link to manager
  // ... other fields
});

await employee.save();

// ====== NEW: Notify both employee and manager ======
await sendEmployeeWelcomeEmail(employee, manager);
await sendNewTeamMemberNotification(manager, employee);
```

**Frontend State:**

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439012"),
  firstName: "Jane",
  lastName: "Doe",
  email: "jane.doe@company.com",
  role: "employee",            // ← Regular employee
  managerId: ObjectId("507f1f77bcf86cd799439011"),  // ← John Smith
  jobTitle: "Software Developer",
  department: "Engineering"
}
```

---

### 2.4 Scenario 3: Admin Promotes Employee to Manager

**Flow Diagram:**
```
Admin Portal
  ↓
Select Employee
  ↓
View Current Role = "Employee"
  ↓
Click "Promote to Manager"
  ↓
[CRITICAL] Existing employees must be reassigned
  ↓
Choose what to do with their current manager:
  a) Keep same manager (stay reporting to same person)
  b) Remove manager (move to root level)
  ↓
Update Role & Remove managerId (if option b)
  ↓
Optionally reassign their employees under them
  ↓
Send promotion email
```

**Backend Process - `updateEmployee()` or new `promoteToManager()`:**

```javascript
exports.promoteToManager = async (req, res) => {
  const { employeeId } = req.params;
  const { handleCurrentDirectReports, newManagerForReports } = req.body;
  
  const employee = await EmployeeHub.findById(employeeId);
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }
  
  if (employee.role !== 'employee') {
    return res.status(400).json({
      success: false,
      message: 'Can only promote employees. This person already has a management role.'
    });
  }
  
  // ====== STEP 1: Check if promoted employee has direct reports ======
  const directReports = await EmployeeHub.find({ managerId: employeeId });
  
  if (directReports.length > 0) {
    // ====== STEP 2: Handle reassignment logic ======
    if (handleCurrentDirectReports === 'reassign') {
      // Verify new manager is valid
      const newManager = await EmployeeHub.findById(newManagerForReports);
      if (!newManager || !['manager', 'senior-manager'].includes(newManager.role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid new manager selected'
        });
      }
      
      // Reassign all direct reports to new manager
      await EmployeeHub.updateMany(
        { managerId: employeeId },
        { $set: { managerId: newManagerForReports } }
      );
    } else if (handleCurrentDirectReports === 'remove') {
      // Remove manager assignment (move to root)
      await EmployeeHub.updateMany(
        { managerId: employeeId },
        { $set: { managerId: null } }
      );
    }
    // Else: 'inherit' - do nothing, reports stay (optional)
  }
  
  // ====== STEP 3: Update promoted employee ======
  employee.role = 'manager';
  // Option A: Keep their manager
  // managerId stays the same
  
  // Option B: Make them root level manager
  // employee.managerId = null;
  
  await employee.save();
  
  // ====== STEP 4: Send notification ======
  await sendPromotionEmail(employee);
  if (directReports.length > 0) {
    for (const report of directReports) {
      await notifyEmployeeManagerChanged(report);
    }
  }
  
  res.json({
    success: true,
    message: `${employee.firstName} promoted to Manager`,
    data: employee,
    affectedEmployees: directReports.length
  });
};
```

**Frontend Promotion Flow - `EmployeeProfile.js`:**

```javascript
const [showPromoteModal, setShowPromoteModal] = useState(false);
const [promoteAction, setPromoteAction] = useState('remove'); // 'remove' | 'reassign'
const [newManagerId, setNewManagerId] = useState('');

const handlePromoteClick = () => {
  setShowPromoteModal(true);
};

const handleConfirmPromotion = async () => {
  if (promoteAction === 'reassign' && !newManagerId) {
    alert('Please select a manager to reassign current reports');
    return;
  }
  
  try {
    const res = await axios.patch(`/api/employees/${employeeId}/promote-to-manager`, {
      handleCurrentDirectReports: promoteAction,
      newManagerForReports: newManagerId
    });
    
    toast.success(`${employee.firstName} promoted to Manager!`);
    // Refresh data
  } catch (error) {
    toast.error(error.response?.data?.message || 'Promotion failed');
  }
};

if (user?.role === 'admin' && employee.role === 'employee') {
  return (
    <>
      <button onClick={handlePromoteClick} className="px-4 py-2 bg-green-600 text-white">
        Promote to Manager
      </button>
      
      {showPromoteModal && (
        <Modal>
          <h2>Promote {employee.firstName} to Manager</h2>
          <p className="text-amber-700">
            ⚠️ Warning: This user has {directReports.length} direct report(s).
          </p>
          
          <div className="space-y-4">
            <div>
              <label>What should we do with their current reports?</label>
              <RadioGroup value={promoteAction} onValueChange={setPromoteAction}>
                <div>
                  <RadioGroupItem value="remove" id="remove" />
                  <label htmlFor="remove">
                    Remove manager assignment (reports become unassigned)
                  </label>
                </div>
                <div>
                  <RadioGroupItem value="reassign" id="reassign" />
                  <label htmlFor="reassign">
                    Reassign to another manager
                  </label>
                </div>
              </RadioGroup>
            </div>
            
            {promoteAction === 'reassign' && (
              <Select value={newManagerId} onValueChange={setNewManagerId}>
                <SelectItem value="">-- Select Manager --</SelectItem>
                {availableManagers.map(m => (
                  <SelectItem key={m._id} value={m._id}>
                    {m.firstName} {m.lastName}
                  </SelectItem>
                ))}
              </Select>
            )}
          </div>
          
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowPromoteModal(false)}>Cancel</button>
            <button onClick={handleConfirmPromotion} className="bg-green-600 text-white">
              Proceed with Promotion
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
```

**Data State Changes:**

```javascript
// BEFORE Promotion
{
  _id: ObjectId("507f1f77bcf86cd799439013"),
  firstName: "Alice",
  role: "employee",
  managerId: ObjectId("507f1f77bcf86cd799439011")  // Reports to John
}

// AFTER Promotion (Option 1: Keep manager)
{
  _id: ObjectId("507f1f77bcf86cd799439013"),
  firstName: "Alice",
  role: "manager",           // ← Changed
  managerId: ObjectId("507f1f77bcf86cd799439011")  // ← Still reports to John
}

// AFTER Promotion (Option 2: Remove manager)
{
  _id: ObjectId("507f1f77bcf86cd799439013"),
  firstName: "Alice",
  role: "manager",
  managerId: null            // ← Now root level manager
}

// Her former reports (if reassigned)
// BEFORE:
{
  _id: ObjectId("507f1f77bcf86cd799439014"),
  firstName: "Bob",
  managerId: ObjectId("507f1f77bcf86cd799439013")  // Reported to Alice
}

// AFTER:
{
  _id: ObjectId("507f1f77bcf86cd799439014"),
  firstName: "Bob",
  managerId: ObjectId("507f1f77bcf86cd799439015")  // Reassigned to Sarah
}
```

---

### 2.5 Scenario 4: Admin Demotes Manager to Employee

**Flow Diagram:**
```
Admin Portal
  ↓
Select Manager
  ↓
View Team Size (e.g., 5 direct reports)
  ↓
[CRITICAL] Must reassign all team members first
  ↓
Choose new manager for each team member
  OR
Move all to root level (unassigned)
  ↓
Downgrade Role = "Employee"
  ↓
Assign new manager for the demoted person
  ↓
Send demotion email
```

**Backend Process:**

```javascript
exports.demoteManagerToEmployee = async (req, res) => {
  const { managerId } = req.params;
  const { newManagersMap, moveToRoot } = req.body; // newManagersMap: { oldEmployeeId: newManagerId }
  
  const manager = await EmployeeHub.findById(managerId);
  if (!manager || !['manager', 'senior-manager'].includes(manager.role)) {
    return res.status(400).json({
      success: false,
      message: 'This employee is not a manager'
    });
  }
  
  // ====== STEP 1: Get all direct reports ======
  const directReports = await EmployeeHub.find({ managerId });
  
  if (directReports.length > 0 && !moveToRoot && !newManagersMap) {
    return res.status(400).json({
      success: false,
      message: `Cannot demote manager with ${directReports.length} team members. Reassign them first.`
    });
  }
  
  // ====== STEP 2: Reassign all reports ======
  if (moveToRoot) {
    await EmployeeHub.updateMany(
      { managerId },
      { $set: { managerId: null } }
    );
  } else if (newManagersMap) {
    for (const [employeeId, newMgrId] of Object.entries(newManagersMap)) {
      await EmployeeHub.updateOne(
        { _id: employeeId },
        { $set: { managerId: newMgrId } }
      );
    }
  }
  
  // ====== STEP 3: Downgrade role & assign new manager ======
  manager.role = 'employee';
  manager.managerId = req.body.newManagerIdForDemotedPerson || null;
  await manager.save();
  
  res.json({
    success: true,
    message: `${manager.firstName} demoted to Employee`,
    data: manager
  });
};
```

---

### 2.6 Scenario 5: Manager Creates Employee Under Their Team

**Constraints:**
- Manager can ONLY create employees who report to them
- Cannot create other managers
- Cannot assign employees outside their team

**Backend Process - `employeeHubController.createEmployee()` with manager check:**

```javascript
exports.createEmployee = async (req, res) => {
  const actorId = req.user.id || req.user._id;
  const actor = await EmployeeHub.findById(actorId);
  
  // ====== NEW: Manager-specific restrictions ======
  if (actor.role === 'manager' || actor.role === 'senior-manager') {
    // Manager cannot create other managers
    if (req.body.role === 'manager' || req.body.role === 'senior-manager') {
      return res.status(403).json({
        success: false,
        message: 'Managers can only create regular employees under their team'
      });
    }
    
    // Manager-created employees must report to the manager
    // (not explicitly set in request, auto-set)
    req.body.managerId = actorId;
  }
  
  // Continue with normal employee creation...
};
```

**Frontend - Manager's Add Employee Page:**

```javascript
// If logged-in user is a manager, restrict options
const canCreateManager = isAdmin(user?.role);
const createdEmployeeManagerId = isManager(user?.role) ? user._id : selectedManagerId;

return (
  <>
    {canCreateManager && (
      <Select value={role} onValueChange={setRole}>
        <SelectItem value="employee">Employee</SelectItem>
        <SelectItem value="manager">Manager</SelectItem>
      </Select>
    )}
    
    {isManager(user?.role) && (
      <div className="p-3 bg-blue-50 rounded">
        <p className="text-sm text-blue-700">
          ℹ️ New employees will be added to your team.
        </p>
      </div>
    )}
  </>
);
```

---

### 2.7 Creation Workflow Summary Table

| Scenario | Actor | Role Select | Manager Select | Requirements | Result |
|----------|-------|-------------|----------------|--------------|--------|
| **1. New Manager** | Admin | manager ✓ | Disabled | None | `role='manager'`, `managerId=null` |
| **2. New Employee** | Admin | employee ✓ | Required ✓ | Manager must exist | `role='employee'`, `managerId=<selected>` |
| **3. Promote Employee** | Admin | N/A | Reassign team | Must handle current reports | `role='manager'`, `managerId=<kept or removed>` |
| **4. Demote Manager** | Admin | N/A | Reassign team | Cannot skip reassignment | `role='employee'`, `managerId=<new>` |
| **5. Manager Creates** | Manager | employee only | Auto-set | Must be manager role | `role='employee'`, `managerId=<self>` |

---

### 2.8 Validation Rules During Creation

**For All Employees:**
```javascript
// Universal validations
if (!firstName || !lastName) throw 'Name required';
if (!email) throw 'Email required';
if (email already exists) throw 'Email must be unique';
if (!jobTitle) throw 'Job title required';
if (!department) throw 'Department required';
if (!startDate) throw 'Start date required';
if (startDate > today) throw 'Cannot set future start date';
```

**Manager-Specific:**
```javascript
if (role === 'manager' || role === 'senior-manager') {
  if (managerId) throw 'Managers cannot have managers';
  if (!department) throw 'Manager must belong to department';
  // Optional: if (teamSize > 0 && !teamNameProvided) throw 'Provide team name';
}
```

**Employee-Specific:**
```javascript
if (role === 'employee') {
  if (!managerId && actor.role !== 'manager') {
    throw 'Employee must be assigned to manager';
  }
  if (managerId) {
    const manager = await findById(managerId);
    if (!isManagerRole(manager.role)) {
      throw 'Selected person is not a manager';
    }
  }
}
```

**Account Creation (Optional):**
```javascript
// If creating login credentials too
if (createLoginCredentials) {
  const temporaryPassword = generateSecurePassword();
  const user = new User({
    firstName,
    lastName,
    email,
    password: bcrypt(temporaryPassword),
    role: role === 'manager' ? 'manager' : 'user',
    isAdminApproved: true
  });
  
  await user.save();
  employee.userId = user._id;
  await employee.save();
  
  // Send credentials email with temporary password
  await sendCredentialsEmail(email, temporaryPassword);
}
```

---

### 2.9 API Endpoints for Creation

```javascript
// NEW Manager/Employee Creation Endpoints

POST /api/employees
  Body: {
    firstName, lastName, email, role, managerId, jobTitle, department, 
    startDate, employmentType, createLoginCredentials
  }
  Returns: Created employee document

PATCH /api/employees/:id/promote-to-manager
  Body: {
    handleCurrentDirectReports: 'reassign' | 'remove',
    newManagerForReports: managerId (if reassign),
    newManagerIdForDemotedPerson: managerId
  }
  Returns: Updated employee document

PATCH /api/employees/:id/demote-to-employee
  Body: {
    newManagersMap: { employeeId: newManagerId },
    moveToRoot: boolean,
    newManagerIdForDemotedPerson: managerId
  }
  Returns: Updated employee document

GET /api/managers
  Query: { department, isActive, includeIndirect }
  Returns: Array of manager records (for dropdown selections)

GET /api/manager-options
  Returns: Simplified list of managers for UI dropdowns
```

---

## 3. DATABASE LAYER CHANGES

### 2.1 EmployeesHub Model (Already Correct - Verify)

**Current state is good. Verify/maintain:**

```javascript
// Already correct
role: {
  type: String,
  enum: ['employee', 'manager', 'senior-manager', 'hr', 'admin', 'super-admin'],
  default: 'employee',
  required: true,
  index: true
},

managerId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'EmployeeHub',
  default: null
}
```

**Action Item:** Add optional fields for manager-specific settings (future enhancement):
```javascript
// Future: Manager settings
managerSettings: {
  canApproveLeave: { type: Boolean, default: true },
  canApproveExpenses: { type: Boolean, default: true },
  maxApprovalAmount: { type: Number, default: null }, // null = unlimited
  canTerminateEmployees: { type: Boolean, default: false },
  canEditTeamSalary: { type: Boolean, default: false }
}
```

### 2.2 User Model (Add Manager Role)

**Current:** `role: ['profile', 'user', 'super-admin', 'admin']`

**Change to:** `role: ['profile', 'user', 'manager', 'admin', 'super-admin']`

```javascript
role: { 
  type: String, 
  enum: ['profile', 'user', 'manager', 'admin', 'super-admin'], 
  default: 'user',
  required: true,
  index: true
}
```

### 2.3 LeaveRequest Model (Already Good - Enhance)

**Current:** Has `approverRole: ['admin', 'super-admin', 'hr', 'manager']` ✅

**Enhancements:** Add manager identity tracking (optional):
```javascript
approverManagerId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'EmployeeHub'  // Track which manager approved
}
```

### 2.4 Expense Model (New Fields - Optional)

```javascript
// Add to track which manager approved
approverManagerId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'EmployeeHub'
}
```

### 2.5 Indexes to Add

```javascript
// EmployeesHub - Fast manager lookups
EmployeesHub.index({ managerId: 1, role: 1 })
EmployeesHub.index({ role: 1, isActive: 1 })

// LeaveRequest - Manager-specific approvals
LeaveRequest.index({ approverId: 1, status: 1, role: 1 })

// Expense - Manager-specific approvals
Expense.index({ approverId: 1, status: 1 })
```

---

## 3. BACKEND LAYER CHANGES

### 3.1 Update hierarchyHelper.js

**Current Issues:**
- `canApproveLeave()` only checks admin/super-admin
- `canApproveExpense()` only checks admin/super-admin
- Manager checks are missing

**Required Changes:**

#### 3.1.1 Enhance canApproveLeave()
```javascript
exports.canApproveLeave = async (approverId, employeeId) => {
  const approver = await EmployeeHub.findById(approverId);
  const employee = await EmployeeHub.findById(employeeId);
  
  if (!approver || !employee) return false;
  
  // Super-admin/Admin - full access
  if (['super-admin', 'admin'].includes(approver.role)) return true;
  
  // Manager - can approve direct/indirect reports
  if (approver.role === 'manager' || approver.role === 'senior-manager') {
    return await this.isInHierarchy(employee, approver);
  }
  
  // HR can approve (if role exists)
  if (approver.role === 'hr') return true;
  
  return false;
};
```

#### 3.1.2 Enhance canApproveExpense()
```javascript
exports.canApproveExpense = async (approverId, employeeId) => {
  // Same logic as canApproveLeave
};
```

#### 3.1.3 Enhance isInHierarchy() with cycle detection
```javascript
exports.isInHierarchy = async (employee, manager, visited = new Set()) => {
  if (!employee.managerId) return false;
  
  // Prevent infinite loops
  const empId = employee.managerId.toString();
  if (visited.has(empId)) return false;
  visited.add(empId);
  
  // Direct report
  if (empId === manager._id.toString()) return true;
  
  // For senior-manager and above
  if (['senior-manager', 'admin', 'super-admin'].includes(manager.role)) {
    const directManager = await EmployeeHub.findById(employee.managerId);
    if (!directManager) return false;
    return await this.isInHierarchy(directManager, manager, visited);
  }
  
  return false;
};
```

#### 3.1.4 New Helper: getTeamData()
```javascript
exports.getTeamData = async (managerId, role) => {
  const manager = await EmployeeHub.findById(managerId);
  if (!manager) return null;
  
  const includeIndirect = ['senior-manager', 'admin', 'super-admin'].includes(role);
  const teamMembers = await this.getSubordinates(managerId, includeIndirect);
  
  return {
    manager,
    teamMembers,
    teamSize: teamMembers.length,
    roles: [...new Set(teamMembers.map(m => m.role))]
  };
};
```

#### 3.1.5 New Helper: canAccessEmployee()
```javascript
exports.canAccessEmployee = async (actorId, targetEmployeeId, actor) => {
  // Admin/Super-admin can access anyone
  if (['admin', 'super-admin'].includes(actor?.role)) return true;
  
  // Self-access
  if (actorId.toString() === targetEmployeeId.toString()) return true;
  
  // Manager can access their team
  if (['manager', 'senior-manager'].includes(actor?.role)) {
    const targetEmployee = await EmployeeHub.findById(targetEmployeeId);
    return await this.isInHierarchy(targetEmployee, actor);
  }
  
  return false;
};
```

### 3.2 Update Authentication Middleware

**File:** `backend/middleware/auth.js` (or similar)

**Action Items:**
1. Add manager role validation to protected routes
2. Create separate middleware for manager-only routes
3. Store manager ID in request for hierarchy checks

```javascript
// Add to auth middleware
if (req.user) {
  req.user.isManager = ['manager', 'senior-manager', 'admin', 'super-admin']
    .includes(req.user.role);
  req.user.isAdmin = ['admin', 'super-admin'].includes(req.user.role);
  req.user.isSuperAdmin = req.user.role === 'super-admin';
}
```

### 3.3 Update Controllers

#### 3.3.1 unifiedLeaveController.js

**Changes:**

A) `getPendingLeaveRequests()` - Manager version
```javascript
exports.getPendingLeaveRequestsForManager = async (req, res) => {
  const managerId = req.user.id || req.user._id;
  const managerEmp = await EmployeeHub.findById(managerId);
  
  if (!managerEmp || !['manager', 'senior-manager'].includes(managerEmp.role)) {
    return res.status(403).json({ message: 'Manager access required' });
  }
  
  const team = await getSubordinates(managerId, true);
  const teamIds = team.map(t => t._id);
  
  const leaveRequests = await LeaveRequest.find({
    employeeId: { $in: teamIds },
    status: 'Pending'
  }).populate('employeeId', 'firstName lastName email department');
  
  res.json({ success: true, data: leaveRequests });
};
```

B) `approveLeaveRequest()` - Add manager check
```javascript
// After current role check, add:
if (!await canApproveLeave(approverEmpId, leaveRequest.employeeId)) {
  return res.status(403).json({
    success: false,
    message: 'You do not have permission to approve this leave request'
  });
}
```

C) `rejectLeaveRequest()` - Add manager check (same as approve)

#### 3.3.2 expenseController.js

**Changes:**

A) `getPendingApprovals()` - Filter by manager
```javascript
if (userRole === 'manager' || userRole === 'super-admin') {
  const managerTeam = await getSubordinates(userId, true);
  const teamIds = managerTeam.map(t => t._id);
  
  query.submittedBy = { $in: teamIds };
}
```

B) `approveExpense()` - Add manager hierarchy check
C) `declineExpense()` - Add manager hierarchy check

#### 3.3.3 employeeHubController.js

**Changes:**

A) `getAllEmployees()` - Filter by manager's team if manager role
```javascript
if (req.user.role === 'manager' || req.user.role === 'senior-manager') {
  const managerTeam = await getSubordinates(req.user.id);
  query._id = { $in: managerTeam.map(t => t._id) };
}
```

B) `getEmployeeById()` - Add access control
```javascript
const canAccess = await canAccessEmployee(req.user.id, employeeId, req.user);
if (!canAccess) {
  return res.status(403).json({ message: 'Access denied' });
}
```

C) `updateEmployee()` - Manager can update their team members
```javascript
// Verify manager can edit this employee
const isInTeam = await canAccessEmployee(req.user.id, employeeId, req.user);
if (!isInTeam && req.user.role !== 'admin') {
  return res.status(403).json({ message: 'Cannot edit employees outside your team' });
}
```

D) `getDirectReports()` - Ensure manager can only see their own
```javascript
if (req.user.role === 'manager' && managerId !== req.user.id) {
  return res.status(403).json({ message: 'Can only view your own team' });
}
```

### 3.4 Create New Manager Routes

**File:** `backend/routes/managerRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');
const { authenticateUser, requireRole } = require('../middleware/auth');

// Manager Dashboard
router.get('/dashboard', authenticateUser, requireRole(['manager', 'senior-manager']), 
  managerController.getManagerDashboard);

// Team Management
router.get('/team/members', authenticateUser, requireRole(['manager']), 
  managerController.getTeamMembers);

router.get('/team/summary', authenticateUser, requireRole(['manager']), 
  managerController.getTeamSummary);

// Approvals
router.get('/approvals/pending', authenticateUser, requireRole(['manager']), 
  managerController.getPendingApprovals);

// Reports
router.get('/reports/performance', authenticateUser, requireRole(['manager']), 
  managerController.getPerformanceReports);

router.get('/reports/attendance', authenticateUser, requireRole(['manager']), 
  managerController.getAttendanceReports);

module.exports = router;
```

### 3.5 Create New Manager Controller

**File:** `backend/controllers/managerController.js`

```javascript
const EmployeeHub = require('../models/EmployeesHub');
const LeaveRequest = require('../models/LeaveRequest');
const Expense = require('../models/Expense');
const { getSubordinates, getPendingApprovalsForManager } = require('../utils/hierarchyHelper');

exports.getManagerDashboard = async (req, res) => {
  try {
    const managerId = req.user.id || req.user._id;
    
    // Get team info
    const teamData = await getSubordinates(managerId, true);
    const pendingApprovals = await getPendingApprovalsForManager(managerId);
    
    // Get team statistics
    const teamStats = {
      totalMembers: teamData.length,
      activeMembers: teamData.filter(e => e.isActive).length,
      departmentBreakdown: groupBy(teamData, 'department'),
      roleBreakdown: groupBy(teamData, 'role')
    };
    
    res.json({
      success: true,
      data: {
        teamStats,
        pendingApprovals,
        directReports: teamData.filter(e => e.managerId?.toString() === managerId)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTeamMembers = async (req, res) => {
  try {
    const managerId = req.user.id || req.user._id;
    const teamMembers = await getSubordinates(managerId, true);
    
    res.json({ success: true, data: teamMembers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPendingApprovals = async (req, res) => {
  try {
    const managerId = req.user.id || req.user._id;
    const approvals = await getPendingApprovalsForManager(managerId);
    
    res.json({ success: true, data: approvals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ... additional methods
```

---

## 4. FRONTEND LAYER CHANGES

### 4.1 Frontend Role Detection

**Update:** All components that check `user?.role`

**Current Pattern:**
```javascript
if (user?.role === 'admin' || user?.role === 'super-admin') {
  // show admin content
}
```

**New Pattern:**
```javascript
const isAdmin = ['admin', 'super-admin'].includes(user?.role);
const isManager = ['manager', 'senior-manager'].includes(user?.role);
const canApprove = isAdmin || isManager;

if (canApprove) {
  // show approval content
}
```

### 4.2 Create Role Constants

**File:** `frontend/src/constants/roles.js`

```javascript
export const ROLES = {
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  SENIOR_MANAGER: 'senior-manager',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super-admin'
};

export const ROLE_HIERARCHY = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  SENIOR_MANAGER: 3,
  MANAGER: 2,
  EMPLOYEE: 1
};

export const hasRole = (userRole, requiredRoles) => {
  return Array.isArray(requiredRoles) 
    ? requiredRoles.includes(userRole)
    : userRole === requiredRoles;
};

export const isManager = (userRole) => 
  ['manager', 'senior-manager', 'admin', 'super-admin'].includes(userRole);

export const isAdmin = (userRole) => 
  ['admin', 'super-admin'].includes(userRole);
```

### 4.3 Create RoleGuard Component

**File:** `frontend/src/components/RoleGuard.jsx`

```javascript
import { hasRole } from '../constants/roles';

export const RoleGuard = ({ children, requiredRoles, user, fallback = null }) => {
  if (!user) return fallback;
  
  if (typeof requiredRoles === 'string') {
    requiredRoles = [requiredRoles];
  }
  
  return hasRole(user.role, requiredRoles) ? children : fallback;
};

export default RoleGuard;
```

### 4.4 Update Dashboard Routing

**File:** `frontend/src/pages/Dashboard.js` or main routing

```javascript
import { isAdmin, isManager } from '../constants/roles';

const Dashboard = ({ user }) => {
  if (!user) return <LoadingScreen />;
  
  // Route based on role
  if (isAdmin(user.role)) {
    return <AdminDashboard user={user} />;
  }
  
  if (isManager(user.role)) {
    return <ManagerDashboard user={user} />;
  }
  
  return <EmployeeDashboard user={user} />;
};
```

### 4.5 Create Manager Dashboard

**File:** `frontend/src/pages/ManagerDashboard.js`

Key Sections:
1. **Team Overview**
   - Team member list
   - Team statistics (active, by department)
   - Org chart (team only)

2. **Pending Approvals**
   - Leave requests from team
   - Expense approvals from team
   - Quick approve/reject actions

3. **Team Reports**
   - Attendance summary
   - Performance metrics
   - Absence tracking

4. **Team Management**
   - Quick access to team member profiles
   - Team calendar
   - Team documents

```javascript
import React, { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { RoleGuard, isManager } from '../constants/roles';

const ManagerDashboard = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  
  useEffect(() => {
    if (isManager(user?.role)) {
      fetchDashboard();
    }
  }, [user]);
  
  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/manager/dashboard');
      setDashboardData(res.data.data);
    } catch (error) {
      console.error('Failed to load manager dashboard:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <RoleGuard requiredRoles={['manager', 'senior-manager']} user={user}>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Manager Dashboard</h1>
        
        {/* Team Overview */}
        <TeamOverviewSection data={dashboardData?.teamStats} />
        
        {/* Pending Approvals */}
        <PendingApprovalsSection data={dashboardData?.pendingApprovals} />
        
        {/* Team Reports */}
        <TeamReportsSection managerId={user._id} />
      </div>
    </RoleGuard>
  );
};
```

### 4.6 Update Existing Components

#### 4.6.1 Leave Approval Views
**File:** `frontend/src/pages/Calendar.js`

```javascript
// Update pending requests to show manager's team only
if (user?.role === 'manager' || user?.role === 'senior-manager') {
  // Show team's pending leave requests
  setShowManagerApprovals(true);
} else if (isAdmin(user?.role)) {
  // Show all pending leave requests
  setShowAdminApprovals(true);
}
```

#### 4.6.2 Expense Approvals
**File:** `frontend/src/pages/AdminExpenses.js`

```javascript
// Add manager view tab
const tabs = isManager(user?.role) 
  ? ['my-expenses', 'team-approvals']
  : isAdmin(user?.role)
  ? ['my-expenses', 'approvals', 'all-expenses']
  : ['my-expenses'];
```

#### 4.6.3 Employee List/Directory
**File:** `frontend/src/pages/EmployeeDirectory.js`

```javascript
// Managers see only their team
if (isManager(user?.role)) {
  filters.managerId = user._id; // or team IDs
}
```

### 4.7 Navigation Updates

**File:** `frontend/src/components/Navigation.js` or `Sidebar.js`

```javascript
const getMenuItems = (userRole) => {
  const baseItems = [
    { name: 'My Profile', path: '/profile' },
    { name: 'Calendar', path: '/calendar' },
    { name: 'My Documents', path: '/documents' }
  ];
  
  if (isManager(userRole)) {
    baseItems.push(
      { name: 'Manager Dashboard', path: '/manager-dashboard' },
      { name: 'My Team', path: '/manager/team' },
      { name: 'Approvals', path: '/manager/approvals' },
      { name: 'Reports', path: '/manager/reports' }
    );
  }
  
  if (isAdmin(userRole)) {
    baseItems.push(
      { name: 'Admin Dashboard', path: '/admin-dashboard' },
      { name: 'All Employees', path: '/employees' },
      { name: 'Settings', path: '/admin/settings' }
    );
  }
  
  return baseItems;
};
```

### 4.8 Permission Hooks (Optional Enhancement)

**File:** `frontend/src/hooks/usePermissions.js`

```javascript
export const usePermissions = (user) => {
  return {
    canApproveLeave: isAdmin(user?.role) || isManager(user?.role),
    canApproveExpense: isAdmin(user?.role) || isManager(user?.role),
    canManageTeam: isManager(user?.role),
    canModifyRoles: isAdmin(user?.role),
    canAccessAllData: isAdmin(user?.role),
    isManagerOrAbove: isAdmin(user?.role) || isManager(user?.role)
  };
};
```

---

## 5. IMPLEMENTATION ROADMAP

### Phase 1: Database & Backend Foundation (Week 1)
- [ ] Update User model to include 'manager' role
- [ ] Add indexes to EmployeesHub and related models
- [ ] Update hierarchyHelper.js with manager checks
- [ ] Add manager-specific methods to hierarchyHelper
- [ ] Create authentication middleware updates
- [ ] Create/update controllers with manager permissions

**Deliverable:** Backend APIs with manager role support

### Phase 2: Manager APIs & Controllers (Week 1-2)
- [ ] Create managerController.js
- [ ] Create managerRoutes.js
- [ ] Update unifiedLeaveController for manager approvals
- [ ] Update expenseController for manager approvals
- [ ] Update employeeHubController with access control
- [ ] Add comprehensive logging/audit trail

**Deliverable:** Manager-specific endpoints working

### Phase 3: Frontend Foundations (Week 2)
- [ ] Create roles.js constants file
- [ ] Create RoleGuard component
- [ ] Update role detection throughout app
- [ ] Create usePermissions hook
- [ ] Update navigation/sidebar

**Deliverable:** Frontend infrastructure ready

### Phase 4: Manager Dashboard (Week 2-3)
- [ ] Create ManagerDashboard.jsx
- [ ] Build team overview section
- [ ] Build pending approvals section
- [ ] Build team reports section
- [ ] Add team member quick access

**Deliverable:** Functional manager dashboard

### Phase 5: Update Approval Flows (Week 3)
- [ ] Update leave approval UI for managers
- [ ] Update expense approval UI for managers
- [ ] Add manager-specific filters
- [ ] Update Calendar.js for manager view
- [ ] Update AdminExpenses.js for manager view

**Deliverable:** Managers can approve their team's requests

### Phase 6: Team Management Features (Week 3-4)
- [ ] Create team member list page
- [ ] Add team calendar view
- [ ] Add team attendance/reports
- [ ] Add quick actions (view profile, edit, etc.)
- [ ] Permission enforcement on update/delete

**Deliverable:** Managers can manage their team

### Phase 7: Testing & Refinement (Week 4)
- [ ] Test manager access control
- [ ] Test hierarchy enforcement
- [ ] Test approval workflows
- [ ] Security testing (unauthorized access attempts)
- [ ] Performance testing with large teams

**Deliverable:** Production-ready manager role

### Phase 8: Documentation & Training (Week 4)
- [ ] Update API documentation
- [ ] Create user guides for managers
- [ ] Create admin guide for assigning roles
- [ ] Document permission matrix

**Deliverable:** Documentation complete

---

## 6. API ENDPOINT CHANGES SUMMARY

### New Manager Endpoints

```
GET    /api/manager/dashboard              - Manager dashboard data
GET    /api/manager/team/members           - List team members
GET    /api/manager/team/summary           - Team statistics
GET    /api/manager/approvals/pending      - Pending approvals for manager's team
GET    /api/manager/reports/performance    - Team performance reports
GET    /api/manager/reports/attendance     - Team attendance reports
POST   /api/manager/team/:memberId/assign  - Assign employee to manager (admin only)
PATCH  /api/manager/profile                - Manager's own profile
```

### Updated Endpoints (Add Manager Support)

```
GET    /api/leave/pending-requests    → Filter by team for managers
PATCH  /api/leave/approve/:id         → Add manager permission check
PATCH  /api/leave/reject/:id          → Add manager permission check
GET    /api/expenses/approvals        → Filter by team for managers
POST   /api/expenses/:id/approve      → Add manager permission check
POST   /api/expenses/:id/decline      → Add manager permission check
GET    /api/employees                 → Filter by team for managers
GET    /api/employees/:id             → Add access control check
PUT    /api/employees/:id             → Add access control check
```

---

## 7. SECURITY CONSIDERATIONS

### 7.1 Access Control Enforcement Points

1. **Authentication Middleware**
   - Verify user is authenticated
   - Load user role and manager info

2. **Authorization Middleware**
   - Check role-based permissions
   - Verify hierarchy relationship
   - Prevent unauthorized access

3. **Database Queries**
   - Filter results by accessible employees
   - Prevent SQL/injection attacks
   - Use proper indexes for performance

4. **API Response Validation**
   - Never expose sensitive data to unauthorized users
   - Sanitize output based on role
   - Audit all approval actions

### 7.2 Audit Trail

Add logging for all approval actions:
```javascript
await AuditLog.create({
  actor: req.user._id,
  actorRole: req.user.role,
  action: 'leave_approved',
  resourceType: 'LeaveRequest',
  resourceId: leaveRequest._id,
  targetUser: leaveRequest.employeeId,
  timestamp: new Date(),
  details: { leaveType, startDate, endDate }
});
```

### 7.3 Role Elevation Prevention

- Managers cannot assign themselves higher roles
- Only super-admin can modify roles
- Cannot approve own requests
- Cannot access employees outside team

---

## 8. DATA MIGRATION (If Existing Managers Exist)

If existing employees have `role: 'manager'` but no proper setup:

```javascript
// Script to validate and fix existing manager data
const fixManagerData = async () => {
  const managers = await EmployeeHub.find({ role: 'manager' });
  
  for (const manager of managers) {
    // Verify manager has no manager themselves (or set to null)
    if (manager.managerId) {
      console.log(`Warning: Manager ${manager.firstName} has a manager assigned`);
      // Decide: keep or remove based on hierarchy
    }
    
    // Get direct reports
    const directReports = await EmployeeHub.countDocuments({ 
      managerId: manager._id 
    });
    
    if (directReports === 0) {
      console.log(`Warning: Manager ${manager.firstName} has no direct reports`);
    }
  }
};
```

---

## 9. TESTING STRATEGY

### Unit Tests

```javascript
describe('hierarchyHelper', () => {
  describe('canApproveLeave', () => {
    it('should allow admin to approve any leave', async () => {
      // Test
    });
    
    it('should allow manager to approve direct reports', async () => {
      // Test
    });
    
    it('should deny manager to approve outside team', async () => {
      // Test
    });
  });
});
```

### Integration Tests

```javascript
describe('Manager Leave Approval Flow', () => {
  it('manager can see only team pending requests', async () => {
    // Create teams
    // Create requests
    // Verify filtering
  });
  
  it('manager can approve team member leave', async () => {
    // Create leave request
    // Approve
    // Verify status change
    // Verify audit trail
  });
});
```

### E2E Tests

```javascript
describe('Manager Dashboard', () => {
  it('should display manager with team data', () => {
    // Login as manager
    // Navigate to dashboard
    // Verify team statistics
    // Verify pending approvals
  });
});
```

---

## 10. ROLLBACK PLAN

If issues occur:

1. **Immediate (in minutes)**
   - Disable manager features via feature flag
   - Keep all manager roles as read-only
   - Revert to admin-only approvals

2. **Short-term (in hours)**
   - Revert database schema changes (add undo migrations)
   - Remove manager routes from routers
   - Revert controller changes from git
   - Clear manager-related feature flags

3. **Analysis**
   - Review error logs
   - Identify failing functionality
   - Create hotfix
   - Re-deploy with fixes

---

# STEP-BY-STEP IMPLEMENTATION GUIDE

## Complete Implementation Instructions

This section provides exact, copy-paste ready code to implement the Manager role system.

### STEP 1: Update User Model (15 minutes)

**File:** `backend/models/User.js`

Find the role enum:
```javascript
role: {
  type: String,
  enum: ['profile', 'user', 'super-admin', 'admin'],  // ← OLD
```

Replace with:
```javascript
role: {
  type: String,
  enum: ['profile', 'user', 'manager', 'admin', 'super-admin'],  // ← NEW
```

**Verification:**
```bash
npm test -- User.model.test.js
# Or manually test: Create a User with role='manager'
```

---

### STEP 2: Add Database Indexes (10 minutes)

**File:** `backend/models/EmployeesHub.js`

Add at the end of the file (before `module.exports`):

```javascript
// Add manager-specific indexes
schema.index({ managerId: 1, role: 1 });
schema.index({ role: 1, isActive: 1 });
schema.index({ managerId: 1, isActive: 1 });

// Index for quick manager lookups
schema.index({ role: 1, department: 1 });
```

**File:** `backend/models/LeaveRequest.js`

Add indexes:
```javascript
schema.index({ approverId: 1, status: 1 });
schema.index({ status: 1, approverRole: 1 });
```

**File:** `backend/models/Expense.js`

Add indexes:
```javascript
schema.index({ approverId: 1, status: 1 });
schema.index({ status: 1, submittedBy: 1 });
```

Run migration to apply indexes:
```bash
# If using migration system:
npm run migrate:indexes

# Or restart application to rebuild indexes
```

---

### STEP 3: Create/Update hierarchyHelper.js (45 minutes)

**File:** `backend/utils/hierarchyHelper.js`

**Replace entire file with:**

```javascript
const EmployeeHub = require('../models/EmployeesHub');

/**
 * Get all subordinates of a manager (direct + indirect)
 * @param {ObjectId} managerId - The manager's ID
 * @param {Boolean} includeIndirect - Include indirect reports (default: true)
 * @returns {Array} Array of employee objects
 */
exports.getSubordinates = async (managerId, includeIndirect = true) => {
  try {
    const subordinates = [];
    const visited = new Set();
    
    async function traverse(mgrId) {
      if (visited.has(mgrId.toString())) return; // Prevent infinite loops
      visited.add(mgrId.toString());
      
      const directReports = await EmployeeHub.find({ managerId: mgrId });
      
      for (const report of directReports) {
        subordinates.push(report);
        
        // If includeIndirect and report is a manager, get their reports too
        if (includeIndirect && ['manager', 'senior-manager'].includes(report.role)) {
          await traverse(report._id);
        }
      }
    }
    
    await traverse(managerId);
    return subordinates;
  } catch (error) {
    console.error('Error in getSubordinates:', error);
    return [];
  }
};

/**
 * Check if employee is in a manager's hierarchy
 * @param {ObjectId} employeeId - The employee to check
 * @param {ObjectId} managerId - The manager to check against
 * @returns {Boolean} True if employee reports to manager
 */
exports.isInHierarchy = async (employeeId, managerId) => {
  try {
    let currentEmployee = await EmployeeHub.findById(employeeId);
    const manager = await EmployeeHub.findById(managerId);
    
    if (!currentEmployee || !manager) return false;
    
    // For senior managers, check full hierarchy
    const checkIndirect = ['senior-manager', 'admin', 'super-admin'].includes(manager.role);
    
    // Walk up the hierarchy
    const visited = new Set();
    while (currentEmployee.managerId) {
      if (visited.has(currentEmployee.managerId.toString())) {
        // Circular reference detected
        return false;
      }
      visited.add(currentEmployee.managerId.toString());
      
      if (currentEmployee.managerId.toString() === managerId.toString()) {
        return true;
      }
      
      // If manager is not senior, only check direct report
      if (!checkIndirect) {
        return false;
      }
      
      currentEmployee = await EmployeeHub.findById(currentEmployee.managerId);
      if (!currentEmployee) return false;
    }
    
    return false;
  } catch (error) {
    console.error('Error in isInHierarchy:', error);
    return false;
  }
};

/**
 * Check if a user can approve leave for an employee
 * @param {ObjectId} approverId - The approver's ID
 * @param {ObjectId} employeeId - The employee's ID
 * @returns {Boolean} True if can approve
 */
exports.canApproveLeave = async (approverId, employeeId) => {
  try {
    const approver = await EmployeeHub.findById(approverId);
    const employee = await EmployeeHub.findById(employeeId);
    
    if (!approver || !employee) return false;
    
    // Super-admin and admin can approve anyone
    if (['super-admin', 'admin'].includes(approver.role)) return true;
    
    // HR can approve anyone (if HR role exists)
    if (approver.role === 'hr') return true;
    
    // Manager can approve their direct/indirect reports
    if (['manager', 'senior-manager'].includes(approver.role)) {
      return await this.isInHierarchy(employeeId, approverId);
    }
    
    return false;
  } catch (error) {
    console.error('Error in canApproveLeave:', error);
    return false;
  }
};

/**
 * Check if a user can approve expenses for an employee
 * @param {ObjectId} approverId - The approver's ID
 * @param {ObjectId} employeeId - The employee's ID
 * @returns {Boolean} True if can approve
 */
exports.canApproveExpense = async (approverId, employeeId) => {
  // Same logic as leave approval
  return await this.canApproveLeave(approverId, employeeId);
};

/**
 * Check if a user can access/modify another employee's data
 * @param {ObjectId} actorId - The actor trying to access
 * @param {ObjectId} targetEmployeeId - The target employee
 * @param {Object} actor - The actor's document (with role)
 * @returns {Boolean} True if can access
 */
exports.canAccessEmployee = async (actorId, targetEmployeeId, actor) => {
  try {
    // Self-access always allowed
    if (actorId.toString() === targetEmployeeId.toString()) {
      return true;
    }
    
    // Admin/Super-admin can access anyone
    if (['admin', 'super-admin'].includes(actor.role)) {
      return true;
    }
    
    // Manager can access their team
    if (['manager', 'senior-manager'].includes(actor.role)) {
      return await this.isInHierarchy(targetEmployeeId, actorId);
    }
    
    return false;
  } catch (error) {
    console.error('Error in canAccessEmployee:', error);
    return false;
  }
};

/**
 * Get all pending approvals for a manager
 * @param {ObjectId} managerId - The manager's ID
 * @returns {Object} Object with leave and expense approvals
 */
exports.getPendingApprovalsForManager = async (managerId) => {
  try {
    const LeaveRequest = require('../models/LeaveRequest');
    const Expense = require('../models/Expense');
    
    const team = await this.getSubordinates(managerId, true);
    const teamIds = team.map(t => t._id);
    
    const pendingLeave = await LeaveRequest.find({
      employeeId: { $in: teamIds },
      status: 'Pending'
    }).populate('employeeId', 'firstName lastName email department');
    
    const pendingExpenses = await Expense.find({
      submittedBy: { $in: teamIds },
      status: 'Pending'
    }).populate('submittedBy', 'firstName lastName email');
    
    return {
      leaveRequests: pendingLeave,
      expenses: pendingExpenses,
      totalPending: pendingLeave.length + pendingExpenses.length
    };
  } catch (error) {
    console.error('Error in getPendingApprovalsForManager:', error);
    return { leaveRequests: [], expenses: [], totalPending: 0 };
  }
};

/**
 * Get team data for a manager
 * @param {ObjectId} managerId - The manager's ID
 * @returns {Object} Object with team info
 */
exports.getTeamData = async (managerId) => {
  try {
    const manager = await EmployeeHub.findById(managerId);
    if (!manager) return null;
    
    const teamMembers = await this.getSubordinates(managerId, true);
    
    return {
      manager,
      teamMembers,
      teamSize: teamMembers.length,
      activeMembers: teamMembers.filter(m => m.isActive).length,
      roles: [...new Set(teamMembers.map(m => m.role))],
      departments: [...new Set(teamMembers.map(m => m.department))]
    };
  } catch (error) {
    console.error('Error in getTeamData:', error);
    return null;
  }
};

/**
 * Validate manager role consistency
 * @returns {Object} Validation report
 */
exports.validateManagerHierarchy = async () => {
  try {
    const issues = [];
    
    // Find managers with managers
    const managersWithManagers = await EmployeeHub.find({
      role: { $in: ['manager', 'senior-manager'] },
      managerId: { $ne: null }
    });
    
    // This might be intentional (manager under senior-manager) so log but don't fail
    if (managersWithManagers.length > 0) {
      issues.push({
        type: 'info',
        count: managersWithManagers.length,
        message: 'Managers reporting to managers (may be intentional)'
      });
    }
    
    // Find employees with null manager
    const orphanEmployees = await EmployeeHub.find({
      role: 'employee',
      managerId: null,
      isActive: true
    });
    
    if (orphanEmployees.length > 0) {
      issues.push({
        type: 'warning',
        count: orphanEmployees.length,
        message: 'Active employees without assigned manager'
      });
    }
    
    return {
      valid: issues.filter(i => i.type === 'error').length === 0,
      issues
    };
  } catch (error) {
    console.error('Error in validateManagerHierarchy:', error);
    return { valid: false, issues: [{ type: 'error', message: error.message }] };
  }
};

module.exports = exports;
```

**Verification:**
```javascript
// Test file: backend/utils/hierarchyHelper.test.js
const hierarchyHelper = require('./hierarchyHelper');
const EmployeeHub = require('../models/EmployeesHub');

// Run basic tests
it('should get subordinates', async () => {
  const manager = await EmployeeHub.findOne({ role: 'manager' });
  const subordinates = await hierarchyHelper.getSubordinates(manager._id);
  expect(subordinates).toBeDefined();
});

it('should check hierarchy', async () => {
  // Create test data
  const canAccess = await hierarchyHelper.isInHierarchy(employeeId, managerId);
  expect(typeof canAccess).toBe('boolean');
});
```

---

### STEP 4: Update Authentication Middleware (15 minutes)

**File:** `backend/middleware/auth.js` (or authentication middleware file)

Find the authentication handler and add this after user is loaded:

```javascript
// After user is found and loaded
if (req.user) {
  // Add role-based flags for easy checking
  req.user.isManager = ['manager', 'senior-manager', 'admin', 'super-admin']
    .includes(req.user.role);
  req.user.isAdmin = ['admin', 'super-admin'].includes(req.user.role);
  req.user.isSuperAdmin = req.user.role === 'super-admin';
  
  // Load employee data if user is an employee
  if (!req.user.employeeId && req.user.email) {
    try {
      const EmployeeHub = require('../models/EmployeesHub');
      const employee = await EmployeeHub.findOne({ email: req.user.email });
      if (employee) {
        req.user.employeeId = employee._id;
        req.user.managerId = employee.managerId;
        req.user.department = employee.department;
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
    }
  }
}

// Add middleware to check manager role
const requireManager = (req, res, next) => {
  if (!req.user || !req.user.isManager) {
    return res.status(403).json({
      success: false,
      message: 'Manager access required'
    });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

module.exports = {
  authenticateUser,
  requireManager,
  requireAdmin,
  // ... other exports
};
```

---

### STEP 5: Update Leave Controller (30 minutes)

**File:** `backend/controllers/unifiedLeaveController.js`

Find the `getPendingLeaveRequests` function and update it:

```javascript
exports.getPendingLeaveRequests = async (req, res) => {
  try {
    const user = req.user;
    const hierarchyHelper = require('../utils/hierarchyHelper');
    
    let query = { status: 'Pending' };
    
    // If manager, show only team's requests
    if (user.isManager && !user.isAdmin) {
      const team = await hierarchyHelper.getSubordinates(user.employeeId, true);
      const teamIds = team.map(t => t._id);
      query.employeeId = { $in: teamIds };
    }
    // If regular user, show only self (if they have any pending - shouldn't apply)
    else if (!user.isAdmin) {
      query.employeeId = user.employeeId;
    }
    // If admin, show all (no filter)
    
    const leaveRequests = await LeaveRequest.find(query)
      .populate('employeeId', 'firstName lastName email department')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: leaveRequests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

Find the `approveLeaveRequest` function and add permission check:

```javascript
exports.approveLeaveRequest = async (req, res) => {
  try {
    const { leaveRequestId } = req.params;
    const hierarchyHelper = require('../utils/hierarchyHelper');
    
    const leaveRequest = await LeaveRequest.findById(leaveRequestId);
    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }
    
    // ====== NEW: Permission check ======
    const canApprove = await hierarchyHelper.canApproveLeave(
      req.user.employeeId,
      leaveRequest.employeeId
    );
    
    if (!canApprove) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to approve this leave request'
      });
    }
    
    // Update leave request
    leaveRequest.status = 'Approved';
    leaveRequest.approverRole = req.user.isManager ? 'manager' : 'admin';
    leaveRequest.approverName = `${req.user.firstName} ${req.user.lastName}`;
    leaveRequest.approvedAt = new Date();
    leaveRequest.approverId = req.user.employeeId;
    
    await leaveRequest.save();
    
    // Send approval notification
    await sendLeaveApprovalEmail(leaveRequest, 'approved');
    
    res.json({
      success: true,
      message: 'Leave request approved',
      data: leaveRequest
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

Find the `rejectLeaveRequest` function and add same permission check:

```javascript
exports.rejectLeaveRequest = async (req, res) => {
  try {
    const { leaveRequestId } = req.params;
    const { rejectionReason } = req.body;
    const hierarchyHelper = require('../utils/hierarchyHelper');
    
    const leaveRequest = await LeaveRequest.findById(leaveRequestId);
    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }
    
    // ====== NEW: Permission check ======
    const canApprove = await hierarchyHelper.canApproveLeave(
      req.user.employeeId,
      leaveRequest.employeeId
    );
    
    if (!canApprove) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reject this leave request'
      });
    }
    
    leaveRequest.status = 'Rejected';
    leaveRequest.rejectionReason = rejectionReason;
    leaveRequest.rejectedAt = new Date();
    leaveRequest.approverId = req.user.employeeId;
    
    await leaveRequest.save();
    
    await sendLeaveRejectionEmail(leaveRequest, rejectionReason);
    
    res.json({
      success: true,
      message: 'Leave request rejected',
      data: leaveRequest
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

### STEP 6: Update Expense Controller (30 minutes)

**File:** `backend/controllers/expenseController.js`

Find `getExpenses` or `getAllExpenses` function:

```javascript
exports.getExpenses = async (req, res) => {
  try {
    const user = req.user;
    const hierarchyHelper = require('../utils/hierarchyHelper');
    
    let query = {};
    
    // If manager, show team's expenses
    if (user.isManager && !user.isAdmin) {
      const team = await hierarchyHelper.getSubordinates(user.employeeId, true);
      const teamIds = team.map(t => t._id);
      query.submittedBy = { $in: teamIds };
    }
    // If not admin, only own expenses
    else if (!user.isAdmin) {
      query.submittedBy = user.employeeId;
    }
    // If admin, show all (no filter)
    
    const expenses = await Expense.find(query)
      .populate('submittedBy', 'firstName lastName email department')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: expenses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

Find `approveExpense` function:

```javascript
exports.approveExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { approvalNotes } = req.body;
    const hierarchyHelper = require('../utils/hierarchyHelper');
    
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    
    // ====== NEW: Permission check ======
    const canApprove = await hierarchyHelper.canApproveExpense(
      req.user.employeeId,
      expense.submittedBy
    );
    
    if (!canApprove) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to approve this expense'
      });
    }
    
    expense.status = 'Approved';
    expense.approverId = req.user.employeeId;
    expense.approvalNotes = approvalNotes;
    expense.approvedAt = new Date();
    
    await expense.save();
    
    await sendExpenseApprovalEmail(expense);
    
    res.json({
      success: true,
      message: 'Expense approved',
      data: expense
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

Find `declineExpense` function:

```javascript
exports.declineExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { declineReason } = req.body;
    const hierarchyHelper = require('../utils/hierarchyHelper');
    
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    
    // ====== NEW: Permission check ======
    const canApprove = await hierarchyHelper.canApproveExpense(
      req.user.employeeId,
      expense.submittedBy
    );
    
    if (!canApprove) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to decline this expense'
      });
    }
    
    expense.status = 'Declined';
    expense.declineReason = declineReason;
    expense.approverId = req.user.employeeId;
    
    await expense.save();
    
    await sendExpenseDeclineEmail(expense, declineReason);
    
    res.json({
      success: true,
      message: 'Expense declined',
      data: expense
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

### STEP 7: Create Manager Controller (45 minutes)

**File:** `backend/controllers/managerController.js` (create new file)

```javascript
const EmployeeHub = require('../models/EmployeesHub');
const LeaveRequest = require('../models/LeaveRequest');
const Expense = require('../models/Expense');
const hierarchyHelper = require('../utils/hierarchyHelper');

/**
 * Get manager's dashboard
 */
exports.getManagerDashboard = async (req, res) => {
  try {
    const managerId = req.user.employeeId;
    
    if (!managerId) {
      return res.status(400).json({
        success: false,
        message: 'Manager ID not found in user'
      });
    }
    
    // Get team data
    const teamData = await hierarchyHelper.getTeamData(managerId);
    if (!teamData) {
      return res.status(404).json({
        success: false,
        message: 'Manager not found'
      });
    }
    
    // Get pending approvals
    const approvals = await hierarchyHelper.getPendingApprovalsForManager(managerId);
    
    // Get recent activities
    const recentLeaveApprovals = await LeaveRequest.find({
      approverId: managerId
    })
      .sort({ approvedAt: -1 })
      .limit(5)
      .populate('employeeId', 'firstName lastName');
    
    const recentExpenseApprovals = await Expense.find({
      approverId: managerId
    })
      .sort({ approvedAt: -1 })
      .limit(5)
      .populate('submittedBy', 'firstName lastName');
    
    res.json({
      success: true,
      data: {
        teamStats: {
          totalMembers: teamData.teamSize,
          activeMembers: teamData.activeMembers,
          departments: teamData.departments,
          roles: teamData.roles
        },
        pendingApprovals: approvals,
        recentActivities: {
          leaveApprovals: recentLeaveApprovals,
          expenseApprovals: recentExpenseApprovals
        }
      }
    });
  } catch (error) {
    console.error('Error in getManagerDashboard:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get team members
 */
exports.getTeamMembers = async (req, res) => {
  try {
    const managerId = req.user.employeeId;
    const { department, includeIndirect } = req.query;
    
    const teamMembers = await hierarchyHelper.getSubordinates(
      managerId,
      includeIndirect !== 'false'
    );
    
    let filtered = teamMembers;
    
    if (department) {
      filtered = filtered.filter(m => m.department === department);
    }
    
    res.json({
      success: true,
      data: filtered,
      count: filtered.length
    });
  } catch (error) {
    console.error('Error in getTeamMembers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get pending approvals for manager
 */
exports.getPendingApprovals = async (req, res) => {
  try {
    const managerId = req.user.employeeId;
    
    const approvals = await hierarchyHelper.getPendingApprovalsForManager(managerId);
    
    res.json({
      success: true,
      data: approvals
    });
  } catch (error) {
    console.error('Error in getPendingApprovals:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get team summary/statistics
 */
exports.getTeamSummary = async (req, res) => {
  try {
    const managerId = req.user.employeeId;
    
    const teamData = await hierarchyHelper.getTeamData(managerId);
    if (!teamData) {
      return res.status(404).json({
        success: false,
        message: 'Manager not found'
      });
    }
    
    // Calculate additional stats
    const onLeave = teamData.teamMembers.filter(m => 
      m.currentLeaveStatus === 'on-leave'
    ).length;
    
    const onSickLeave = teamData.teamMembers.filter(m => 
      m.currentLeaveStatus === 'sick-leave'
    ).length;
    
    res.json({
      success: true,
      data: {
        manager: {
          id: teamData.manager._id,
          name: `${teamData.manager.firstName} ${teamData.manager.lastName}`,
          department: teamData.manager.department,
          role: teamData.manager.role
        },
        teamSize: teamData.teamSize,
        activeMembers: teamData.activeMembers,
        onLeave,
        onSickLeave,
        departments: teamData.departments,
        roles: teamData.roles
      }
    });
  } catch (error) {
    console.error('Error in getTeamSummary:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get team performance reports
 */
exports.getPerformanceReports = async (req, res) => {
  try {
    const managerId = req.user.employeeId;
    
    const teamMembers = await hierarchyHelper.getSubordinates(managerId, true);
    
    // Fetch performance data for each team member
    // This assumes you have a Review or PerformanceNote model
    const performanceData = await Promise.all(
      teamMembers.map(async (member) => {
        // Get latest review
        const Review = require('../models/Review');
        const latestReview = await Review.findOne({
          employeeId: member._id
        }).sort({ createdAt: -1 });
        
        return {
          employeeId: member._id,
          employeeName: `${member.firstName} ${member.lastName}`,
          department: member.department,
          lastReview: latestReview?.createdAt,
          rating: latestReview?.rating
        };
      })
    );
    
    res.json({
      success: true,
      data: performanceData
    });
  } catch (error) {
    console.error('Error in getPerformanceReports:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get team attendance reports
 */
exports.getAttendanceReports = async (req, res) => {
  try {
    const managerId = req.user.employeeId;
    const { startDate, endDate } = req.query;
    
    const teamMembers = await hierarchyHelper.getSubordinates(managerId, true);
    const teamIds = teamMembers.map(m => m._id);
    
    // Get leave records for team
    const query = {
      employeeId: { $in: teamIds },
      status: 'Approved'
    };
    
    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate) };
      query.endDate = { $lte: new Date(endDate) };
    }
    
    const leaveRecords = await LeaveRequest.find(query)
      .populate('employeeId', 'firstName lastName');
    
    // Group by employee
    const attendanceData = teamMembers.map(member => {
      const memberLeave = leaveRecords.filter(lr =>
        lr.employeeId._id.toString() === member._id.toString()
      );
      
      return {
        employeeId: member._id,
        employeeName: `${member.firstName} ${member.lastName}`,
        totalLeaveDays: memberLeave.reduce((sum, lr) =>
          sum + (lr.numberOfDays || 0), 0
        ),
        leaveRecords: memberLeave
      };
    });
    
    res.json({
      success: true,
      data: attendanceData
    });
  } catch (error) {
    console.error('Error in getAttendanceReports:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = exports;
```

---

### STEP 8: Create Manager Routes (15 minutes)

**File:** `backend/routes/managerRoutes.js` (create new file)

```javascript
const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');
const { authenticateUser, requireManager } = require('../middleware/auth');

// Apply middleware to all manager routes
router.use(authenticateUser);
router.use(requireManager);

// Manager Dashboard
router.get('/dashboard', managerController.getManagerDashboard);

// Team Management
router.get('/team/members', managerController.getTeamMembers);
router.get('/team/summary', managerController.getTeamSummary);

// Approvals
router.get('/approvals/pending', managerController.getPendingApprovals);

// Reports
router.get('/reports/performance', managerController.getPerformanceReports);
router.get('/reports/attendance', managerController.getAttendanceReports);

module.exports = router;
```

**Add to main server routes file:**

**File:** `backend/server.js` (find where routes are imported)

```javascript
// Add this with other route imports
const managerRoutes = require('./routes/managerRoutes');

// Add this with other app.use() statements
app.use('/api/manager', managerRoutes);
```

---

### STEP 9: Frontend - Create Roles Constants (10 minutes)

**File:** `frontend/src/constants/roles.js` (create new file)

```javascript
export const ROLES = {
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  SENIOR_MANAGER: 'senior-manager',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super-admin'
};

export const ROLE_HIERARCHY = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  SENIOR_MANAGER: 3,
  MANAGER: 2,
  EMPLOYEE: 1
};

export const ROLE_LABELS = {
  employee: 'Employee',
  manager: 'Manager',
  'senior-manager': 'Senior Manager',
  admin: 'Admin',
  'super-admin': 'Super Admin'
};

/**
 * Check if user has required role(s)
 */
export const hasRole = (userRole, requiredRoles) => {
  if (!requiredRoles) return true;
  if (typeof requiredRoles === 'string') {
    return userRole === requiredRoles;
  }
  return Array.isArray(requiredRoles) && requiredRoles.includes(userRole);
};

/**
 * Check if user is a manager or higher
 */
export const isManager = (userRole) => {
  return ['manager', 'senior-manager', 'admin', 'super-admin'].includes(userRole);
};

/**
 * Check if user is admin or higher
 */
export const isAdmin = (userRole) => {
  return ['admin', 'super-admin'].includes(userRole);
};

/**
 * Check if user is super admin
 */
export const isSuperAdmin = (userRole) => {
  return userRole === 'super-admin';
};

/**
 * Get role display label
 */
export const getRoleLabel = (role) => {
  return ROLE_LABELS[role] || role;
};

/**
 * Check if can approve requests
 */
export const canApprove = (userRole) => {
  return isManager(userRole);
};

export default {
  ROLES,
  ROLE_HIERARCHY,
  ROLE_LABELS,
  hasRole,
  isManager,
  isAdmin,
  isSuperAdmin,
  getRoleLabel,
  canApprove
};
```

---

### STEP 10: Frontend - Create RoleGuard Component (10 minutes)

**File:** `frontend/src/components/RoleGuard.jsx` (create new file)

```javascript
import React from 'react';
import { hasRole } from '../constants/roles';

/**
 * Component to conditionally render content based on user role
 *
 * Usage:
 * <RoleGuard requiredRoles="admin" user={user}>
 *   <AdminPanel />
 * </RoleGuard>
 *
 * <RoleGuard requiredRoles={['manager', 'admin']} user={user} fallback={<AccessDenied />}>
 *   <ManagerPanel />
 * </RoleGuard>
 */
export const RoleGuard = ({ children, requiredRoles, user, fallback = null }) => {
  if (!user) {
    return fallback;
  }
  
  if (!hasRole(user.role, requiredRoles)) {
    return fallback;
  }
  
  return children;
};

/**
 * Render component only if user IS NOT the specified role
 */
export const RoleGuardNot = ({ children, blockedRoles, user, fallback = null }) => {
  if (!user) {
    return children;
  }
  
  if (hasRole(user.role, blockedRoles)) {
    return fallback;
  }
  
  return children;
};

export default RoleGuard;
```

---

### STEP 11: Frontend - Create usePermissions Hook (10 minutes)

**File:** `frontend/src/hooks/usePermissions.js` (create new file)

```javascript
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext'; // Adjust path as needed
import { isManager, isAdmin } from '../constants/roles';

export const usePermissions = () => {
  const { user } = useContext(AuthContext);
  
  if (!user) {
    return {
      isAuthenticated: false,
      canApproveLeave: false,
      canApproveExpense: false,
      canManageTeam: false,
      canModifyRoles: false,
      canAccessAllData: false,
      isManagerOrAbove: false,
      isAdmin: false
    };
  }
  
  return {
    isAuthenticated: true,
    canApproveLeave: isManager(user.role),
    canApproveExpense: isManager(user.role),
    canManageTeam: isManager(user.role),
    canModifyRoles: isAdmin(user.role),
    canAccessAllData: isAdmin(user.role),
    isManagerOrAbove: isManager(user.role),
    isAdmin: isAdmin(user.role),
    userRole: user.role,
    userId: user._id
  };
};

export default usePermissions;
```

---

### STEP 12: Frontend - Create Manager Dashboard (60 minutes)

**File:** `frontend/src/pages/ManagerDashboard.jsx` (create new file)

```javascript
import React, { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { isManager } from '../constants/roles';
import RoleGuard from '../components/RoleGuard';
import './ManagerDashboard.css';

const ManagerDashboard = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  useEffect(() => {
    if (user && isManager(user.role)) {
      fetchDashboard();
    }
  }, [user]);
  
  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/manager/dashboard');
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Failed to load manager dashboard:', error);
      setError(error.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };
  
  if (!user) {
    return <div>Loading...</div>;
  }
  
  return (
    <RoleGuard requiredRoles={['manager', 'senior-manager']} user={user} 
      fallback={<div className="access-denied">Access Denied: Manager role required</div>}>
      
      <div className="manager-dashboard">
        <header className="dashboard-header">
          <h1>Manager Dashboard</h1>
          <p className="subtitle">Manage your team and approvals</p>
        </header>
        
        {error && (
          <div className="error-alert">
            {error}
            <button onClick={fetchDashboard} className="retry-btn">Retry</button>
          </div>
        )}
        
        {loading ? (
          <div className="loading">Loading dashboard...</div>
        ) : dashboardData ? (
          <>
            {/* Tabs */}
            <div className="dashboard-tabs">
              <button
                className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={`tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}
                onClick={() => setActiveTab('approvals')}
              >
                Pending Approvals ({dashboardData.pendingApprovals?.totalPending || 0})
              </button>
              <button
                className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`}
                onClick={() => setActiveTab('team')}
              >
                My Team
              </button>
            </div>
            
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="tab-content overview-tab">
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-number">{dashboardData.teamStats.totalMembers}</div>
                    <div className="stat-label">Team Members</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">{dashboardData.teamStats.activeMembers}</div>
                    <div className="stat-label">Active Members</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">{dashboardData.pendingApprovals.leaveRequests.length}</div>
                    <div className="stat-label">Pending Leave Requests</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">{dashboardData.pendingApprovals.expenses.length}</div>
                    <div className="stat-label">Pending Expenses</div>
                  </div>
                </div>
                
                {/* Recent Activities */}
                <div className="recent-activities">
                  <h2>Recent Approvals</h2>
                  
                  <div className="activities-section">
                    <h3>Leave Approvals</h3>
                    {dashboardData.recentActivities.leaveApprovals.length > 0 ? (
                      <ul className="activity-list">
                        {dashboardData.recentActivities.leaveApprovals.map(approval => (
                          <li key={approval._id} className="activity-item">
                            <span className="employee-name">
                              {approval.employeeId.firstName} {approval.employeeId.lastName}
                            </span>
                            <span className="activity-date">
                              {new Date(approval.approvedAt).toLocaleDateString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-data">No recent leave approvals</p>
                    )}
                  </div>
                  
                  <div className="activities-section">
                    <h3>Expense Approvals</h3>
                    {dashboardData.recentActivities.expenseApprovals.length > 0 ? (
                      <ul className="activity-list">
                        {dashboardData.recentActivities.expenseApprovals.map(approval => (
                          <li key={approval._id} className="activity-item">
                            <span className="employee-name">
                              {approval.submittedBy.firstName} {approval.submittedBy.lastName}
                            </span>
                            <span className="activity-date">
                              {new Date(approval.approvedAt).toLocaleDateString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-data">No recent expense approvals</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Approvals Tab */}
            {activeTab === 'approvals' && (
              <div className="tab-content approvals-tab">
                <ApprovalsList data={dashboardData.pendingApprovals} onApprovalChange={fetchDashboard} />
              </div>
            )}
            
            {/* Team Tab */}
            {activeTab === 'team' && (
              <div className="tab-content team-tab">
                <TeamList teamMembers={dashboardData.teamStats} />
              </div>
            )}
          </>
        ) : (
          <div className="no-data">No dashboard data available</div>
        )}
      </div>
    </RoleGuard>
  );
};

/**
 * Approvals List Component
 */
const ApprovalsList = ({ data, onApprovalChange }) => {
  const [approving, setApproving] = useState(null);
  
  const handleApprove = async (type, id) => {
    // Implementation depends on your API
    // This is a placeholder
    console.log(`Approve ${type}: ${id}`);
  };
  
  return (
    <div className="approvals-list">
      <div className="approvals-section">
        <h2>Pending Leave Requests ({data.leaveRequests.length})</h2>
        {data.leaveRequests.length > 0 ? (
          <table className="approvals-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.leaveRequests.map(leave => (
                <tr key={leave._id}>
                  <td>{leave.employeeId.firstName} {leave.employeeId.lastName}</td>
                  <td>{leave.leaveType}</td>
                  <td>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</td>
                  <td>{leave.numberOfDays}</td>
                  <td>
                    <button className="btn-approve" onClick={() => handleApprove('leave', leave._id)}>
                      Approve
                    </button>
                    <button className="btn-reject">Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-data">No pending leave requests</p>
        )}
      </div>
      
      <div className="approvals-section">
        <h2>Pending Expenses ({data.expenses.length})</h2>
        {data.expenses.length > 0 ? (
          <table className="approvals-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Amount</th>
                <th>Category</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.expenses.map(expense => (
                <tr key={expense._id}>
                  <td>{expense.submittedBy.firstName} {expense.submittedBy.lastName}</td>
                  <td>${expense.amount}</td>
                  <td>{expense.category}</td>
                  <td>{new Date(expense.date).toLocaleDateString()}</td>
                  <td>
                    <button className="btn-approve" onClick={() => handleApprove('expense', expense._id)}>
                      Approve
                    </button>
                    <button className="btn-reject">Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-data">No pending expenses</p>
        )}
      </div>
    </div>
  );
};

/**
 * Team List Component
 */
const TeamList = ({ teamMembers }) => {
  return (
    <div className="team-list">
      <h2>Your Team</h2>
      <div className="team-stats">
        <div className="team-stat">
          <span className="label">Total Members:</span>
          <span className="value">{teamMembers.totalMembers}</span>
        </div>
        <div className="team-stat">
          <span className="label">Active:</span>
          <span className="value">{teamMembers.activeMembers}</span>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
```

**Create CSS file:** `frontend/src/pages/ManagerDashboard.css`

```css
.manager-dashboard {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 2rem;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 1rem;
}

.dashboard-header h1 {
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
}

.subtitle {
  color: #666;
  margin: 0;
}

.dashboard-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e0e0e0;
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1rem;
  color: #666;
  border-bottom: 3px solid transparent;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  color: #333;
}

.tab-btn.active {
  color: #007bff;
  border-bottom-color: #007bff;
}

.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: bold;
  color: #007bff;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: #666;
  font-size: 0.9rem;
}

.approvals-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.approvals-table thead {
  background: #f8f9fa;
  border-bottom: 2px solid #e0e0e0;
}

.approvals-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
}

.approvals-table td {
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.approvals-table tbody tr:hover {
  background: #f8f9fa;
}

.btn-approve, .btn-reject {
  padding: 0.5rem 1rem;
  margin-right: 0.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-approve {
  background: #28a745;
  color: white;
}

.btn-approve:hover {
  background: #218838;
}

.btn-reject {
  background: #dc3545;
  color: white;
}

.btn-reject:hover {
  background: #c82333;
}

.error-alert {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.retry-btn {
  padding: 0.5rem 1rem;
  background: #721c24;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.no-data {
  text-align: center;
  color: #999;
  padding: 2rem;
}

.loading {
  text-align: center;
  padding: 3rem;
  font-size: 1.1rem;
  color: #666;
}

.access-denied {
  padding: 2rem;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  color: #721c24;
}

@media (max-width: 768px) {
  .manager-dashboard {
    padding: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .approvals-table {
    font-size: 0.9rem;
  }
  
  .approvals-table th, .approvals-table td {
    padding: 0.75rem;
  }
}
```

---

### STEP 13: Update Navigation (20 minutes)

**File:** `frontend/src/components/Navigation.js` or `Sidebar.js`

Find where menu items are defined and update:

```javascript
import { isManager, isAdmin } from '../constants/roles';

const getMenuItems = (userRole) => {
  const baseItems = [
    {
      name: 'Dashboard',
      icon: 'home',
      path: '/dashboard',
      roles: ['employee', 'manager', 'senior-manager', 'admin', 'super-admin']
    },
    {
      name: 'My Profile',
      icon: 'user',
      path: '/profile',
      roles: ['employee', 'manager', 'senior-manager', 'admin', 'super-admin']
    },
    {
      name: 'Calendar',
      icon: 'calendar',
      path: '/calendar',
      roles: ['employee', 'manager', 'senior-manager', 'admin', 'super-admin']
    },
    {
      name: 'My Documents',
      icon: 'file',
      path: '/documents',
      roles: ['employee', 'manager', 'senior-manager', 'admin', 'super-admin']
    }
  ];
  
  // Add manager-specific items
  if (isManager(userRole)) {
    baseItems.push(
      {
        name: 'Manager Dashboard',
        icon: 'bar-chart',
        path: '/manager-dashboard',
        roles: ['manager', 'senior-manager', 'admin', 'super-admin']
      },
      {
        name: 'My Team',
        icon: 'users',
        path: '/manager/team',
        roles: ['manager', 'senior-manager', 'admin', 'super-admin']
      },
      {
        name: 'Approvals',
        icon: 'check-circle',
        path: '/manager/approvals',
        roles: ['manager', 'senior-manager', 'admin', 'super-admin']
      },
      {
        name: 'Reports',
        icon: 'file-text',
        path: '/manager/reports',
        roles: ['manager', 'senior-manager', 'admin', 'super-admin']
      }
    );
  }
  
  // Add admin-specific items
  if (isAdmin(userRole)) {
    baseItems.push(
      {
        name: 'Admin Dashboard',
        icon: 'cog',
        path: '/admin-dashboard',
        roles: ['admin', 'super-admin']
      },
      {
        name: 'All Employees',
        icon: 'users',
        path: '/employees',
        roles: ['admin', 'super-admin']
      },
      {
        name: 'Settings',
        icon: 'settings',
        path: '/admin/settings',
        roles: ['admin', 'super-admin']
      }
    );
  }
  
  // Filter by role
  return baseItems.filter(item =>
    item.roles.includes(userRole)
  );
};

export default getMenuItems;
```

---

### STEP 14: Testing (120 minutes)

**Test Checklist:**

#### Backend Tests
- [ ] Manager can see only their team's leave requests
- [ ] Manager can approve/reject team member leave
- [ ] Manager cannot approve leave for non-team members
- [ ] Admin can still approve all leave requests
- [ ] Manager can see only their team's expenses
- [ ] Manager can approve/reject team member expenses
- [ ] Hierarchy checks prevent cross-team access
- [ ] API returns correct filtered data

#### Frontend Tests
- [ ] Manager sees Manager Dashboard menu item
- [ ] Manager Dashboard loads successfully
- [ ] Team statistics display correctly
- [ ] Pending approvals show team members only
- [ ] Approve/Reject buttons work
- [ ] Navigation shows correct items for role
- [ ] Non-managers cannot access manager pages

#### Security Tests
- [ ] Direct API calls without authorization fail
- [ ] Managers cannot modify their own role
- [ ] Cross-team access attempts are blocked
- [ ] Audit trail logs all approvals

**Run Tests:**
```bash
# Backend tests
npm test -- hierarchyHelper.test.js
npm test -- managerController.test.js

# Frontend tests
npm test -- ManagerDashboard.test.js

# Integration tests
npm test -- e2e/manager-approval-flow.test.js
```

---

### STEP 15: Deployment Preparation (30 minutes)

1. **Database Migration:**
   ```bash
   # Create migration file
   npm run create:migration AddManagerRole
   
   # Apply migration
   npm run migrate
   ```

2. **Build Frontend:**
   ```bash
   npm run build
   ```

3. **Verification:**
   ```bash
   # Check no console errors
   npm run lint
   
   # Run full test suite
   npm test
   ```

4. **Staging Deployment:**
   ```bash
   # Deploy to staging
   npm run deploy:staging
   ```

5. **Production Deployment:**
   ```bash
   # Deploy to production
   npm run deploy:production
   ```

---

## CHECKLIST: Implementation Complete

- [ ] User model updated with 'manager' role
- [ ] Database indexes added
- [ ] hierarchyHelper.js created/updated
- [ ] Authentication middleware updated
- [ ] unifiedLeaveController updated
- [ ] expenseController updated
- [ ] managerController created
- [ ] managerRoutes created
- [ ] roles.js constants created
- [ ] RoleGuard component created
- [ ] usePermissions hook created
- [ ] ManagerDashboard created
- [ ] Navigation updated
- [ ] Tested manager approval flow
- [ ] Tested access control
- [ ] Deployed to staging
- [ ] Deployed to production
- [ ] Documentation updated
- [ ] Team trained on manager features

---

## Quick Troubleshooting

**Manager cannot see team members:**
- Check managerId is correctly set on employees
- Verify hierarchyHelper.getSubordinates() returns results
- Check authentication middleware loading employee data

**Approval buttons not working:**
- Verify canApproveLeave() returns true
- Check API response for permission errors
- Review browser console for errors

**Navigation not showing manager items:**
- Verify user.role is 'manager' not 'Manager'
- Check isManager() function in roles.js
- Ensure user context is updated after login

---

## Success Indicators

✅ Managers can view their team's leave requests  
✅ Managers can approve/reject team leave  
✅ Managers can view their team's expenses  
✅ Managers can approve/reject team expenses  
✅ Managers see dedicated dashboard  
✅ Access control prevents cross-team viewing  
✅ Audit trail logs all manager actions  
✅ No permission errors in UI  
✅ All tests pass  
✅ Performance metrics acceptable
   - Restore from last backup
   - Run data validation scripts
   - Re-test critical flows

3. **Analysis**
   - Review audit logs
   - Identify issue root cause
   - Plan fixes

---

## 11. FUTURE ENHANCEMENTS

1. **Advanced Permissions**
   - Department-based access
   - Conditional approval chains (manager → director → C-level)
   - Expense amount limits per manager

2. **Delegation**
   - Managers can delegate approvals temporarily
   - Acting manager feature

3. **Analytics**
   - Manager performance metrics
   - Team productivity insights
   - Approval turnaround times

4. **Mobile Support**
   - Manager mobile dashboard
   - Approve/reject on mobile

5. **Integrations**
   - Slack notifications for approvals
   - Calendar integration
   - Email bulk approvals

---

## 12. QUICK REFERENCE: Changes by File

| File | Change | Priority |
|------|--------|----------|
| `User.js` | Add 'manager' to role enum | P0 |
| `hierarchyHelper.js` | Enhance manager permission checks | P0 |
| `auth middleware` | Store manager flag in request | P1 |
| `unifiedLeaveController.js` | Add manager approval logic | P0 |
| `expenseController.js` | Add manager approval logic | P0 |
| `employeeHubController.js` | Add access control filters | P1 |
| `managerController.js` | Create new controller | P1 |
| `managerRoutes.js` | Create new routes | P1 |
| `roles.js` | Create role constants | P0 |
| `RoleGuard.jsx` | Create permission component | P1 |
| `ManagerDashboard.jsx` | Create manager dashboard | P1 |
| `Calendar.js` | Add manager view | P2 |
| `AdminExpenses.js` | Add manager view | P2 |
| `Navigation.js` | Add manager menu items | P1 |

---

## CONCLUSION

This plan provides a comprehensive roadmap for integrating manager-level role-based access control into the HRMS system. The phased approach ensures:

✅ **Backward compatibility** - Existing admin workflows remain unchanged
✅ **Security** - Strict hierarchy enforcement at every layer
✅ **Scalability** - Supports future enhancements
✅ **Testability** - Clear test cases at each phase
✅ **Rollback capability** - Can be safely reverted if needed

**Estimated Total Effort:** 3-4 weeks with full testing
**Team Size:** 2 developers (1 backend, 1 frontend) + QA

