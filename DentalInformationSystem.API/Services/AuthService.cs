using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using DentalInformationSystem.Domain.Entities;
using Microsoft.IdentityModel.Tokens;

namespace DentalInformationSystem.API.Services;

public interface IAuthService
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string hashedPassword);
    string GenerateJwtToken(User user, string secretKey, string issuer, string audience);
}

public class AuthService : IAuthService
{
    public string HashPassword(string password)
    {
        // Use PBKDF2 for password hashing
        using var pbkdf2 = new Rfc2898DeriveBytes(password, 16, 10000, HashAlgorithmName.SHA256);
        byte[] hash = pbkdf2.GetBytes(32);
        byte[] salt = pbkdf2.Salt;

        // Combine salt and hash
        byte[] hashBytes = new byte[48];
        Array.Copy(salt, 0, hashBytes, 0, 16);
        Array.Copy(hash, 0, hashBytes, 16, 32);

        return Convert.ToBase64String(hashBytes);
    }

    public bool VerifyPassword(string password, string hashedPassword)
    {
        try
        {
            byte[] hashBytes = Convert.FromBase64String(hashedPassword);

            // Extract salt
            byte[] salt = new byte[16];
            Array.Copy(hashBytes, 0, salt, 0, 16);

            // Compute hash with the extracted salt
            using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, 10000, HashAlgorithmName.SHA256);
            byte[] hash = pbkdf2.GetBytes(32);

            // Compare the computed hash with the stored hash
            for (int i = 0; i < 32; i++)
            {
                if (hashBytes[i + 16] != hash[i])
                    return false;
            }

            return true;
        }
        catch
        {
            return false;
        }
    }

    public string GenerateJwtToken(User user, string secretKey, string issuer, string audience)
    {
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("UserId", user.Id.ToString()),
            new Claim("Role", user.Role.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
