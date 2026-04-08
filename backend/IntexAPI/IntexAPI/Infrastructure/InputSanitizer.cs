using System.Text.RegularExpressions;

namespace IntexAPI.Infrastructure;

/// <summary>
/// Strips HTML tags and dangerous characters from user-supplied strings
/// to help prevent stored XSS and injection attacks.
/// </summary>
public static partial class InputSanitizer
{
    [GeneratedRegex(@"<[^>]*>", RegexOptions.Compiled)]
    private static partial Regex HtmlTagRegex();

    /// <summary>
    /// Remove HTML tags from a string. Returns null if input is null.
    /// </summary>
    public static string? Sanitize(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return input;
        return HtmlTagRegex().Replace(input, string.Empty).Trim();
    }
}
