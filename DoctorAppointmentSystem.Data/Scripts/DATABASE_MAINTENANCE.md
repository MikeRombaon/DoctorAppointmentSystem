# ?? **DATABASE MAINTENANCE SCRIPTS**
## **For Local Deployment (SQL Server LocalDB)**

---

## ?? **PERFORMANCE MONITORING**

### **Check Database Size**
```sql
-- Check total database size
SELECT 
    DB_NAME() AS DatabaseName,
    SUM(size * 8 / 1024.0) AS SizeMB
FROM sys.database_files
GROUP BY type_desc;

-- Check table sizes
SELECT 
    t.NAME AS TableName,
    s.Name AS SchemaName,
    p.rows AS RowCounts,
    SUM(a.total_pages) * 8 AS TotalSpaceKB,
    SUM(a.used_pages) * 8 AS UsedSpaceKB,
    (SUM(a.total_pages) - SUM(a.used_pages)) * 8 AS UnusedSpaceKB
FROM sys.tables t
INNER JOIN sys.indexes i ON t.OBJECT_ID = i.object_id
INNER JOIN sys.partitions p ON i.object_id = p.OBJECT_ID AND i.index_id = p.index_id
INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
LEFT OUTER JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE t.is_ms_shipped = 0
GROUP BY t.Name, s.Name, p.Rows
ORDER BY SUM(a.total_pages) DESC;
```

---

## ?? **DATA CLEANUP**

### **Archive Old Appointments (Older than 2 years)**
```sql
-- Recommended: Run monthly
BEGIN TRANSACTION;

-- Create archive table if not exists
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ArchivedAppointments' AND xtype='U')
BEGIN
    SELECT * INTO ArchivedAppointments 
    FROM Appointments 
    WHERE 1=0; -- Create empty table with same structure
END

-- Move old appointments to archive
INSERT INTO ArchivedAppointments
SELECT * FROM Appointments
WHERE AppointmentDate < DATEADD(YEAR, -2, GETDATE());

-- Delete archived records from main table
DELETE FROM Appointments
WHERE AppointmentDate < DATEADD(YEAR, -2, GETDATE());

COMMIT TRANSACTION;

-- Verify
SELECT 
    'Active' AS Type, COUNT(*) AS Count FROM Appointments
UNION ALL
SELECT 
    'Archived' AS Type, COUNT(*) AS Count FROM ArchivedAppointments;
```

### **Clean Up Cancelled Appointments (Older than 1 year)**
```sql
-- Delete cancelled appointments older than 1 year
DELETE FROM Appointments
WHERE Status = 4 -- Cancelled
  AND AppointmentDate < DATEADD(YEAR, -1, GETDATE());

-- Check result
SELECT 
    Status, 
    COUNT(*) AS Count,
    MIN(AppointmentDate) AS OldestDate,
    MAX(AppointmentDate) AS NewestDate
FROM Appointments
GROUP BY Status;
```

---

## ?? **INDEX MAINTENANCE**

### **Rebuild Fragmented Indexes**
```sql
-- Check index fragmentation
SELECT 
    OBJECT_NAME(ips.object_id) AS TableName,
    i.name AS IndexName,
    ips.index_type_desc,
    ips.avg_fragmentation_in_percent,
    ips.page_count
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'DETAILED') ips
JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE ips.avg_fragmentation_in_percent > 10
  AND ips.page_count > 100
ORDER BY ips.avg_fragmentation_in_percent DESC;

-- Rebuild highly fragmented indexes (>30%)
DECLARE @TableName NVARCHAR(128);
DECLARE @IndexName NVARCHAR(128);
DECLARE @SQL NVARCHAR(MAX);

DECLARE index_cursor CURSOR FOR
SELECT 
    OBJECT_NAME(ips.object_id),
    i.name
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'DETAILED') ips
JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE ips.avg_fragmentation_in_percent > 30
  AND i.name IS NOT NULL;

OPEN index_cursor;
FETCH NEXT FROM index_cursor INTO @TableName, @IndexName;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @SQL = 'ALTER INDEX ' + QUOTENAME(@IndexName) + 
               ' ON ' + QUOTENAME(@TableName) + ' REBUILD;';
    PRINT @SQL;
    EXEC sp_executesql @SQL;
    
    FETCH NEXT FROM index_cursor INTO @TableName, @IndexName;
END

CLOSE index_cursor;
DEALLOCATE index_cursor;
```

### **Update Statistics**
```sql
-- Update statistics for all tables
EXEC sp_MSforeachtable 'UPDATE STATISTICS ? WITH FULLSCAN;';

-- Check last statistics update
SELECT 
    OBJECT_NAME(object_id) AS TableName,
    name AS IndexName,
    STATS_DATE(object_id, index_id) AS LastUpdated
FROM sys.indexes
WHERE STATS_DATE(object_id, index_id) IS NOT NULL
ORDER BY STATS_DATE(object_id, index_id);
```

---

## ?? **BACKUP & RESTORE**

