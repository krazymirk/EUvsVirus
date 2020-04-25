using System;

namespace server.Models
{
    public class Tour
    {
        public Guid Id { get; set; }

        public string Name { get; set; }

        public Position StartPosition { get; set; }

        public DateTime StartDateTime { get; set; }

        public string GuideName { get; set; }

        public string GuideLink { get; set; }

        public string GuestHash { get; set; }
    }
}
