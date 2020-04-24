using System;
using System.Security.Cryptography;
using System.Text;

namespace server
{
    public static class Hashing
    {
        public static string Hash(this Guid id, byte? shortenTo = 8)
        {
            using (SHA256 sha256Hash = SHA256.Create())  
            {  
                // ComputeHash - returns byte array  
                byte[] bytes = sha256Hash.ComputeHash(id.ToByteArray());  
  
                // Convert byte array to a string   
                StringBuilder builder = new StringBuilder();  
                for (int i = 0; i < bytes.Length; i++)  
                {  
                    builder.Append(bytes[i].ToString("x2"));  
                }

                var hash = builder.ToString();

                return shortenTo.HasValue ? hash.Substring(0, shortenTo.Value) : hash;
            }  
        }
    }
}
