using System.Security.Cryptography;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Domain.Enums;

namespace DoctorAppointmentSystem.Data.Seeding;

public static class DataSeeder
{
    private static string HashPassword(string password)
    {
        using var pbkdf2 = new Rfc2898DeriveBytes(password, 16, 10000, HashAlgorithmName.SHA256);
        byte[] hash = pbkdf2.GetBytes(32);
        byte[] salt = pbkdf2.Salt;
        byte[] hashBytes = new byte[48];
        Array.Copy(salt, 0, hashBytes, 0, 16);
        Array.Copy(hash, 0, hashBytes, 16, 32);
        return Convert.ToBase64String(hashBytes);
    }

    public static void SeedData(ApplicationDbContext context)
    {
        // ── 1. Seed Default Tenant ──────────────────────────────────────────
        if (!context.Tenants.Any())
        {
            context.Tenants.Add(new Tenant
            {
                Name         = "Doctor Appointment System — Demo Clinic",
                Slug         = "demo-clinic",
                ContactEmail = "admin@doctorsappointment.com",
                ContactPhone = "555-0100",
                Address      = "1 Medical Center Drive",
                City         = "Springfield",
                Country      = "US",
                IsActive     = true,
                CreatedDate  = DateTime.UtcNow
            });
            context.SaveChanges();
        }

        var tenant = context.Tenants.First();
        var tid    = tenant.Id;

        // ── 2. Seed Users (Staff) ───────────────────────────────────────────
        if (!context.Users.Any())
        {
            var users = new List<User>
            {
                // Super Admin — cross-tenant (TenantId = null)
                new User { FirstName = "Super",      LastName = "Admin",   Email = "superadmin@doctorsappointment.com",       PasswordHash = HashPassword("D3v0p$0808"),    PhoneNumber = "555-0099", Role = UserRole.SuperAdmin,    TenantId = null, IsActive = true },

                // Admin
                new User { FirstName = "Admin",      LastName = "User",    Email = "admin@doctorsappointment.com",            PasswordHash = HashPassword("Admin@1234"), PhoneNumber = "555-0100", Role = UserRole.Admin,         TenantId = tid,  IsActive = true },
                new User { FirstName = "Patricia",   LastName = "Reyes",   Email = "patricia.reyes@doctorsappointment.com",   PasswordHash = HashPassword("Admin@1234"), PhoneNumber = "555-0105", Role = UserRole.Admin,         TenantId = tid,  IsActive = true },

                // Doctors (ClinicalStaff)
                new User { FirstName = "Dr. James",  LastName = "Harper",  Email = "james.harper@doctorsappointment.com",     PasswordHash = HashPassword("Admin@1234"), PhoneNumber = "555-0101", Role = UserRole.ClinicalStaff, Specialization = "General Practice",  LicenseNumber = "MD-10021", TenantId = tid, IsActive = true },
                new User { FirstName = "Dr. Maria",  LastName = "Santos",  Email = "maria.santos@doctorsappointment.com",     PasswordHash = HashPassword("Admin@1234"), PhoneNumber = "555-0102", Role = UserRole.ClinicalStaff, Specialization = "Cardiology",        LicenseNumber = "MD-10022", TenantId = tid, IsActive = true },
                new User { FirstName = "Dr. Alan",   LastName = "Nguyen",  Email = "alan.nguyen@doctorsappointment.com",      PasswordHash = HashPassword("Admin@1234"), PhoneNumber = "555-0103", Role = UserRole.ClinicalStaff, Specialization = "Pediatrics",        LicenseNumber = "MD-10023", TenantId = tid, IsActive = true },
                new User { FirstName = "Dr. Rachel", LastName = "Kim",     Email = "rachel.kim@doctorsappointment.com",       PasswordHash = HashPassword("Admin@1234"), PhoneNumber = "555-0107", Role = UserRole.ClinicalStaff, Specialization = "Dermatology",       LicenseNumber = "MD-10024", TenantId = tid, IsActive = true },
                new User { FirstName = "Dr. Carlos", LastName = "Mendoza", Email = "carlos.mendoza@doctorsappointment.com",   PasswordHash = HashPassword("Admin@1234"), PhoneNumber = "555-0108", Role = UserRole.ClinicalStaff, Specialization = "Orthopedics",       LicenseNumber = "MD-10025", TenantId = tid, IsActive = true },

                // Support Staff
                new User { FirstName = "Emma",  LastName = "Davis",  Email = "emma.davis@doctorsappointment.com",  PasswordHash = HashPassword("Admin@1234"), PhoneNumber = "555-0104", Role = UserRole.SupportStaff, TenantId = tid, IsActive = true },
                new User { FirstName = "James", LastName = "Wilson", Email = "james.wilson@doctorsappointment.com",PasswordHash = HashPassword("Admin@1234"), PhoneNumber = "555-0106", Role = UserRole.SupportStaff, TenantId = tid, IsActive = true },
                new User { FirstName = "Sofia", LastName = "Torres", Email = "sofia.torres@doctorsappointment.com",PasswordHash = HashPassword("Admin@1234"), PhoneNumber = "555-0109", Role = UserRole.SupportStaff, TenantId = tid, IsActive = true },
            };
            context.Users.AddRange(users);
            context.SaveChanges();
        }

        // ── 3. Seed Procedures (global — no tenant) ─────────────────────────
        if (!context.Procedures.Any())
        {
            var procedures = new List<Procedure>
            {
                new Procedure { Code = "CON-001", Name = "General Consultation",       Description = "Initial or follow-up visit with a general practitioner",   DefaultCost = 80.00m,  EstimatedDurationMinutes = 30 },
                new Procedure { Code = "CON-002", Name = "Specialist Consultation",    Description = "Consultation with a specialist physician",                 DefaultCost = 150.00m, EstimatedDurationMinutes = 45 },
                new Procedure { Code = "LAB-001", Name = "Complete Blood Count (CBC)", Description = "Full blood panel — WBC, RBC, hemoglobin, platelets",       DefaultCost = 45.00m,  EstimatedDurationMinutes = 15 },
                new Procedure { Code = "LAB-002", Name = "Lipid Panel",               Description = "Cholesterol screening — LDL, HDL, triglycerides",          DefaultCost = 55.00m,  EstimatedDurationMinutes = 15 },
                new Procedure { Code = "LAB-003", Name = "Blood Glucose Test",        Description = "Fasting or random blood sugar level check",                DefaultCost = 30.00m,  EstimatedDurationMinutes = 10 },
                new Procedure { Code = "LAB-004", Name = "Urinalysis",               Description = "Urine sample analysis for infection or kidney function",    DefaultCost = 25.00m,  EstimatedDurationMinutes = 10 },
                new Procedure { Code = "IMG-001", Name = "Chest X-Ray",              Description = "Radiograph of the chest for cardiac and pulmonary review",  DefaultCost = 120.00m, EstimatedDurationMinutes = 20 },
                new Procedure { Code = "IMG-002", Name = "ECG / EKG",               Description = "12-lead electrocardiogram for heart rhythm evaluation",     DefaultCost = 95.00m,  EstimatedDurationMinutes = 20 },
                new Procedure { Code = "IMG-003", Name = "Ultrasound — Abdominal",  Description = "Abdominal organ imaging via ultrasound",                    DefaultCost = 200.00m, EstimatedDurationMinutes = 30 },
                new Procedure { Code = "PRX-001", Name = "Prescription Issuance",   Description = "Doctor writes and issues prescription for medication",      DefaultCost = 20.00m,  EstimatedDurationMinutes = 10 },
                new Procedure { Code = "VAC-001", Name = "Flu Vaccination",         Description = "Annual influenza vaccine administration",                   DefaultCost = 35.00m,  EstimatedDurationMinutes = 15 },
                new Procedure { Code = "VAC-002", Name = "COVID-19 Booster",        Description = "COVID-19 booster dose administration",                      DefaultCost = 0.00m,   EstimatedDurationMinutes = 15 },
                new Procedure { Code = "PHY-001", Name = "Annual Physical Exam",    Description = "Comprehensive annual wellness and preventive checkup",      DefaultCost = 175.00m, EstimatedDurationMinutes = 60 },
                new Procedure { Code = "PHY-002", Name = "Blood Pressure Monitoring",Description = "Routine BP measurement and review",                       DefaultCost = 15.00m,  EstimatedDurationMinutes = 10 },
                new Procedure { Code = "WND-001", Name = "Wound Dressing / Suturing",Description = "Minor wound cleaning, closure, and dressing",             DefaultCost = 90.00m,  EstimatedDurationMinutes = 30 },
            };
            context.Procedures.AddRange(procedures);
            context.SaveChanges();
        }

        // ── 4. Seed Inventory Items ─────────────────────────────────────────
        if (!context.InventoryItems.Any())
        {
            var inventoryItems = new List<InventoryItem>
            {
                new InventoryItem { TenantId = tid, Name = "Disposable Gloves (Box of 100)",   SKU = "GLV-001", Category = ItemCategory.ProtectiveEquipment, QuantityOnHand = 80,  MinimumQuantity = 20, ReorderQuantity = 40,  Unit = "box",     UnitCost = 14.00m, Manufacturer = "MedSupply Co." },
                new InventoryItem { TenantId = tid, Name = "Surgical Face Masks (Box of 50)",  SKU = "MSK-001", Category = ItemCategory.ProtectiveEquipment, QuantityOnHand = 60,  MinimumQuantity = 20, ReorderQuantity = 30,  Unit = "box",     UnitCost = 12.00m },
                new InventoryItem { TenantId = tid, Name = "Amoxicillin 500mg Capsules",       SKU = "MED-001", Category = ItemCategory.Medications,         QuantityOnHand = 200, MinimumQuantity = 50, ReorderQuantity = 100, Unit = "capsule", UnitCost = 0.35m,  Manufacturer = "PharmaCo" },
                new InventoryItem { TenantId = tid, Name = "Paracetamol 500mg Tablets",        SKU = "MED-002", Category = ItemCategory.Medications,         QuantityOnHand = 500, MinimumQuantity = 100,ReorderQuantity = 200, Unit = "tablet",  UnitCost = 0.10m },
                new InventoryItem { TenantId = tid, Name = "Ibuprofen 200mg Tablets",          SKU = "MED-003", Category = ItemCategory.Medications,         QuantityOnHand = 300, MinimumQuantity = 80, ReorderQuantity = 150, Unit = "tablet",  UnitCost = 0.12m },
                new InventoryItem { TenantId = tid, Name = "Metformin 500mg Tablets",          SKU = "MED-004", Category = ItemCategory.Medications,         QuantityOnHand = 250, MinimumQuantity = 60, ReorderQuantity = 120, Unit = "tablet",  UnitCost = 0.20m },
                new InventoryItem { TenantId = tid, Name = "Atorvastatin 20mg Tablets",        SKU = "MED-005", Category = ItemCategory.Medications,         QuantityOnHand = 180, MinimumQuantity = 50, ReorderQuantity = 100, Unit = "tablet",  UnitCost = 0.45m },
                new InventoryItem { TenantId = tid, Name = "Amlodipine 5mg Tablets",           SKU = "MED-006", Category = ItemCategory.Medications,         QuantityOnHand = 150, MinimumQuantity = 40, ReorderQuantity = 80,  Unit = "tablet",  UnitCost = 0.30m },
                new InventoryItem { TenantId = tid, Name = "Lidocaine Injection 2%",           SKU = "ANE-001", Category = ItemCategory.Anesthetics,         QuantityOnHand = 40,  MinimumQuantity = 10, ReorderQuantity = 20,  Unit = "vial",    UnitCost = 8.00m },
                new InventoryItem { TenantId = tid, Name = "Insulin (Rapid-Acting) 10mL",      SKU = "MED-007", Category = ItemCategory.Medications,         QuantityOnHand = 30,  MinimumQuantity = 10, ReorderQuantity = 20,  Unit = "vial",    UnitCost = 45.00m, Manufacturer = "NovaMed" },
                new InventoryItem { TenantId = tid, Name = "Blood Glucose Test Strips (50ct)", SKU = "LAB-001", Category = ItemCategory.DentalMaterials,     QuantityOnHand = 25,  MinimumQuantity = 10, ReorderQuantity = 15,  Unit = "box",     UnitCost = 22.00m },
                new InventoryItem { TenantId = tid, Name = "Sterile Gauze Pads (Pack)",        SKU = "CON-001", Category = ItemCategory.Consumables,         QuantityOnHand = 100, MinimumQuantity = 30, ReorderQuantity = 50,  Unit = "pack",    UnitCost = 6.50m },
                new InventoryItem { TenantId = tid, Name = "Adhesive Bandages (Box)",          SKU = "CON-002", Category = ItemCategory.Consumables,         QuantityOnHand = 75,  MinimumQuantity = 20, ReorderQuantity = 30,  Unit = "box",     UnitCost = 5.00m },
                new InventoryItem { TenantId = tid, Name = "Syringe 5mL (Pack of 10)",         SKU = "CON-003", Category = ItemCategory.Consumables,         QuantityOnHand = 120, MinimumQuantity = 40, ReorderQuantity = 60,  Unit = "pack",    UnitCost = 3.50m },
                new InventoryItem { TenantId = tid, Name = "Digital Thermometer",              SKU = "EQP-001", Category = ItemCategory.Equipment,           QuantityOnHand = 15,  MinimumQuantity = 5,  ReorderQuantity = 5,   Unit = "piece",   UnitCost = 18.00m },
                new InventoryItem { TenantId = tid, Name = "Blood Pressure Monitor (Cuff)",    SKU = "EQP-002", Category = ItemCategory.Equipment,           QuantityOnHand = 10,  MinimumQuantity = 3,  ReorderQuantity = 3,   Unit = "piece",   UnitCost = 85.00m },
                new InventoryItem { TenantId = tid, Name = "Pulse Oximeter",                   SKU = "EQP-003", Category = ItemCategory.Equipment,           QuantityOnHand = 12,  MinimumQuantity = 4,  ReorderQuantity = 4,   Unit = "piece",   UnitCost = 40.00m },
                new InventoryItem { TenantId = tid, Name = "Hand Sanitizer 500mL",             SKU = "CLN-001", Category = ItemCategory.CleaningSupplies,    QuantityOnHand = 50,  MinimumQuantity = 15, ReorderQuantity = 20,  Unit = "bottle",  UnitCost = 7.00m },
            };
            context.InventoryItems.AddRange(inventoryItems);
            context.SaveChanges();
        }

        // ── 5. Seed Suppliers ──────────────────────────────────────────────
        if (!context.Suppliers.Any())
        {
            var suppliers = new List<Supplier>
            {
                new Supplier { TenantId = tid, Name = "MedSupply Global",      ContactPerson = "Daniel Cruz",    Email = "daniel@medsupplyglobal.com", PhoneNumber = "555-1000", Address = "123 Medical Park Dr",     City = "New York",    State = "NY", PostalCode = "10001" },
                new Supplier { TenantId = tid, Name = "PharmaCo Distributors", ContactPerson = "Angela Brooks",  Email = "angela@pharmacodist.com",    PhoneNumber = "555-2000", Address = "456 Pharmaceutical Ave",  City = "Los Angeles", State = "CA", PostalCode = "90001" },
                new Supplier { TenantId = tid, Name = "HealthEquip Solutions", ContactPerson = "Marcus Lee",     Email = "marcus@healthequip.com",     PhoneNumber = "555-3000", Address = "789 Clinic Supply Blvd",  City = "Chicago",     State = "IL", PostalCode = "60601" },
                new Supplier { TenantId = tid, Name = "NovaMed Biologics",     ContactPerson = "Stephanie Pham", Email = "stephanie@novamed.com",      PhoneNumber = "555-4000", Address = "321 BioTech Way",          City = "Houston",     State = "TX", PostalCode = "77001" },
            };
            context.Suppliers.AddRange(suppliers);
            context.SaveChanges();
        }

        // ── 6. Seed Patients ───────────────────────────────────────────────
        if (!context.Patients.Any())
        {
            var patients = new List<Patient>
            {
                new Patient { TenantId = tid, FirstName = "John",   LastName = "Doe",      DateOfBirth = new DateTime(1978,  4, 12), Gender = Gender.Male,   Email = "john.doe@email.com",      PhoneNumber = "555-1111", Address = "101 Maple Street", City = "Springfield", State = "IL", PostalCode = "62701", EmergencyContactName = "Jane Doe",     EmergencyContactPhone = "555-1112", InsuranceProvider = "BlueCross BlueShield", InsurancePolicyNumber = "BCBS-445566", BloodType = "O+",  Allergies = "Penicillin",        IsActive = true },
                new Patient { TenantId = tid, FirstName = "Maria",  LastName = "Garcia",   DateOfBirth = new DateTime(1965,  9, 30), Gender = Gender.Female, Email = "maria.garcia@email.com",  PhoneNumber = "555-2222", Address = "202 Elm Avenue",   City = "Chicago",     State = "IL", PostalCode = "60601", EmergencyContactName = "Luis Garcia",  EmergencyContactPhone = "555-2223", InsuranceProvider = "Aetna",                InsurancePolicyNumber = "AET-778899",  BloodType = "A+",  Allergies = "Sulfa drugs",       IsActive = true },
                new Patient { TenantId = tid, FirstName = "Robert", LastName = "Thompson", DateOfBirth = new DateTime(1990,  2, 18), Gender = Gender.Male,   Email = "robert.thompson@email.com",PhoneNumber = "555-3333", Address = "303 Oak Lane",     City = "Naperville",  State = "IL", PostalCode = "60540", EmergencyContactName = "Susan Thompson",EmergencyContactPhone = "555-3334", InsuranceProvider = "Cigna",                InsurancePolicyNumber = "CIG-112233",  BloodType = "B+",  Allergies = null,                IsActive = true },
                new Patient { TenantId = tid, FirstName = "Linda",  LastName = "Park",     DateOfBirth = new DateTime(1955, 11,  5), Gender = Gender.Female, Email = "linda.park@email.com",    PhoneNumber = "555-4444", Address = "404 Pine Road",    City = "Aurora",      State = "IL", PostalCode = "60505", EmergencyContactName = "Kevin Park",   EmergencyContactPhone = "555-4445", InsuranceProvider = "United Healthcare",    InsurancePolicyNumber = "UHC-334455",  BloodType = "AB-", Allergies = "Aspirin, Latex",    IsActive = true },
                new Patient { TenantId = tid, FirstName = "Carlos", LastName = "Reyes",    DateOfBirth = new DateTime(2005,  6, 22), Gender = Gender.Male,   Email = "carlos.reyes@email.com",  PhoneNumber = "555-5555", Address = "505 Cedar Blvd",   City = "Rockford",    State = "IL", PostalCode = "61101", EmergencyContactName = "Ana Reyes",    EmergencyContactPhone = "555-5556", InsuranceProvider = "Humana",               InsurancePolicyNumber = "HUM-556677",  BloodType = "O-",  Allergies = null,                IsActive = true },
            };
            context.Patients.AddRange(patients);
            context.SaveChanges();

            if (!context.Users.Any(u => u.Role == UserRole.Patient))
            {
                var patientUsers = patients.Select(p => new User
                {
                    FirstName    = p.FirstName,
                    LastName     = p.LastName,
                    Email        = p.Email!,
                    PasswordHash = HashPassword("Admin@1234"),
                    PhoneNumber  = p.PhoneNumber,
                    Role         = UserRole.Patient,
                    TenantId     = tid,
                    IsActive     = true
                }).ToList();

                context.Users.AddRange(patientUsers);
                context.SaveChanges();

                for (int i = 0; i < patients.Count; i++)
                    patients[i].UserId = patientUsers[i].Id;

                context.SaveChanges();
            }
        }
    }
}
