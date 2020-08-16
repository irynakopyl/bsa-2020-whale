﻿using System;
using System.Collections.Generic;
using System.Text;

namespace Whale.DAL.Models.Poll
{
    public class OptionResult
    {
        public string Option { get; set; }
        public int VoteCount { get; set; }
        public List<Voter> VotedUsers { get; set; } = new List<Voter>();
    }
}