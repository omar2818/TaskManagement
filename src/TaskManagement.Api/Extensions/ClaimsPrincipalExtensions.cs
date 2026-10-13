using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using TaskManagement.Application.Exceptions;

namespace TaskManagement.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal principal)
    {
        var sub = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(sub, out var id) ? id : throw new AuthenticationFailedException("Invalid token.");
    }
}
