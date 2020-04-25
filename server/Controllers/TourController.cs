using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using server.Models;
using server.Services;

namespace server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TourController : ControllerBase
    {
        private readonly Storage Storage;
        private ICacheService _cacheService;

        public TourController(Storage storage, ICacheService cacheService)
        {
            Storage = storage;
            _cacheService = cacheService;
        }

        [HttpGet]
        [Route("{idHash}")]
        public async Task<IActionResult> Get(string idHash)
        {
            var tourId = await _cacheService.GetCacheValueAsync(idHash);
            var tour = await _cacheService.GetCacheValueAsync("tour_" + tourId);
            if(tour == null)
            {
                return NotFound("Tour");
            }

            return Ok(JsonConvert.DeserializeObject<Tour>(tour));
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] Tour incoming)
        {
            incoming.Id = Guid.NewGuid();

            var hash = incoming.Id.Hash();
            incoming.GuestHash = hash;
            await _cacheService.SetCacheValueAsync(hash, incoming.Id.ToString());
            await _cacheService.SetCacheValueAsync("tour_" + incoming.Id.ToString(), JsonConvert.SerializeObject(incoming));

            return Ok(incoming);
        }
    }
}
