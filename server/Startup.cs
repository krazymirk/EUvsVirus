using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using server.Models;

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
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseCors();
            }

            app.UseHttpsRedirection();

            app.UseRouting();

            app.UseAuthorization();

            app.UseCors(prodCORS);
            app.UseSpaStaticFiles();
            app.UseSpa(config => config.Options.SourcePath = "wwwroot");
            app.UseDefaultFiles();
            app.UseStaticFiles();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
                endpoints.MapHub<ConnectionHub>("/connect");
            });
        }

        private void InitData(Storage storage)
        {
            storage.Hashes.AddOrUpdate(storage.DefaultId.Hash(), storage.DefaultId);
            storage.Tours.AddOrUpdate(storage.DefaultId, new Tour { Id = storage.DefaultId, Name = "Best tour ever" });
        }
    }
}
