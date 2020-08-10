﻿using System;

namespace Whale.Shared.DTO.Meeting.MeetingMessage
{
    public class MeetingMessageDTO
    {
        public string Id { get; set; }
        public string AuthorId { get; set; }
        public string MeetingId { get; set; }

        public string Message { get; set; }
        public DateTime SentDate { get; set; }
    }
}