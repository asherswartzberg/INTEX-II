using IntexAPI.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace IntexAPI.Infrastructure;

public class FacilityAccessService(
    UserManager<ApplicationUser> userManager,
    AppDbContext db)
{
    public async Task<HashSet<int>> GetAccessibleSafehouseIdsAsync(ClaimsPrincipal principal, CancellationToken cancellationToken = default)
    {
        if (principal.IsInRole(AuthRoles.Admin))
        {
            return await db.Safehouses.AsNoTracking()
                .Select(s => s.SafehouseId)
                .ToHashSetAsync(cancellationToken);
        }

        var user = await userManager.GetUserAsync(principal);
        return UserFacilityAccess.Parse(user?.AccessibleSafehouseIdsJson).ToHashSet();
    }

    public async Task<string> GetAccessibleSafehouseIdsJsonAsync(ApplicationUser? user, CancellationToken cancellationToken = default)
    {
        if (user == null)
            return "[]";

        if (await userManager.IsInRoleAsync(user, AuthRoles.Admin))
        {
            var ids = await db.Safehouses.AsNoTracking()
                .Select(s => s.SafehouseId)
                .ToListAsync(cancellationToken);
            return UserFacilityAccess.Serialize(ids);
        }

        return UserFacilityAccess.Serialize(UserFacilityAccess.Parse(user.AccessibleSafehouseIdsJson));
    }

    public IQueryable<Resident> ScopeResidents(IQueryable<Resident> query, IReadOnlyCollection<int> safehouseIds)
    {
        if (safehouseIds.Count == 0)
            return query.Where(r => false);

        return query.Where(r => r.SafehouseId != null && safehouseIds.Contains(r.SafehouseId.Value));
    }
}
