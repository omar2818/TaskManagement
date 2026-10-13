using TaskManagement.Application.DTOs;
using TaskManagement.Application.Exceptions;
using TaskManagement.Application.Interfaces;
using TaskManagement.Domain.Entities;
using TaskManagement.Domain.Enums;
using TaskManagement.Domain.Repositories;

namespace TaskManagement.Application.Services;

public interface IAuthService
{
    Task<UserResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);
}

public sealed class AuthService(
    IUserRepository users,
    IUnitOfWork uow,
    IPasswordHasher hasher,
    IJwtTokenGenerator jwt) : IAuthService
{
    public async Task<UserResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        if (await users.EmailExistsAsync(request.Email, ct))
            throw new ConflictException("Email is already registered.");

        // Public registration always creates a normal user; only an admin can create other admins.
        var user = User.Create(request.Name, request.Email, hasher.Hash(request.Password), UserRole.User);
        await users.AddAsync(user, ct);
        await uow.SaveChangesAsync(ct);
        return UserResponse.From(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await users.GetByEmailAsync(request.Email, ct);
        if (user is null || !hasher.Verify(request.Password, user.PasswordHash))
            throw new AuthenticationFailedException("Invalid email or password.");

        var token = jwt.Generate(user);
        return new AuthResponse(token.Token, "Bearer", token.ExpiresAtUtc);
    }
}
