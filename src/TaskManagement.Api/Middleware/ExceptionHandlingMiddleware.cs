using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using TaskManagement.Application.Exceptions;
using TaskManagement.Domain.Exceptions;

namespace TaskManagement.Api.Middleware;

/// <summary>Global exception handling: turns exceptions into consistent RFC 7807 problem responses.</summary>
public sealed class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            context.Response.StatusCode = 499; // client closed the request
        }
        catch (Exception ex) when (!context.Response.HasStarted)
        {
            int status;
            string detail;

            switch (ex)
            {
                case AppException app:
                    status = app.StatusCode;
                    detail = app.Message;
                    logger.LogWarning("Handled {Type}: {Message}", ex.GetType().Name, ex.Message);
                    break;
                case DomainException domain:
                    status = StatusCodes.Status400BadRequest;
                    detail = domain.Message;
                    logger.LogWarning("Domain rule violated: {Message}", ex.Message);
                    break;
                default:
                    status = StatusCodes.Status500InternalServerError;
                    detail = "An unexpected error occurred.";
                    logger.LogError(ex, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);
                    break;
            }

            var problem = new ProblemDetails
            {
                Status = status,
                Title = ReasonPhrases.GetReasonPhrase(status),
                Detail = detail,
                Instance = context.Request.Path
            };

            context.Response.StatusCode = status;
            await context.Response.WriteAsJsonAsync(problem, options: null, contentType: "application/problem+json");
        }
    }
}
