using Microsoft.Extensions.Hosting;
using StackExchange.Redis;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace server.BackgroungTasks
{
    public class RedisSubscriber : BackgroundService
    {
        private readonly IConnectionMultiplexer connectionMultiplexer;

        public RedisSubscriber(IConnectionMultiplexer connectionMultiplexer)
        {
            this.connectionMultiplexer = connectionMultiplexer;
        }

        protected override Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var subscriber = this.connectionMultiplexer.GetSubscriber();
            return subscriber.SubscribeAsync("messages", (channel, value) =>
            {
                Console.WriteLine($"The message content was: {value}");
            });
        }        
    }
}
