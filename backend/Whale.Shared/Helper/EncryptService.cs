﻿using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Whale.Shared.Services;

namespace Whale.Shared.Helper
{
    public class  EncryptService
    {
        private readonly string _hash;
        public EncryptService(string hash)
        {
            _hash = hash;
        }
        public string EncryptString(string plainData)
        {
            SHA384 sha256Hash = SHA384.Create(_hash);
            byte[] bytes = sha256Hash.ComputeHash(Encoding.UTF8.GetBytes(plainData));
            StringBuilder builder = new StringBuilder();
            for (int i = 0; i < bytes.Length; i++)
            {
                builder.Append(bytes[i].ToString("x2"));
            }
            return builder.ToString();
        }
    }
}
