using System.Data.Common;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Data;

public static class IdentitySchemaInitializer
{
    public static async Task EnsureAsync(IdentityContext identityDb, CancellationToken cancellationToken = default)
    {
        await identityDb.Database.EnsureCreatedAsync(cancellationToken);
        await EnsureAccessibleSafehouseIdsColumnAsync(identityDb, cancellationToken);
    }

    private static async Task EnsureAccessibleSafehouseIdsColumnAsync(IdentityContext identityDb, CancellationToken cancellationToken)
    {
        const string columnName = "accessible_safehouse_ids";
        var connection = identityDb.Database.GetDbConnection();
        await OpenConnectionAsync(connection, cancellationToken);

        try
        {
            var exists = await ColumnExistsAsync(connection, "AspNetUsers", columnName, cancellationToken);
            if (exists) return;

            await using var command = connection.CreateCommand();
            command.CommandText = $"ALTER TABLE AspNetUsers ADD COLUMN {columnName} TEXT NULL";
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        finally
        {
            await CloseConnectionAsync(connection);
        }
    }

    private static async Task<bool> ColumnExistsAsync(DbConnection connection, string tableName, string columnName, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = $"PRAGMA table_info('{tableName}')";
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            if (string.Equals(reader.GetString(1), columnName, StringComparison.OrdinalIgnoreCase))
                return true;
        }
        return false;
    }

    private static async Task OpenConnectionAsync(DbConnection connection, CancellationToken cancellationToken)
    {
        if (connection.State == System.Data.ConnectionState.Open) return;
        await connection.OpenAsync(cancellationToken);
    }

    private static async Task CloseConnectionAsync(DbConnection connection)
    {
        if (connection.State == System.Data.ConnectionState.Open)
            await connection.CloseAsync();
    }
}
