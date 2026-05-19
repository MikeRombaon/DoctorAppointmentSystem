using System.ComponentModel.DataAnnotations;

namespace DentalInformationSystem.API.DTOs;

// Patient DTOs
public class CreatePatientDto
{
    [Required]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    public DateTime DateOfBirth { get; set; }

    [Required]
    public int Gender { get; set; }

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [Phone]
    public string PhoneNumber { get; set; } = string.Empty;

    public string? AlternatePhoneNumber { get; set; }

    [Required]
    public string Address { get; set; } = string.Empty;

    [Required]
    public string City { get; set; } = string.Empty;

    public string? State { get; set; }

    [Required]
    public string PostalCode { get; set; } = string.Empty;

    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string? InsuranceProvider { get; set; }
    public string? InsurancePolicyNumber { get; set; }
    public string? BloodType { get; set; }
    public string? Allergies { get; set; }
    public string? MedicalHistory { get; set; }
    public string? Notes { get; set; }
}

// Appointment DTOs
public class CreateAppointmentDto
{
    [Required]
    public int PatientId { get; set; }

    [Required]
    public int DentistId { get; set; }

    [Required]
    public DateTime AppointmentDate { get; set; }

    [Required]
    public TimeSpan StartTime { get; set; }

    [Required]
    public TimeSpan EndTime { get; set; }

    [Required]
    [MaxLength(500)]
    public string Purpose { get; set; } = string.Empty;

    public string? Notes { get; set; }
}

public class UpdateAppointmentStatusDto
{
    [Required]
    public int Status { get; set; }

    public string? CancellationReason { get; set; }
}

// Treatment DTOs
public class CreateTreatmentDto
{
    [Required]
    public int AppointmentId { get; set; }

    public int? TreatmentPlanId { get; set; }

    [Required]
    public int ProcedureId { get; set; }

    public int? ToothPosition { get; set; }

    public string? ToothSurface { get; set; }

    [Range(0, double.MaxValue)]
    public decimal Cost { get; set; }

    public string? Notes { get; set; }
    public string? Diagnosis { get; set; }
}

// Inventory DTOs
public class CreateInventoryItemDto
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    [MaxLength(50)]
    public string SKU { get; set; } = string.Empty;

    [Required]
    public int Category { get; set; }

    public string? Manufacturer { get; set; }

    [Required]
    [Range(0, int.MaxValue)]
    public int QuantityOnHand { get; set; }

    [Required]
    [Range(0, int.MaxValue)]
    public int MinimumQuantity { get; set; }

    [Required]
    [Range(0, int.MaxValue)]
    public int ReorderQuantity { get; set; }

    [Required]
    public string Unit { get; set; } = string.Empty;

    [Required]
    [Range(0, double.MaxValue)]
    public decimal UnitCost { get; set; }

    public decimal? SellingPrice { get; set; }
    public DateTime? ExpirationDate { get; set; }
    public string? Location { get; set; }
}

public class CreateInventoryTransactionDto
{
    [Required]
    public int InventoryItemId { get; set; }

    [Required]
    public int TransactionType { get; set; }

    [Required]
    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    [Required]
    [Range(0, double.MaxValue)]
    public decimal UnitCost { get; set; }

    public string? SupplierName { get; set; }
    public string? InvoiceNumber { get; set; }
    public string? Notes { get; set; }
    public string? Reason { get; set; }
}

// Invoice DTOs
public class CreateInvoiceDto
{
    [Required]
    public int PatientId { get; set; }

    public DateTime? DueDate { get; set; }

    [Required]
    [Range(0, double.MaxValue)]
    public decimal SubTotal { get; set; }

    [Range(0, double.MaxValue)]
    public decimal TaxAmount { get; set; }

    [Range(0, double.MaxValue)]
    public decimal Discount { get; set; }

    public string? Notes { get; set; }

    public List<CreateInvoiceItemDto> Items { get; set; } = new();
}

public class CreateInvoiceItemDto
{
    public int? TreatmentId { get; set; }

    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    [Required]
    [Range(0, double.MaxValue)]
    public decimal UnitPrice { get; set; }

    [Range(0, double.MaxValue)]
    public decimal Discount { get; set; }
}

public class CreatePaymentDto
{
    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    [Required]
    public int PaymentMethod { get; set; }

    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }
}

// Procedure DTOs
public class CreateProcedureDto
{
    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [Range(0, double.MaxValue)]
    public decimal DefaultCost { get; set; }

    [Required]
    [Range(1, int.MaxValue)]
    public int EstimatedDurationMinutes { get; set; }
}

// Supplier DTOs
public class CreateSupplierDto
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string ContactPerson { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [Phone]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required]
    public string Address { get; set; } = string.Empty;

    [Required]
    public string City { get; set; } = string.Empty;

    public string? State { get; set; }

    [Required]
    public string PostalCode { get; set; } = string.Empty;

    public string? TaxId { get; set; }
    public string? Notes { get; set; }
}
