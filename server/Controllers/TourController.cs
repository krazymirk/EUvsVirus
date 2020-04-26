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
                return StatusCode(403);
            }

            var tour = await _tourService.Get(idHash);

            return Ok(new Tour
            {
                Name = tour.Name,
                StartDateTime = tour.StartDateTime,
                StartPosition = tour.StartPosition,
                TourHash = tour.TourHash
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
