# Repository Pattern - IQueryable vs IEnumerable Usage Guide

## Overview
The repository pattern has been optimized to use `IQueryable<T>` for deferred execution and `IEnumerable<T>` for materialized results.

## Key Benefits

### IQueryable Advantages:
- **Deferred Execution**: Queries are built but not executed until materialized
- **Query Composition**: Allows chaining filters, sorting, and pagination
- **Database-Level Operations**: Filters and operations are translated to SQL
- **Better Performance**: Only retrieves what you need from the database

### IEnumerable Advantages:
- **Materialized Results**: Data is already loaded into memory
- **In-Memory Operations**: Useful for LINQ operations after data retrieval
- **Simpler for Small Datasets**: No need for query composition

## Usage Examples

### 1. Using IQueryable for Query Composition

```csharp
// In your service or controller
public async Task<IEnumerable<Patient>> GetActivePatients(int pageNumber, int pageSize)
{
    var query = _unitOfWork.Patients.GetAll() // Returns IQueryable
        .Where(p => p.IsActive)
        .OrderBy(p => p.LastName)
        .Skip((pageNumber - 1) * pageSize)
        .Take(pageSize);
    
    return await query.ToListAsync(); // Execute and materialize
}
```

### 2. Using IEnumerable for Immediate Results

```csharp
public async Task<IEnumerable<Patient>> GetAllPatients()
{
    // Immediately executes query and returns materialized list
    return await _unitOfWork.Patients.GetAllAsync();
}
```

### 3. Complex Queries with Find

```csharp
public async Task<IEnumerable<Appointment>> GetUpcomingAppointments(DateTime fromDate)
{
    var query = _unitOfWork.Appointments.Find(a => a.AppointmentDate >= fromDate)
        .Include(a => a.Patient)
        .Include(a => a.Dentist)
        .OrderBy(a => a.AppointmentDate);
    
    return await query.ToListAsync();
}
```

### 4. Using Pagination Extension

```csharp
using DentalInformationSystem.Repositories.Extensions;

public async Task<(List<Patient> Items, int TotalCount)> GetPatientsPaginated(
    int pageNumber, 
    int pageSize)
{
    var query = _unitOfWork.Patients.GetAll()
        .Where(p => p.IsActive)
        .OrderBy(p => p.LastName);
    
    return await query.ToPaginatedListAsync(pageNumber, pageSize);
}
```

### 5. Checking Existence Without Loading Data

```csharp
public async Task<bool> PatientExists(string email)
{
    return await _unitOfWork.Patients.AnyAsync(p => p.Email == email);
}
```

### 6. Getting Count Efficiently

```csharp
public async Task<int> GetActivePatientCount()
{
    return await _unitOfWork.Patients.CountAsync(p => p.IsActive);
}
```

### 7. Using AsNoTracking for Read-Only Queries

```csharp
// Already implemented in GetAll() and Find() methods
// This improves performance for read-only operations
var patients = _unitOfWork.Patients.GetAll() // Uses AsNoTracking internally
    .Where(p => p.City == "New York");
```

## Best Practices

### Use IQueryable When:
- You need to build complex queries dynamically
- Implementing pagination, filtering, or sorting
- Working with large datasets
- Want to defer execution until needed
- Need to include related entities with `.Include()`

### Use IEnumerable When:
- You need all data immediately
- Working with small datasets
- Performing in-memory operations
- Results are already filtered at the database level

### Performance Tips:
1. **Always use AsNoTracking** for read-only operations (already implemented)
2. **Project to DTOs** early in the query to reduce data transfer
3. **Use pagination** for large result sets
4. **Avoid multiple enumerations** - materialize once if reusing results
5. **Use `AnyAsync`** instead of `CountAsync() > 0`

## Complete Controller Example

```csharp
using DentalInformationSystem.Repositories.Interfaces;
using DentalInformationSystem.Repositories.Extensions;
using Microsoft.AspNetCore.Mvc;

namespace DentalInformationSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PatientsController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;

    public PatientsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 10,
        [FromQuery] string? sortBy = "LastName")
    {
        var query = _unitOfWork.Patients.GetAll()
            .Where(p => p.IsActive)
            .OrderByProperty(sortBy ?? "LastName");

        var result = await query.ToPaginatedListAsync(page, pageSize);

        return Ok(new
        {
            items = result.Items,
            totalCount = result.TotalCount,
            pageNumber = page,
            pageSize = pageSize
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var patient = await _unitOfWork.Patients.GetByIdAsync(id);
        
        if (patient == null)
            return NotFound();

        return Ok(patient);
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string term)
    {
        var patients = await _unitOfWork.Patients
            .Find(p => p.FirstName.Contains(term) || p.LastName.Contains(term))
            .ToListAsync();

        return Ok(patients);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Patient patient)
    {
        // Check if email already exists
        if (await _unitOfWork.Patients.AnyAsync(p => p.Email == patient.Email))
            return BadRequest("Email already exists");

        await _unitOfWork.Patients.AddAsync(patient);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = patient.Id }, patient);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Patient patient)
    {
        var existing = await _unitOfWork.Patients.GetByIdAsync(id);
        
        if (existing == null)
            return NotFound();

        // Update properties
        // existing.FirstName = patient.FirstName;
        // ... etc

        _unitOfWork.Patients.Update(existing);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var patient = await _unitOfWork.Patients.GetByIdAsync(id);
        
        if (patient == null)
            return NotFound();

        _unitOfWork.Patients.Remove(patient);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }
}
```
