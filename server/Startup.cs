using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.OpenApi.Models;
using server.BackgroungTasks;
using server.Models;
using server.Services;
using StackExchange.Redis;

namespace server
{
    public class Startup
    {
         readonly string prodCORS = "prodCORS";
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddControllers();
            services.AddSignalR();
            services.AddSpaStaticFiles(config => config.RootPath = "wwwroot");

            services.AddCors(options =>
            {
                options.AddDefaultPolicy(builder => builder
                    .WithOrigins("http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:4200")
                    .AllowAnyMethod()
                    .AllowAnyHeader()
                    .AllowCredentials()
                );
                options.AddPolicy(name: prodCORS,
                    builder =>
                    {
                        builder.AllowAnyMethod()
                                .AllowAnyHeader()
                                .AllowCredentials();
                    });
            });

            var storage = new Storage();
            InitData(storage);
            services.AddSingleton(storage);
            services.AddSingleton<IConnectionMultiplexer>(x => ConnectionMultiplexer.Connect(Configuration["RedisConnection"]));
            services.AddSingleton<ICacheService, RedisCacheService>();
            services.AddHostedService<RedisSubscriber>();

            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "CouchTravellerService", Version = "v1", Description = "CouchTraveller API endpoint service" });
                c.ResolveConflictingActions(apiDescriptions => apiDescriptions.First());
                string xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
                string xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
                c.IncludeXmlComments(xmlPath);
            });
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            // Enable middleware to serve generated Swagger as a JSON endpoint.
            app.UseSwagger();

            // Enable middleware to serve swagger-ui (HTML, JS, CSS, etc.),
            // specifying the Swagger JSON endpoint.
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "CouchTravellerService");
            });

            app.UseHttpsRedirection();

            app.UseRouting();
            app.UseAuthorization();
            if (env.IsDevelopment()) {
                app.UseCors();
            }
            else
            {
                app.UseCors(prodCORS);
            }
            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
                endpoints.MapHub<ConnectionHub>("/connect");
            });

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseSpaStaticFiles();
                app.UseSpa(config => config.Options.SourcePath = "wwwroot");
                app.UseDefaultFiles();
            }


        }

        private void InitData(Storage storage)
        {
            storage.Hashes.AddOrUpdate(storage.DefaultId.Hash(), storage.DefaultId);
            storage.Tours.AddOrUpdate(storage.DefaultId, new Tour { Id = storage.DefaultId, Name = "Best tour ever" });
        }
    }
}
