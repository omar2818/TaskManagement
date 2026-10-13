using TaskManagement.Domain.Entities;

namespace TaskManagement.Application.Interfaces;

public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string hash);
}

public sealed record AuthToken(string Token, DateTime ExpiresAtUtc);

public interface IJwtTokenGenerator
{
    AuthToken Generate(User user);
}

public interface ICacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default) where T : class;
    Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct = default) where T : class;
    Task RemoveAsync(string key, CancellationToken ct = default);
}

/// <summary>Simple producer/consumer queue for background work (backed by System.Threading.Channels).</summary>
public interface ITaskQueue
{
    ValueTask EnqueueAsync(Guid taskId, CancellationToken ct = default);
    IAsyncEnumerable<Guid> DequeueAllAsync(CancellationToken ct);
}
