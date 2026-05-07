# Performance API

Endpoints (base: `/api/performance`)

Notes
- `POST /notes` - Create performance note. Body: `{ employeeId, content, visibility }` (visibility: 'hr_manager_only'|'private'). Requires admin/hr/manager.
- `GET /notes/:employeeId` - List notes for employee. Requires admin/hr/manager or employee's manager.
- `DELETE /notes/:id` - Delete note. Admin or creator.

Disciplinary
- `POST /disciplinary` - Create disciplinary record. Body: `{ employeeId, type, reason, outcome, attachments }`. Types: `verbal|written|final`. Requires admin or hr.
- `GET /disciplinary/:employeeId` - List disciplinary records for employee. Viewing restricted to admin/hr/manager/employee as per rules.

Improvement Plans (PIP)
- `POST /pips` - Create PIP. Body: `{ employeeId, startDate, endDate?, goals? }`. `goals` is an array of `{ description, targetDate? }`.
- `GET /pips/:employeeId` - List PIPs for employee.

Notes
- Uses session-based authentication and the same `authenticateSession` middleware as other routes.
- Validation: body fields are validated (required fields, lengths, date formats).

Examples

Create a note (curl):

```bash
curl -X POST -H "Content-Type: application/json" -b cookie.txt -d '{"employeeId":"<id>","content":"Handled client escalation well"}' http://localhost:5004/api/performance/notes
```

Replace `-b cookie.txt` with your session cookie or use Authorization header if configured.
