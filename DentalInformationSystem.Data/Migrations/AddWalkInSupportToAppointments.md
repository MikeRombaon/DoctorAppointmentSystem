# Walk-In Appointment Support Migration

## Database Changes Required

### 1. Add IsWalkIn Column to Appointments Table

```sql
-- Add IsWalkIn column to Appointments table
ALTER TABLE Appointments
ADD IsWalkIn BIT NOT NULL DEFAULT 0;

-- Create index for faster walk-in queries
CREATE INDEX IX_Appointments_IsWalkIn 
ON Appointments(IsWalkIn)
WHERE IsWalkIn = 1;
```

### 2. Update AppointmentStatus Enum

The `AppointmentStatus` enum now includes:
- WalkIn = 9 (for walk-in appointments)

### 3. Migration Command

Run this SQL script in your database or use Entity Framework Core migrations:

```bash
# If using EF Core migrations
dotnet ef migrations add AddWalkInSupportToAppointments --project DentalInformationSystem.Data --startup-project DentalInformationSystem.API

# Apply migration
dotnet ef database update --project DentalInformationSystem.Data --startup-project DentalInformationSystem.API
```

## Rollback

```sql
-- To rollback (if needed)
DROP INDEX IF EXISTS IX_Appointments_IsWalkIn ON Appointments;
ALTER TABLE Appointments DROP COLUMN IsWalkIn;
```

## Notes
- All existing appointments will have `IsWalkIn = false` by default
- Walk-in appointments will be marked with `IsWalkIn = true` and `Status = WalkIn (9)`
- Index created on `IsWalkIn` column for performance optimization when querying walk-in appointments
