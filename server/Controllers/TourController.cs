using System;
using Microsoft.AspNetCore.Mvc;
using server.Models;

namespace server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TourController : ControllerBase
    {
        private readonly Storage Storage;

        public TourController(Storage storage)
        {
            Storage = storage;
        }

        [HttpGet]
        [Route("id")]
        [Route("{idHash}")]
        public IActionResult Get(string idHash)
        {
            Guid id;
            if (idHash == null)
            {
                id = Storage.DefaultId;
            }
            else
            {
                if(!Storage.Hashes.TryGetValue(idHash, out id))
                {
                    return NotFound("Hash");
                }
            }

            if(!Storage.Tours.TryGetValue(id, out var tour))
            {
                return NotFound("Tour");
            }

            return Ok(new Tour
            {
                Name = tour.Name
            });
        }

        [HttpPost]
        public IActionResult Post([FromBody] Tour incoming)
        {
            var id = Guid.NewGuid();

            var tour = new Tour
            {
                Id = id,
                Name = incoming.Name
            };
            Storage.Tours.AddOrUpdate(id, tour);
            
            var hash = id.Hash();
            Storage.Hashes.Add(hash, id);

            return Ok(hash);
        }
    }
}
