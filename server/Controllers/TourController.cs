using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Newtonsoft.Json;
using server.Models;
using server.Services;

namespace server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TourController : ControllerBase
    {
        private readonly ICacheService _cacheService;
        private readonly TourService _tourService;

        public TourController(ICacheService cacheService, TourService tourService)
        {
            _cacheService = cacheService;
            _tourService = tourService;
        }

        [HttpGet]
        [Route("{idHash}")]
        public async Task<IActionResult> Get(string idHash)
        {
            if (_tourService.IsPrivateAndInUse(idHash))
            {
                return Forbid("Private link already in use");
            }

            var tourId = await _cacheService.GetCacheValueAsync(idHash);
            var tour = await _cacheService.GetCacheValueAsync("tour_" + tourId);
            if(tour == null)
            {
                return NotFound("Tour");
            }

            var tourObject = JsonConvert.DeserializeObject<Tour>(tour);

            return Ok(new Tour
            {
                Name = tourObject.Name,
                StartDateTime = tourObject.StartDateTime,
                StartPosition = tourObject.StartPosition,
                TourHash = tourObject.TourHash
            });
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] Tour incoming)
        {
            incoming.Id = Guid.NewGuid();

            var hash = incoming.Id.Hash();
            incoming.TourHash = hash;
            await _cacheService.SetCacheValueAsync(hash, incoming.Id.ToString());
            await _tourService.Set(incoming);

            return Ok(incoming);
        }
    }
}
