using System.Text.Json;

namespace IntexAPI.Data;

public static class UserFacilityAccess
{
    public static IReadOnlyList<int> Parse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return [];

        try
        {
            return JsonSerializer.Deserialize<List<int>>(json) ?? [];
        }
        catch
        {
            return [];
        }
    }

    public static string Serialize(IEnumerable<int> safehouseIds)
    {
        var normalized = safehouseIds
            .Distinct()
            .OrderBy(id => id)
            .ToArray();
        return JsonSerializer.Serialize(normalized);
    }
}