### **Full Backup**
```sql
-- Full database backup
BACKUP DATABASE DentalClinicDb
TO DISK = 'C:\Backups\DentalClinic_Full_' + 
    CONVERT(VARCHAR(8), GETDATE(), 112) + '_' + 
    REPLACE(CONVERT(VARCHAR(8), GETDATE(), 108), ':', '') + '.bak'
WITH FORMAT, COMPRESSION, STATS = 10;

-- Verify backup
RESTORE VERIFYONLY 
FROM DISK = 'C:\Backups\DentalClinic_Full_YYYYMMDD_HHMMSS.bak';
```

### **Differential Backup (Daily)**
```sql
-- Differential backup (changes since last full backup)
BACKUP DATABASE DentalClinicDb
TO DISK = 'C:\Backups\DentalClinic_Diff_' + 
    CONVERT(VARCHAR(8), GETDATE(), 112) + '.bak'
WITH DIFFERENTIAL, COMPRESSION, STATS = 10;
```

### **Restore Database**
```sql
-- Restore from full backup
USE master;
GO

ALTER DATABASE DentalClinicDb SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
GO

RESTORE DATABASE DentalClinicDb
FROM DISK = 'C:\Backups\DentalClinic_Full_YYYYMMDD_HHMMSS.bak'
WITH REPLACE, RECOVERY;

ALTER DATABASE DentalClinicDb SET MULTI_USER;
GO
```

---

## ?? **QUERY PERFORMANCE**

### **Find Slow Queries**
```sql
-- Top 10 slowest queries
SELECT TOP 10
    qs.execution_count,
    qs.total_worker_time / qs.execution_count AS avg_cpu_time,
    qs.total_elapsed_time / qs.execution_count AS avg_elapsed_time,
    qs.total_logical_reads / qs.execution_count AS avg_logical_reads,
    SUBSTRING(qt.text, (qs.statement_start_offset/2)+1,
        ((CASE qs.statement_end_offset
            WHEN -1 THEN DATALENGTH(qt.text)
            ELSE qs.statement_end_offset
        END - qs.statement_start_offset)/2) + 1) AS query_text
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) qt
ORDER BY avg_elapsed_time DESC;
```

### **Find Missing Indexes**
```sql
-- Suggested missing indexes
SELECT 
    migs.avg_total_user_cost * (migs.avg_user_impact / 100.0) * (migs.user_seeks + migs.user_scans) AS improvement_measure,
    'CREATE INDEX IX_' + OBJECT_NAME(mid.object_id) + '_' + 
        REPLACE(REPLACE(REPLACE(ISNULL(mid.equality_columns,'') + 
        ISNULL(mid.inequality_columns, ''), '[', ''), ']', ''), ', ', '_') +
        ' ON ' + OBJECT_NAME(mid.object_id) + 
        ' (' + ISNULL(mid.equality_columns, '') + 
        CASE WHEN mid.equality_columns IS NOT NULL AND mid.inequality_columns IS NOT NULL THEN ',' ELSE '' END +
        ISNULL(mid.inequality_columns, '') + ')' +
        ISNULL(' INCLUDE (' + mid.included_columns + ')', '') AS create_index_statement,
    migs.avg_user_impact,
    migs.user_seeks,
    migs.user_scans
FROM sys.dm_db_missing_index_groups mig
INNER JOIN sys.dm_db_missing_index_group_stats migs ON migs.group_handle = mig.index_group_handle
INNER JOIN sys.dm_db_missing_index_details mid ON mig.index_handle = mid.index_handle
WHERE migs.avg_total_user_cost * (migs.avg_user_impact / 100.0) * (migs.user_seeks + migs.user_scans) > 10
ORDER BY improvement_measure DESC;
```

---

## ?? **DATA INTEGRITY CHECKS**

### **Find Orphaned Records**
```sql
-- Appointments without patients
SELECT * FROM Appointments a
WHERE NOT EXISTS (SELECT 1 FROM Patients p WHERE p.Id = a.PatientId);

-- Treatments without procedures
SELECT * FROM Treatments t
WHERE NOT EXISTS (SELECT 1 FROM Procedures p WHERE p.Id = t.ProcedureId);

-- Invoices with incorrect balance
SELECT * FROM Invoices
WHERE BalanceAmount != (TotalAmount - PaidAmount);

-- Payments exceeding invoice total
SELECT 
    i.Id AS InvoiceId,
    i.TotalAmount,
    SUM(p.Amount) AS TotalPaid
FROM Invoices i
INNER JOIN Payments p ON i.Id = p.InvoiceId
GROUP BY i.Id, i.TotalAmount
HAVING SUM(p.Amount) > i.TotalAmount;
```

### **Consistency Checks**
```sql
-- Check for future appointments
SELECT * FROM Appointments
WHERE AppointmentDate > DATEADD(YEAR, 1, GETDATE());

-- Check for invalid email addresses
SELECT * FROM Patients
WHERE Email NOT LIKE '%@%.%';

-- Check for negative inventory
SELECT * FROM InventoryItems
WHERE QuantityOnHand < 0;

-- Check for invalid treatment costs
SELECT * FROM Treatments
WHERE Cost < 0 OR Cost > 10000; -- Adjust max as needed
```

---

## ?? **TESTING QUERIES**

