using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;
using Newtonsoft.Json;

using server.Models;

namespace server.Services
{
    public class TourService
    {
        private readonly ICacheService _cacheService;
        private readonly IMemoryCache _memory;

        private const string tourPrefix = "tour_";
        private const string hashPrefix = "hash_";
        private const string activePrefix = "active_";
        private const string activeIdPrefix = "activeId_";

        public TourService(ICacheService cacheService, IMemoryCache memory)
        {
            _cacheService = cacheService;
            _memory = memory;
        }
        

        public async Task<Tour> GetByGuideHash(string hash)
        {
            var tourId = await _cacheService.GetCacheValueAsync(hash);
            var tourStr = await _cacheService.GetCacheValueAsync(tourPrefix + tourId);
            return JsonConvert.DeserializeObject<Tour>(tourStr);
        }
        

        public async Task<Tour> Get(string hash)
        {
            var guideHash = await _cacheService.GetCacheValueAsync(hashPrefix + hash) ?? hash;

            return await GetByGuideHash(guideHash);
        }

        public async Task Set(Tour tour)
        {
            await _cacheService.SetCacheValueAsync(tourPrefix + tour.Id.ToString(), JsonConvert.SerializeObject(tour));
        }

        public async Task SetHash(string keyHash, string valueHash)
        {
            await _cacheService.SetCacheValueAsync(hashPrefix + keyHash, valueHash);
        }

        public bool IsPrivateAndInUse(string hash)
        {
            var isPrivate = hash.StartsWith("_");
            if (!isPrivate)
            {
                return false;
            }

            return _memory.TryGetValue(activePrefix + hash, out var active);
        }

        public bool IsPrivateAndInUse(string hash, string connectionId)
        {
            var isPrivateAndInUse = IsPrivateAndInUse(hash);

            if (!isPrivateAndInUse)
            {
                return false;
            }

            var connectionIdMem = _memory.Get(activePrefix + hash);
            
            return (string)connectionIdMem != connectionId;
        }
    }
}
