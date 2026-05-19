using DentalInformationSystem.Domain.Entities;
using DentalInformationSystem.Domain.Enums;

namespace DentalInformationSystem.Data.Seeding;

public static class DataSeeder
{
    public static void SeedData(ApplicationDbContext context)
    {
        // Seed Users (Staff)
        if (!context.Users.Any())
        {
            var users = new List<User>
            {
                // Admin role - Full system access + accounting
                new User
                {
                    FirstName = "Admin",
                    LastName = "User",
                    Email = "admin@dentalclinic.com",
                    PasswordHash = "hashed_password_here", // In production, use proper password hashing
                    PhoneNumber = "555-0100",
                    Role = UserRole.Admin,
                    IsActive = true
                },
                new User
                {
                    FirstName = "Robert",
                    LastName = "Anderson",
                    Email = "robert.anderson@dentalclinic.com",
                    PasswordHash = "hashed_password_here",
                    PhoneNumber = "555-0105",
                    Role = UserRole.Admin,
                    IsActive = true
                },

                // Clinical Staff - Dentists and Hygienists
                new User
                {
                    FirstName = "Dr. Sarah",
                    LastName = "Johnson",
                    Email = "sarah.johnson@dentalclinic.com",
                    PasswordHash = "hashed_password_here",
                    PhoneNumber = "555-0101",
                    Role = UserRole.ClinicalStaff,
                    Specialization = "General Dentistry",
                    LicenseNumber = "DEN-12345",
                    IsActive = true
                },
                new User
                {
                    FirstName = "Dr. Michael",
                    LastName = "Chen",
                    Email = "michael.chen@dentalclinic.com",
                    PasswordHash = "hashed_password_here",
                    PhoneNumber = "555-0102",
                    Role = UserRole.ClinicalStaff,
                    Specialization = "Orthodontics",
                    LicenseNumber = "DEN-12346",
                    IsActive = true
                },
                new User
                {
                    FirstName = "Lisa",
                    LastName = "Martinez",
                    Email = "lisa.martinez@dentalclinic.com",
                    PasswordHash = "hashed_password_here",
                    PhoneNumber = "555-0103",
                    Role = UserRole.ClinicalStaff,
                    Specialization = "Dental Hygiene",
                    LicenseNumber = "HYG-54321",
                    IsActive = true
                },

                // Support Staff - Receptionists, Nurses, Inventory Managers
                new User
                {
                    FirstName = "Emma",
                    LastName = "Davis",
                    Email = "emma.davis@dentalclinic.com",
                    PasswordHash = "hashed_password_here",
                    PhoneNumber = "555-0104",
                    Role = UserRole.SupportStaff,
                    IsActive = true
                },
                new User
                {
                    FirstName = "James",
                    LastName = "Wilson",
                    Email = "james.wilson@dentalclinic.com",
                    PasswordHash = "hashed_password_here",
                    PhoneNumber = "555-0106",
                    Role = UserRole.SupportStaff,
                    IsActive = true
                }
            };
            context.Users.AddRange(users);
            context.SaveChanges();
        }

        // Seed Procedures
        if (!context.Procedures.Any())
        {
            var procedures = new List<Procedure>
            {
                new Procedure { Code = "D0120", Name = "Periodic Oral Evaluation", Description = "Routine dental checkup", DefaultCost = 75.00m, EstimatedDurationMinutes = 30 },
                new Procedure { Code = "D0150", Name = "Comprehensive Oral Evaluation", Description = "New patient comprehensive exam", DefaultCost = 120.00m, EstimatedDurationMinutes = 45 },
                new Procedure { Code = "D0210", Name = "Full Mouth X-Ray", Description = "Complete radiographic series", DefaultCost = 150.00m, EstimatedDurationMinutes = 20 },
                new Procedure { Code = "D1110", Name = "Prophylaxis - Adult", Description = "Teeth cleaning", DefaultCost = 95.00m, EstimatedDurationMinutes = 45 },
                new Procedure { Code = "D2140", Name = "Amalgam - One Surface", Description = "Silver filling", DefaultCost = 150.00m, EstimatedDurationMinutes = 30 },
                new Procedure { Code = "D2391", Name = "Resin-Based Composite - One Surface", Description = "Tooth-colored filling", DefaultCost = 175.00m, EstimatedDurationMinutes = 30 },
                new Procedure { Code = "D2750", Name = "Crown - Porcelain Fused to Metal", Description = "Dental crown", DefaultCost = 1200.00m, EstimatedDurationMinutes = 120 },
                new Procedure { Code = "D3310", Name = "Root Canal - Anterior", Description = "Root canal therapy - front tooth", DefaultCost = 800.00m, EstimatedDurationMinutes = 90 },
                new Procedure { Code = "D7140", Name = "Extraction - Erupted Tooth", Description = "Simple tooth extraction", DefaultCost = 200.00m, EstimatedDurationMinutes = 30 },
                new Procedure { Code = "D9215", Name = "Local Anesthesia", Description = "Numbing injection", DefaultCost = 50.00m, EstimatedDurationMinutes = 10 }
            };
            context.Procedures.AddRange(procedures);
            context.SaveChanges();
        }

        // Seed Inventory Items
        if (!context.InventoryItems.Any())
        {
            var inventoryItems = new List<InventoryItem>
            {
                new InventoryItem { Name = "Dental Gloves (Box)", SKU = "GLV-001", Category = ItemCategory.ProtectiveEquipment, QuantityOnHand = 50, MinimumQuantity = 20, ReorderQuantity = 30, Unit = "box", UnitCost = 15.00m, Manufacturer = "MedSupply Co." },
                new InventoryItem { Name = "Face Masks (Box of 50)", SKU = "MSK-001", Category = ItemCategory.ProtectiveEquipment, QuantityOnHand = 40, MinimumQuantity = 15, ReorderQuantity = 25, Unit = "box", UnitCost = 12.00m },
                new InventoryItem { Name = "Composite Resin - A2 Shade", SKU = "RSN-A2", Category = ItemCategory.DentalMaterials, QuantityOnHand = 10, MinimumQuantity = 5, ReorderQuantity = 10, Unit = "syringe", UnitCost = 45.00m },
                new InventoryItem { Name = "Lidocaine 2% with Epinephrine", SKU = "ANE-LID", Category = ItemCategory.Anesthetics, QuantityOnHand = 25, MinimumQuantity = 10, ReorderQuantity = 20, Unit = "cartridge", UnitCost = 8.00m },
                new InventoryItem { Name = "Dental Mirror", SKU = "INS-MIR", Category = ItemCategory.DentalInstruments, QuantityOnHand = 30, MinimumQuantity = 10, ReorderQuantity = 15, Unit = "piece", UnitCost = 5.00m },
                new InventoryItem { Name = "Suction Tips (Box)", SKU = "SUC-001", Category = ItemCategory.Consumables, QuantityOnHand = 20, MinimumQuantity = 8, ReorderQuantity = 15, Unit = "box", UnitCost = 18.00m },
                new InventoryItem { Name = "Cotton Rolls (Pack)", SKU = "COT-001", Category = ItemCategory.Consumables, QuantityOnHand = 35, MinimumQuantity = 15, ReorderQuantity = 20, Unit = "pack", UnitCost = 8.50m },
                new InventoryItem { Name = "Fluoride Varnish", SKU = "FLU-001", Category = ItemCategory.Medications, QuantityOnHand = 12, MinimumQuantity = 5, ReorderQuantity = 10, Unit = "unit", UnitCost = 35.00m },
                new InventoryItem { Name = "Dental Burs Kit", SKU = "BUR-KIT", Category = ItemCategory.DentalInstruments, QuantityOnHand = 8, MinimumQuantity = 3, ReorderQuantity = 5, Unit = "kit", UnitCost = 120.00m },
                new InventoryItem { Name = "Articulating Paper", SKU = "ART-001", Category = ItemCategory.DentalMaterials, QuantityOnHand = 15, MinimumQuantity = 5, ReorderQuantity = 10, Unit = "book", UnitCost = 12.00m }
            };
            context.InventoryItems.AddRange(inventoryItems);
            context.SaveChanges();
        }

        // Seed Suppliers
        if (!context.Suppliers.Any())
        {
            var suppliers = new List<Supplier>
            {
                new Supplier { Name = "Dental Supply Co.", ContactPerson = "John Smith", Email = "john@dentalsupply.com", PhoneNumber = "555-1000", Address = "123 Medical Ave", City = "New York", State = "NY", PostalCode = "10001" },
                new Supplier { Name = "MedEquip Solutions", ContactPerson = "Sarah Wilson", Email = "sarah@medequip.com", PhoneNumber = "555-2000", Address = "456 Healthcare Blvd", City = "Los Angeles", State = "CA", PostalCode = "90001" },
                new Supplier { Name = "ProDent Wholesale", ContactPerson = "Michael Brown", Email = "michael@prodent.com", PhoneNumber = "555-3000", Address = "789 Dental Way", City = "Chicago", State = "IL", PostalCode = "60601" }
            };
            context.Suppliers.AddRange(suppliers);
            context.SaveChanges();
        }

        // Seed Sample Patients
        if (!context.Patients.Any())
        {
            var patients = new List<Patient>
            {
                new Patient
                {
                    FirstName = "John",
                    LastName = "Doe",
                    DateOfBirth = new DateTime(1985, 5, 15),
                    Gender = Gender.Male,
                    Email = "john.doe@email.com",
                    PhoneNumber = "555-1111",
                    Address = "100 Main St",
                    City = "Springfield",
                    State = "IL",
                    PostalCode = "62701",
                    EmergencyContactName = "Jane Doe",
                    EmergencyContactPhone = "555-1112",
                    InsuranceProvider = "Delta Dental",
                    InsurancePolicyNumber = "DD123456",
                    BloodType = "O+",
                    IsActive = true
                },
                new Patient
                {
                    FirstName = "Jane",
                    LastName = "Smith",
                    DateOfBirth = new DateTime(1990, 8, 22),
                    Gender = Gender.Female,
                    Email = "jane.smith@email.com",
                    PhoneNumber = "555-2222",
                    Address = "200 Oak Ave",
                    City = "Springfield",
                    State = "IL",
                    PostalCode = "62702",
                    EmergencyContactName = "Bob Smith",
                    EmergencyContactPhone = "555-2223",
                    InsuranceProvider = "Cigna",
                    InsurancePolicyNumber = "CIG789012",
                    Allergies = "Penicillin",
                    IsActive = true
                }
            };
            context.Patients.AddRange(patients);
            context.SaveChanges();

            // Seed Patient Portal Users (linked to patient records)
            if (!context.Users.Any(u => u.Role == UserRole.Patient))
            {
                var patient1 = patients[0];
                var patient2 = patients[1];

                var patientUsers = new List<User>
                {
                    new User
                    {
                        FirstName = patient1.FirstName,
                        LastName = patient1.LastName,
                        Email = "john.doe.portal@email.com", // Different email for portal
                        PasswordHash = "hashed_password_here",
                        PhoneNumber = patient1.PhoneNumber,
                        Role = UserRole.Patient,
                        IsActive = true
                    },
                    new User
                    {
                        FirstName = patient2.FirstName,
                        LastName = patient2.LastName,
                        Email = "jane.smith.portal@email.com",
                        PasswordHash = "hashed_password_here",
                        PhoneNumber = patient2.PhoneNumber,
                        Role = UserRole.Patient,
                        IsActive = true
                    }
                };

                context.Users.AddRange(patientUsers);
                context.SaveChanges();

                // Link patients to portal users
                patient1.UserId = patientUsers[0].Id;
                patient2.UserId = patientUsers[1].Id;
                context.SaveChanges();
            }
        }
    }
}