### **Performance Baseline**
```sql
-- Measure query performance
SET STATISTICS TIME ON;
SET STATISTICS IO ON;

-- Your query here
SELECT * FROM Appointments 
WHERE AppointmentDate >= GETDATE() 
  AND Status IN (0, 1);

SET STATISTICS TIME OFF;
SET STATISTICS IO OFF;
```

---

## ?? **MAINTENANCE SCHEDULE**

### **Daily Tasks**
```sql
-- 1. Backup (automated via Task Scheduler)
-- 2. Check for errors in log
-- 3. Verify disk space

SELECT 
    'Database Size' AS Metric,
    SUM(size * 8 / 1024.0) AS ValueMB
FROM sys.database_files
UNION ALL
SELECT 
    'Disk Free Space',
    CAST(available_bytes / 1024.0 / 1024.0 AS INT)
FROM sys.dm_os_volume_stats(DB_ID(), 1);
```

### **Weekly Tasks**
```sql
-- 1. Update statistics
EXEC sp_MSforeachtable 'UPDATE STATISTICS ? WITH FULLSCAN;';

-- 2. Check index fragmentation (shown above)

-- 3. Review slow queries (shown above)
```

### **Monthly Tasks**
```sql
-- 1. Archive old data (shown above)
-- 2. Rebuild highly fragmented indexes
-- 3. Full database backup (keep 3 months)
-- 4. Data integrity checks (shown above)
```

---

## ?? **EMERGENCY RECOVERY**

### **Database Corruption Check**
```sql
DBCC CHECKDB (DentalClinicDb) WITH NO_INFOMSGS;
```

### **Shrink Database (Use sparingly!)**
```sql
-- Only run if truly necessary (after archiving)
DBCC SHRINKDATABASE (DentalClinicDb, 10); -- 10% free space
```

### **Kill All Connections (Emergency)**
```sql
USE master;
GO

DECLARE @SQL VARCHAR(MAX) = '';
SELECT @SQL = @SQL + 'KILL ' + CAST(session_id AS VARCHAR(10)) + '; '
FROM sys.dm_exec_sessions
WHERE database_id = DB_ID('DentalClinicDb')
  AND session_id <> @@SPID;

EXEC(@SQL);
```

---

## ?? **MONITORING DASHBOARD**

### **System Health Check**
```sql
-- Comprehensive health check
SELECT 
    'Total Patients' AS Metric, 
    COUNT(*) AS Value 
FROM Patients WHERE IsActive = 1
UNION ALL
SELECT 
    'Appointments Today', 
    COUNT(*) 
FROM Appointments WHERE CAST(AppointmentDate AS DATE) = CAST(GETDATE() AS DATE)
UNION ALL
SELECT 
    'Low Stock Items', 
    COUNT(*) 
FROM InventoryItems WHERE IsActive = 1 AND QuantityOnHand <= MinimumQuantity
UNION ALL
SELECT 
    'Pending Invoices', 
    COUNT(*) 
FROM Invoices WHERE Status IN (0, 1)
UNION ALL
SELECT 
    'Database Size MB', 
    SUM(size * 8 / 1024)
FROM sys.database_files;
```

---

## ? **BEST PRACTICES**

### **For Local Deployment:**
1. **Backup before maintenance** - Always!
2. **Test on copy first** - Clone database for testing
3. **Schedule during off-hours** - 2 AM is ideal
4. **Monitor performance** - Before and after comparisons
5. **Keep 3 months of backups** - Rotate older ones
6. **Document changes** - Keep a maintenance log

### **Automation (Windows Task Scheduler):**
```powershell
# Create scheduled task for daily backup
# Run this in PowerShell as Administrator

$action = New-ScheduledTaskAction -Execute 'sqlcmd' -Argument '-S (localdb)\MSSQLLocalDB -Q "BACKUP DATABASE DentalClinicDb TO DISK = ''C:\Backups\DentalClinic_Daily.bak'' WITH FORMAT, COMPRESSION"'

$trigger = New-ScheduledTaskTrigger -Daily -At 2AM

Register-ScheduledTask -TaskName "DentalClinicBackup" -Action $action -Trigger $trigger -Description "Daily database backup"
```

---

## ?? **MAINTENANCE LOG**

Keep track of all maintenance activities:

```sql
-- Create maintenance log table
CREATE TABLE MaintenanceLog (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    MaintenanceDate DATETIME2 DEFAULT GETDATE(),
    MaintenanceType VARCHAR(50), -- 'Backup', 'Index Rebuild', 'Archive', etc.
    Details NVARCHAR(MAX),
    DurationSeconds INT,
    Status VARCHAR(20), -- 'Success', 'Failed'
    ExecutedBy VARCHAR(100)
);

-- Log maintenance
INSERT INTO MaintenanceLog (MaintenanceType, Details, DurationSeconds, Status, ExecutedBy)
VALUES ('Full Backup', 'Automated daily backup', 45, 'Success', SYSTEM_USER);
```

---

**Last Updated:** January 2025  
**For:** Dental Information System Local Deployment  
**Tested On:** SQL Server LocalDB 2022+
