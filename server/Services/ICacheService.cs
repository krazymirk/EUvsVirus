using System.Threading.Tasks;

namespace server.Services
{
    public interface ICacheService
    {
        Task<string> GetCacheValueAsync(string key);

        Task SetCacheValueAsync(string key, string value);
    }
}
