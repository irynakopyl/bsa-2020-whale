﻿using System;
using System.Collections.Generic;
using System.Text;

namespace Whale.BLL.Exceptions
{
    public sealed class NotFoundException : Exception
    {
        public NotFoundException(string name, Guid id)
            : base($"Entity {name} with id ({id}) was not found.")
        {
        }

        public NotFoundException(string name) : base($"Entity {name} was not found.") { }
    }
}
