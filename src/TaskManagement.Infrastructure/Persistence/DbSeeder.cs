using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using TaskManagement.Application.Interfaces;
using TaskManagement.Domain.Entities;
using TaskManagement.Domain.Enums;

namespace TaskManagement.Infrastructure.Persistence;

public static class DbSeeder
{
    /// <summary>Applies EF Core migrations (retrying while the DB container starts) and seeds the default admin once.</summary>
    public static async Task InitializeAsync(IServiceProvider services, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var sp = scope.ServiceProvider;
        var db = sp.GetRequiredService<AppDbContext>();
        var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger("DbSeeder");

        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await db.Database.MigrateAsync(ct);
                break;
            }
            catch (Exception ex) when (attempt < 10)
            {
                logger.LogWarning("Database not ready (attempt {Attempt}/10): {Message}", attempt, ex.Message);
                await Task.Delay(TimeSpan.FromSeconds(3), ct);
            }
        }

        // Seed only when there is no active admin (idempotent: safe on every startup).
        if (await db.Users.AnyAsync(u => u.Role == UserRole.Admin, ct)) return;

        var config = sp.GetRequiredService<IConfiguration>();
        var hasher = sp.GetRequiredService<IPasswordHasher>();
        var name = config["Seed:Admin:Name"] ?? "Administrator";
        var email = config["Seed:Admin:Email"] ?? "admin@example.com";
        var password = config["Seed:Admin:Password"] ?? "Admin@123";

        db.Users.Add(User.Create(name, email, hasher.Hash(password), UserRole.Admin));
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Seeded default admin user {Email}", email);
    }
}
