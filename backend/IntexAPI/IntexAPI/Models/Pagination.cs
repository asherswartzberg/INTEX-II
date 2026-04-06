namespace IntexAPI.Models;

public static class Pagination
{
    public const int DefaultPageSize = 50;
    public const int MaxPageSize = 200;

    public static (int Page, int PageSize) Normalize(int page, int pageSize)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize < 1 ? DefaultPageSize : Math.Min(pageSize, MaxPageSize);
        return (page, pageSize);
    }

    public static (int Skip, int Take) ToSkipTake(int page, int pageSize)
    {
        var (p, ps) = Normalize(page, pageSize);
        return ((p - 1) * ps, ps);
    }
}
