using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualBasic.FileIO;

namespace IntexAPI.Data;

public static class CsvSeedData
{
    public static IReadOnlyList<Safehouse> LoadSafehouses(string? baseDir = null)
    {
        var path = Path.Combine(baseDir ?? AppContext.BaseDirectory, "CsvData", "safehouses.csv");
        if (!File.Exists(path))
            return [];

        var result = new List<Safehouse>();
        foreach (var row in ReadRows(path))
        {
            if (!int.TryParse(GetValue(row, "safehouse_id"), out var safehouseId))
                continue;

            result.Add(new Safehouse
            {
                SafehouseId = safehouseId,
                SafehouseCode = EmptyToNull(GetValue(row, "safehouse_code")),
                Name = EmptyToNull(GetValue(row, "name")),
                Region = EmptyToNull(GetValue(row, "region")),
                City = EmptyToNull(GetValue(row, "city")),
                Province = EmptyToNull(GetValue(row, "province")),
                Country = EmptyToNull(GetValue(row, "country")),
                OpenDate = ParseDateOnly(GetValue(row, "open_date")),
                Status = EmptyToNull(GetValue(row, "status")),
                CapacityGirls = ParseInt(GetValue(row, "capacity_girls")),
                CapacityStaff = ParseInt(GetValue(row, "capacity_staff")),
                CurrentOccupancy = ParseInt(GetValue(row, "current_occupancy")),
                Notes = EmptyToNull(GetValue(row, "notes")),
            });
        }

        return result;
    }

    public static IReadOnlyList<SafehouseMonthlyMetric> LoadSafehouseMonthlyMetrics(string? baseDir = null)
    {
        var path = Path.Combine(baseDir ?? AppContext.BaseDirectory, "CsvData", "safehouse_monthly_metrics.csv");
        if (!File.Exists(path))
            return [];

        var result = new List<SafehouseMonthlyMetric>();
        foreach (var row in ReadRows(path))
        {
            if (!int.TryParse(GetValue(row, "metric_id"), out var metricId))
                continue;

            result.Add(new SafehouseMonthlyMetric
            {
                MetricId = metricId,
                SafehouseId = ParseInt(GetValue(row, "safehouse_id")),
                MonthStart = ParseDateOnly(GetValue(row, "month_start")),
                MonthEnd = ParseDateOnly(GetValue(row, "month_end")),
                ActiveResidents = ParseInt(GetValue(row, "active_residents")),
                AvgEducationProgress = ParseDouble(GetValue(row, "avg_education_progress")),
                AvgHealthScore = ParseDouble(GetValue(row, "avg_health_score")),
                ProcessRecordingCount = ParseInt(GetValue(row, "process_recording_count")),
                HomeVisitationCount = ParseInt(GetValue(row, "home_visitation_count")),
                IncidentCount = ParseInt(GetValue(row, "incident_count")),
                Notes = EmptyToNull(GetValue(row, "notes")),
            });
        }

        return result;
    }

    public static async Task InitializeAsync(IServiceProvider serviceProvider, CancellationToken cancellationToken = default)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var baseDir = AppContext.BaseDirectory;
        var csvDir = Path.Combine(baseDir, "CsvData");

        var safehousesPath = Path.Combine(csvDir, "safehouses.csv");
        var metricsPath = Path.Combine(csvDir, "safehouse_monthly_metrics.csv");

        if (!File.Exists(safehousesPath) || !File.Exists(metricsPath))
            return;

        await UpsertSafehousesAsync(db, safehousesPath, cancellationToken);
        await UpsertSafehouseMonthlyMetricsAsync(db, metricsPath, cancellationToken);
    }

    private static async Task UpsertSafehousesAsync(AppDbContext db, string path, CancellationToken cancellationToken)
    {
        var existing = await db.Safehouses.ToDictionaryAsync(s => s.SafehouseId, cancellationToken);
        foreach (var entity in LoadSafehouses(Path.GetDirectoryName(Path.GetDirectoryName(path)) ?? AppContext.BaseDirectory))
        {
            if (existing.TryGetValue(entity.SafehouseId, out var current))
            {
                current.SafehouseCode = entity.SafehouseCode;
                current.Name = entity.Name;
                current.Region = entity.Region;
                current.City = entity.City;
                current.Province = entity.Province;
                current.Country = entity.Country;
                current.OpenDate = entity.OpenDate;
                current.Status = entity.Status;
                current.CapacityGirls = entity.CapacityGirls;
                current.CapacityStaff = entity.CapacityStaff;
                current.CurrentOccupancy = entity.CurrentOccupancy;
                current.Notes = entity.Notes;
            }
            else
            {
                db.Safehouses.Add(entity);
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task UpsertSafehouseMonthlyMetricsAsync(AppDbContext db, string path, CancellationToken cancellationToken)
    {
        var existing = await db.SafehouseMonthlyMetrics.ToDictionaryAsync(m => m.MetricId, cancellationToken);
        foreach (var entity in LoadSafehouseMonthlyMetrics(Path.GetDirectoryName(Path.GetDirectoryName(path)) ?? AppContext.BaseDirectory))
        {
            if (existing.TryGetValue(entity.MetricId, out var current))
            {
                current.SafehouseId = entity.SafehouseId;
                current.MonthStart = entity.MonthStart;
                current.MonthEnd = entity.MonthEnd;
                current.ActiveResidents = entity.ActiveResidents;
                current.AvgEducationProgress = entity.AvgEducationProgress;
                current.AvgHealthScore = entity.AvgHealthScore;
                current.ProcessRecordingCount = entity.ProcessRecordingCount;
                current.HomeVisitationCount = entity.HomeVisitationCount;
                current.IncidentCount = entity.IncidentCount;
                current.Notes = entity.Notes;
            }
            else
            {
                db.SafehouseMonthlyMetrics.Add(entity);
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static IEnumerable<Dictionary<string, string>> ReadRows(string path)
    {
        using var parser = new TextFieldParser(path);
        parser.TextFieldType = FieldType.Delimited;
        parser.SetDelimiters(",");
        parser.HasFieldsEnclosedInQuotes = true;
        parser.TrimWhiteSpace = false;

        var headers = parser.ReadFields() ?? [];
        while (!parser.EndOfData)
        {
            var fields = parser.ReadFields() ?? [];
            var row = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < headers.Length && i < fields.Length; i++)
                row[headers[i]] = fields[i];
            yield return row;
        }
    }

    private static string GetValue(IReadOnlyDictionary<string, string> row, string key)
        => row.TryGetValue(key, out var value) ? value : string.Empty;

    private static string? EmptyToNull(string value)
        => string.IsNullOrWhiteSpace(value) ? null : value;

    private static int? ParseInt(string value)
        => int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed) ? parsed : null;

    private static double? ParseDouble(string value)
        => double.TryParse(value, NumberStyles.Float | NumberStyles.AllowThousands, CultureInfo.InvariantCulture, out var parsed) ? parsed : null;

    private static DateOnly? ParseDateOnly(string value)
        => DateOnly.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed) ? parsed : null;
}
