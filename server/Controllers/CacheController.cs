using Microsoft.AspNetCore.Mvc;
using server.Models;
using server.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CacheController : ControllerBase
    {
        private readonly ICacheService cacheService;
        public CacheController(ICacheService cacheService)
        {
            this.cacheService = cacheService;
        }

        [HttpGet("cache/{key}")]
        public async Task<IActionResult> GetCacheValue([FromRoute] string key)
        {
            var value = await this.cacheService.GetCacheValueAsync(key);

            if (string.IsNullOrEmpty(value))
            {
                return NotFound();
            }

            return Ok(value);
        }

        [HttpPost("cache")]
        public async Task<IActionResult> SetCacheValue([FromBody] NewCacheEntryRequest request)
        {
            await this.cacheService.SetCacheValueAsync(request.Key, request.Value);

            return Ok();
        }
    }
}
