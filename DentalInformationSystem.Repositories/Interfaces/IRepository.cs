using System.Linq.Expressions;

namespace DentalInformationSystem.Repositories.Interfaces;

public interface IRepository<T> where T : class
{
    // Query methods - Returns IQueryable for deferred execution and query composition
    IQueryable<T> GetAll();
    IQueryable<T> Find(Expression<Func<T, bool>> predicate);
    
    // Single entity retrieval
    Task<T?> GetByIdAsync(int id);
    Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate);
    Task<T?> SingleOrDefaultAsync(Expression<Func<T, bool>> predicate);
    
    // Materialized results - Returns IEnumerable after query execution
    Task<IEnumerable<T>> GetAllAsync();
    Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate);
    
    // Existence and counting
    Task<bool> AnyAsync(Expression<Func<T, bool>> predicate);
    Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null);
    
    // Modification methods
    Task AddAsync(T entity);
    Task AddRangeAsync(IEnumerable<T> entities);
    void Update(T entity);
    void UpdateRange(IEnumerable<T> entities);
    void Remove(T entity);
    void RemoveRange(IEnumerable<T> entities);
}
