using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using server.Services;

namespace server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LinkController : ControllerBase
    {
        private readonly ICacheService _cacheService;
        private readonly TourService _tourService;

        public LinkController(ICacheService cacheService, TourService tourService)
        {
            _cacheService = cacheService;
            _tourService = tourService;
        }

        [HttpGet]
        [Route("{tourHash}")]
        public async Task<IActionResult> GetPublic(string tourHash)
        {
            var tour = await _tourService.GetByGuideHash(tourHash);
            if (tour.GuestHash == null)
            {
                tour.GuestHash = Guid.NewGuid().Hash();
                await _tourService.Set(tour);
            }
            await _tourService.SetHash(tour.GuestHash, tour.TourHash);

            return Ok(tour.GuestHash);
        }

        [HttpPost]
        [Route("{tourHash}/{count}")]
        public async Task<IActionResult> CreatePrivate(string tourHash, int count)
        {
            var tour = await _tourService.GetByGuideHash(tourHash);

            var hashes = new List<string>();
            for(int i = 0; i < count; i++)
            {
                var hash = "_" + Guid.NewGuid().Hash();
                hashes.Add(hash);
                // TODO: await together
                await _tourService.SetHash(hash, tour.TourHash);
            }
            
            return Ok(hashes);
        }
    }
}
