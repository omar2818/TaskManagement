using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TaskManagement.Application.Interfaces;
using TaskManagement.Application.Services;

namespace TaskManagement.Infrastructure.BackgroundJobs;

/// <summary>Long-running BackgroundService that consumes queued task ids and "processes" them.</summary>
public sealed class TaskProcessingWorker(
    ITaskQueue queue,
    IServiceScopeFactory scopeFactory,
    IConfiguration configuration,
    ILogger<TaskProcessingWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var delay = TimeSpan.FromSeconds(configuration.GetValue("BackgroundProcessing:SimulatedDelaySeconds", 3));
        logger.LogInformation("Task processing worker started");

        try
        {
            await foreach (var taskId in queue.DequeueAllAsync(stoppingToken))
            {
                try
                {
                    logger.LogInformation("Processing task {TaskId}...", taskId);
                    await Task.Delay(delay, stoppingToken); // simulate work

                    // Scoped services (DbContext) must be resolved from a fresh scope per job.
                    using var scope = scopeFactory.CreateScope();
                    var processor = scope.ServiceProvider.GetRequiredService<ITaskProcessingService>();
                    await processor.ProcessAsync(taskId, stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    logger.LogError(ex, "Failed to process task {TaskId}", taskId);
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Normal shutdown.
        }
    }
}
