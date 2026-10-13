using TaskManagement.Application.DTOs;
using TaskManagement.Application.Exceptions;
using TaskManagement.Application.Interfaces;
using TaskManagement.Domain.Entities;
using TaskManagement.Domain.Repositories;

namespace TaskManagement.Application.Services;

public interface IUserService
{
    Task<UserResponse> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<UserResponse>> ListAsync(CancellationToken ct = default);
    Task<UserResponse> CreateAsync(CreateUserRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, Guid currentUserId, CancellationToken ct = default);
}

public sealed class UserService(IUserRepository users, IUnitOfWork uow, IPasswordHasher hasher) : IUserService
{
    public async Task<UserResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var user = await users.GetByIdAsync(id, ct) ?? throw new NotFoundException("User not found.");
        return UserResponse.From(user);
    }

    public async Task<IReadOnlyList<UserResponse>> ListAsync(CancellationToken ct = default)
        => (await users.ListAsync(ct)).Select(UserResponse.From).ToList();

    public async Task<UserResponse> CreateAsync(CreateUserRequest request, CancellationToken ct = default)
    {
        if (await users.EmailExistsAsync(request.Email, ct))
            throw new ConflictException("Email is already registered.");

        var user = User.Create(request.Name, request.Email, hasher.Hash(request.Password), request.Role);
        await users.AddAsync(user, ct);
        await uow.SaveChangesAsync(ct);
        return UserResponse.From(user);
    }

    public async Task DeleteAsync(Guid id, Guid currentUserId, CancellationToken ct = default)
    {
        if (id == currentUserId)
            throw new ConflictException("Admins cannot delete their own account.");

        var user = await users.GetByIdAsync(id, ct) ?? throw new NotFoundException("User not found.");
        user.SoftDelete();
        await uow.SaveChangesAsync(ct);
    }
}
