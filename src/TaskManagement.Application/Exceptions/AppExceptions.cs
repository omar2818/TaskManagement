namespace TaskManagement.Application.Exceptions;

/// <summary>Base type for expected, client-facing errors. The API maps StatusCode to the HTTP response.</summary>
public abstract class AppException : Exception
{
    protected AppException(string message, int statusCode) : base(message) => StatusCode = statusCode;
    public int StatusCode { get; }
}

public sealed class NotFoundException(string message) : AppException(message, 404);
public sealed class ConflictException(string message) : AppException(message, 409);
public sealed class AuthenticationFailedException(string message) : AppException(message, 401);
