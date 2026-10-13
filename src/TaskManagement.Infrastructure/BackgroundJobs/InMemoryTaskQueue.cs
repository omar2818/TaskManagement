using System.Threading.Channels;
using TaskManagement.Application.Interfaces;

namespace TaskManagement.Infrastructure.BackgroundJobs;

public sealed class InMemoryTaskQueue : ITaskQueue
{
    private readonly Channel<Guid> _channel =
        Channel.CreateUnbounded<Guid>(new UnboundedChannelOptions { SingleReader = true });

    public ValueTask EnqueueAsync(Guid taskId, CancellationToken ct = default)
        => _channel.Writer.WriteAsync(taskId, ct);

    public IAsyncEnumerable<Guid> DequeueAllAsync(CancellationToken ct)
        => _channel.Reader.ReadAllAsync(ct);
}
