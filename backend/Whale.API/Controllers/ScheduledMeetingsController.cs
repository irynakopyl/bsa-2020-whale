﻿using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Whale.API.Models.ScheduledMeeting;
using Whale.API.Services;

namespace Whale.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ScheduledMeetingController : ControllerBase
    {
        private readonly ScheduledMeetingsService _scheduledMeetingService;

        public ScheduledMeetingController(ScheduledMeetingsService scheduledMeetingService)
        {
            _scheduledMeetingService = scheduledMeetingService;
        }

        [HttpGet("{Id}", Name = "ScheduledGet")]
        public async Task<IActionResult> GetAsync(Guid Id)
        {
            return Ok(await _scheduledMeetingService.GetAsync(Id));
        }

        [HttpPost]
        public async Task<IActionResult> CreateAsync([FromBody] ScheduledMeetingCreateDTO scheduled)
        {
            var createdContact = await _scheduledMeetingService.PostAsync(scheduled);
            return CreatedAtRoute("ScheduledGet", new { createdContact.Id }, createdContact);
        }

        [HttpPut]
        public async Task<IActionResult> UpdateAsync([FromBody] ScheduledMeetingDTO scheduled)
        {
            return Ok(await _scheduledMeetingService.UpdateAsync(scheduled));
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteAsync(Guid id)
        {
            await _scheduledMeetingService.DeleteAsync(id);
            return NoContent();
        }
    }
}
