﻿using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using Whale.Shared.DTO.Meeting;

namespace Whale.BLL.Interfaces
{
    public interface IMeetingService
    {
        Task<MeetingLinkDTO> CreateMeeting(MeetingCreateDTO meetingDto);

        Task<MeetingDTO> ConnectToMeeting(MeetingLinkDTO link);
    }
}