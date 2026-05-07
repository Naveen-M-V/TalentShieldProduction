# Half-Day Leave Support Implementation

## Overview
Added support for decimal leave increments (0.5 days) to allow employees to request half-day leaves. This includes morning-only or afternoon-only leave options, with proper validation to ensure leaves are requested in 0.5-day increments.

## Changes Made

### Frontend (LeaveRequestForm.js)

#### 1. **Half-Day Type State**
```javascript
const [halfDayType, setHalfDayType] = useState('full'); // 'full', 'morning', 'afternoon'
```

#### 2. **Enhanced numberOfDays Calculation**
- Updated useEffect to support half-day adjustments
- Same-day leave with morning/afternoon selected: 0.5 days
- Multi-day leave with half-day: base days - 0.5
- Full-day leaves: calculated normally

#### 3. **Half-Day Toggle UI**
Added three buttons to select leave duration type:
- **Full Day**: Complete day off
- **Morning Only**: 0.5 days (first part of day)
- **Afternoon Only**: 0.5 days (second part of day)

Buttons appear after date range is selected and show visual selection state.

#### 4. **Validation for 0.5 Increments**
```javascript
if (numberOfDays > 0) {
  const isValidIncrement = numberOfDays % 0.5 === 0;
  if (!isValidIncrement) {
    newErrors.numberOfDays = 'Leave must be in 0.5 day increments (e.g., 1, 1.5, 2, 2.5)';
  }
}
```

#### 5. **Payload Update**
Extended form submission payload to include:
```javascript
numberOfDays: numberOfDays,
halfDayType: halfDayType !== 'full' ? halfDayType : undefined,
```

#### 6. **Form Reset**
Added halfDayType reset when form is cleared after successful submission.

### Backend (unifiedLeaveController.js)

#### 1. **numberOfDays Validation in createLeaveRequest**
```javascript
const { numberOfDays: submitttedDays, halfDayType } = req.body;

let numberOfDays;
if (submitttedDays && submitttedDays > 0) {
  // Validate that numberOfDays is in 0.5 increments
  if (submitttedDays % 0.5 !== 0) {
    return res.status(400).json({
      success: false,
      message: 'Leave days must be in 0.5 increments (e.g., 1, 1.5, 2, 2.5 days)'
    });
  }
  numberOfDays = submitttedDays;
} else {
  // Fallback calculation
  const diffTime = Math.abs(end - start);
  numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}
```

#### 2. **Validation Rules**
- Accepts frontend-calculated numberOfDays from form submission
- Validates that numberOfDays is a multiple of 0.5
- Returns 400 error if validation fails
- Provides fallback calculation if numberOfDays not provided

## Examples

### Example 1: Single Day Half-Day Leave
- **Start Date**: March 15, 2024
- **End Date**: March 15, 2024 (same day)
- **Leave Type**: Morning Only
- **Result**: 0.5 days

### Example 2: Multi-Day Leave with Half-Day
- **Start Date**: March 15, 2024
- **End Date**: March 18, 2024 (4 calendar days)
- **Leave Type**: Morning Only
- **Calculation**: 4 - 0.5 = 3.5 days
- **Result**: 3.5 days

### Example 3: Full Week Leave
- **Start Date**: March 18, 2024
- **End Date**: March 22, 2024 (5 calendar days)
- **Leave Type**: Full Day
- **Result**: 5 days

## Validation Rules

### Frontend Validation
- ✅ numberOfDays must be a multiple of 0.5
- ✅ Invalid increments display error: "Leave must be in 0.5 day increments"
- ✅ Half-day options only appear after both dates are selected

### Backend Validation
- ✅ numberOfDays submitted in payload must be 0.5-increment multiple
- ✅ Returns 400 Bad Request if validation fails
- ✅ Fallback calculation available if numberOfDays not provided

## Schema Compatibility

The implementation works with existing Mongoose schemas:
- **LeaveRequest.numberOfDays**: Type Number (supports decimals)
- **LeaveRecord.dayDeduction**: Type Number (supports decimals)
- **AnnualLeaveBalance.usedDays**: Type Number (supports decimals)

No schema changes required as all number fields allow decimal values.

## Database Impact

Existing leave records are unaffected:
- Old integer numberOfDays values (1, 2, 3, etc.) remain valid
- New decimal values (1.5, 2.5, 3.5, etc.) now supported
- No migration needed; backward compatible

## Calculation Examples

### Same-Day Scenarios
| Start | End | Full Day | Morning | Afternoon |
|-------|-----|----------|---------|-----------|
| Mar 15 | Mar 15 | 1.0 | 0.5 | 0.5 |

### Multi-Day Scenarios (Example: 4 calendar days)
| Duration | Full Day | Morning | Afternoon |
|----------|----------|---------|-----------|
| 4 days | 4.0 | 3.5 | 3.5 |
| 5 days | 5.0 | 4.5 | 4.5 |

## Testing Checklist

- [ ] Submit single-day morning leave (0.5 days)
- [ ] Submit single-day afternoon leave (0.5 days)
- [ ] Submit 3-day leave ending with afternoon (2.5 days)
- [ ] Submit 5-day leave starting with morning (4.5 days)
- [ ] Try invalid increment like 0.3 days → should fail
- [ ] Verify balance deductions are correct (0.5 increments)
- [ ] Approve/reject half-day leaves
- [ ] Check calendar view shows correct duration

## Error Messages

| Scenario | Error Message |
|----------|---------------|
| Invalid increment (e.g., 0.3 days) | "Leave must be in 0.5 day increments (e.g., 1, 1.5, 2, 2.5 days)" |
| Same error from backend | "Leave days must be in 0.5 increments (e.g., 1, 1.5, 2, 2.5 days)" |

## Future Enhancements

1. **UI Improvements**
   - Visual indicator for morning/afternoon times
   - Calendar highlighting for half-day leaves
   - Color coding in approval dashboard

2. **Reporting**
   - Half-day breakdown in balance reports
   - Metrics on half-day usage patterns

3. **Policy Settings**
   - Configure which leave types allow half-days
   - Set maximum half-days per month/year
   - Enforce full-day requirements for certain leave types

## Files Modified

1. **frontend/src/components/LeaveRequestForm.js**
   - Added halfDayType state
   - Enhanced numberOfDays calculation with half-day logic
   - Added validation for 0.5 increments
   - Added toggle buttons for duration selection
   - Updated form submission payload

2. **backend/controllers/unifiedLeaveController.js**
   - Added numberOfDays validation (0.5 increments)
   - Added fallback calculation
   - Added logging for half-day requests

## Summary

The implementation successfully adds half-day leave support with:
- ✅ Flexible decimal day calculations
- ✅ User-friendly toggle buttons for duration selection
- ✅ Robust validation on frontend and backend
- ✅ Backward compatibility with existing leave records
- ✅ No schema changes required
- ✅ Clear error messages for invalid inputs
