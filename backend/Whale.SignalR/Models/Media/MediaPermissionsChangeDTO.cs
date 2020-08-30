﻿namespace Whale.SignalR.Models.Media
{
    public class MediaPermissionsChangeDTO
    {
        public string ChangedParticipantConnectionId { get; set; }
        public bool IsVideoAllowed { get; set; }
        public bool IsAudioAllowed { get; set; }
        public bool IsVideoActive { get; set; }
        public bool IsAudioActive { get; set; }
    }
}