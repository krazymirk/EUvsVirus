using System;
using System.Collections.Generic;
using server.Models;

namespace server
{
    public class Storage
    {
        public Guid DefaultId { get; } = new Guid("553f4744-f8f8-475b-aede-84598a15ca16"); // DefaultHash: 1387d9c1
        
        public Dictionary<Guid, Tour> Tours { get; } = new Dictionary<Guid, Tour>();
        
        public Dictionary<string, Guid> Hashes { get; } = new Dictionary<string, Guid>();
    }

    public static class DictionaryExtensions
    {
        public static bool AddOrUpdate<TKey, TValue>(this Dictionary<TKey, TValue> dict, TKey key, TValue value)
        {
            if (dict.ContainsKey(key))
            {
                dict[key] = value;
                return false;
            }

            dict.Add(key, value);
            return true;
        }
    }
}
