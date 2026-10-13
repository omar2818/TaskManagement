using Moq;
using TaskManagement.Application.DTOs;
using TaskManagement.Application.Exceptions;
using TaskManagement.Application.Interfaces;
using TaskManagement.Application.Services;
using TaskManagement.Domain.Entities;
using TaskManagement.Domain.Enums;
using TaskManagement.Domain.Repositories;
using Xunit;

namespace TaskManagement.Tests;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly Mock<IPasswordHasher> _hasher = new();
    private readonly Mock<IJwtTokenGenerator> _jwt = new();

    private AuthService Sut() => new(_users.Object, _uow.Object, _hasher.Object, _jwt.Object);

    [Fact]
    public async Task Register_WithExistingEmail_ThrowsConflict()
    {
        _users.Setup(u => u.EmailExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);

        await Assert.ThrowsAsync<ConflictException>(() =>
            Sut().RegisterAsync(new RegisterRequest { Name = "A", Email = "a@b.com", Password = "Password1" }));
    }

    [Fact]
    public async Task Register_AlwaysCreatesNormalUser_AndHashesPassword()
    {
        _users.Setup(u => u.EmailExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _hasher.Setup(h => h.Hash("Password1")).Returns("hashed");

        var result = await Sut().RegisterAsync(new RegisterRequest { Name = "A", Email = "A@B.com", Password = "Password1" });

        Assert.Equal(UserRole.User, result.Role);
        Assert.Equal("a@b.com", result.Email);
        _users.Verify(u => u.AddAsync(It.Is<User>(x => x.PasswordHash == "hashed"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Login_WithWrongPassword_ThrowsAuthenticationFailed()
    {
        var user = User.Create("A", "a@b.com", "hashed", UserRole.User);
        _users.Setup(u => u.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _hasher.Setup(h => h.Verify(It.IsAny<string>(), "hashed")).Returns(false);

        await Assert.ThrowsAsync<AuthenticationFailedException>(() =>
            Sut().LoginAsync(new LoginRequest { Email = "a@b.com", Password = "nope" }));
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsToken()
    {
        var user = User.Create("A", "a@b.com", "hashed", UserRole.User);
        _users.Setup(u => u.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _hasher.Setup(h => h.Verify("Password1", "hashed")).Returns(true);
        _jwt.Setup(j => j.Generate(user)).Returns(new AuthToken("jwt-token", DateTime.UtcNow.AddHours(1)));

        var result = await Sut().LoginAsync(new LoginRequest { Email = "a@b.com", Password = "Password1" });

        Assert.Equal("jwt-token", result.AccessToken);
        Assert.Equal("Bearer", result.TokenType);
    }
}
