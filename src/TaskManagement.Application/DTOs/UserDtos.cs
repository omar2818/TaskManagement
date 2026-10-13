using System.ComponentModel.DataAnnotations;
using TaskManagement.Domain.Entities;
using TaskManagement.Domain.Enums;

namespace TaskManagement.Application.DTOs;

public class RegisterRequest
{
    [Required, StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress, StringLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required, StringLength(100, MinimumLength = 8)]
    public string Password { get; set; } = string.Empty;
}

public sealed class CreateUserRequest : RegisterRequest
{
    [EnumDataType(typeof(UserRole))]
    public UserRole Role { get; set; } = UserRole.User;
}

public sealed class LoginRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public sealed record AuthResponse(string AccessToken, string TokenType, DateTime ExpiresAtUtc);

public sealed record UserResponse(Guid Id, string Name, string Email, UserRole Role, DateTime CreatedAt)
{
    public static UserResponse From(User u) => new(u.Id, u.Name, u.Email, u.Role, u.CreatedAt);
}
