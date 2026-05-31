using Microsoft.EntityFrameworkCore;

namespace DoctorAppointmentSystem.Repositories.Extensions;

public static class QueryableExtensions
{
    /// <summary>
    /// Applies pagination to an IQueryable
    /// </summary>
    public static IQueryable<T> Paginate<T>(this IQueryable<T> query, int pageNumber, int pageSize)
    {
        return query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize);
    }

    /// <summary>
    /// Converts IQueryable to materialized list asynchronously
    /// </summary>
    public static async Task<List<T>> ToListAsync<T>(this IQueryable<T> query)
    {
        return await EntityFrameworkQueryableExtensions.ToListAsync(query);
    }

    /// <summary>
    /// Gets paginated result with total count
    /// </summary>
    public static async Task<(List<T> Items, int TotalCount)> ToPaginatedListAsync<T>(
        this IQueryable<T> query, 
        int pageNumber, 
        int pageSize)
    {
        var totalCount = await query.CountAsync();
        var items = await query
            .Paginate(pageNumber, pageSize)
            .ToListAsync();

        return (items, totalCount);
    }

    /// <summary>
    /// Applies ordering based on property name
    /// </summary>
    public static IQueryable<T> OrderByProperty<T>(
        this IQueryable<T> query, 
        string propertyName, 
        bool descending = false)
    {
        if (string.IsNullOrWhiteSpace(propertyName))
            return query;

        var parameter = System.Linq.Expressions.Expression.Parameter(typeof(T), "x");
        var property = System.Linq.Expressions.Expression.Property(parameter, propertyName);
        var lambda = System.Linq.Expressions.Expression.Lambda(property, parameter);

        var methodName = descending ? "OrderByDescending" : "OrderBy";
        var resultExpression = System.Linq.Expressions.Expression.Call(
            typeof(Queryable),
            methodName,
            new Type[] { typeof(T), property.Type },
            query.Expression,
            System.Linq.Expressions.Expression.Quote(lambda));

        return query.Provider.CreateQuery<T>(resultExpression);
    }
}
