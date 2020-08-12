﻿using System;
using System.Collections.Generic;
using Whale.BLL.Services.Abstract;
using Whale.DAL;
using Whale.DAL.Models;
using System.Linq;
using AutoMapper;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Whale.Shared.DTO.Contact;
using Whale.BLL.Services.Interfaces;
using Whale.BLL.Exceptions;

namespace Whale.BLL.Services
{
    public class ContactsService:BaseService, IContactsService
    {
        public ContactsService(WhaleDbContext context, IMapper mapper) : base(context, mapper)
        {
        }

        public async Task<IEnumerable<ContactDTO>> GetAllContactsAsync(Guid ownerId)
        {
            var contacts = await _context.Contacts
                .Include(c => c.Owner)
                .Include(c => c.Contactner)
                .Where(c => c.OwnerId == ownerId).ToListAsync();

            return _mapper.Map<IEnumerable<ContactDTO>>(contacts);
        }

        public async Task<ContactDTO> GetContactAsync(Guid contactId)
        {
            var contact = await _context.Contacts
                .Include(c => c.Owner)
                .Include(c => c.Contactner)
                .FirstOrDefaultAsync(c => c.Id == contactId);

            if (contact == null) throw new NotFoundException("Contact", contactId.ToString());

            return _mapper.Map<ContactDTO>(contact);
        }

        public async Task<ContactDTO> CreateContactAsync(ContactCreateDTO contactDTO)
        {
            var entity = _mapper.Map<Contact>(contactDTO);

            var contact = _context.Contacts.FirstOrDefault(c => c.ContactnerId == contactDTO.ContactnerId && c.OwnerId == contactDTO.OwnerId);

            if (contact != null) throw new AlreadyExistsException("Contact");

            _context.Contacts.Add(entity);
            await _context.SaveChangesAsync();

            var createdContact = await _context.Contacts
                .Include(c => c.Owner)
                .Include(c => c.Contactner)
                .FirstAsync(c => c.Id == entity.Id);

            return _mapper.Map<ContactDTO>(createdContact);
        }

        public async Task UpdateContactAsync(ContactEditDTO contactDTO)
        {
            var entity = _context.Contacts.FirstOrDefault(c => c.Id == contactDTO.Id);

            if (entity == null) throw new NotFoundException("Contact", contactDTO.Id.ToString());

            entity.IsBlocked = contactDTO.IsBlocked;

            await _context.SaveChangesAsync();
        }

        public async Task<bool> DeleteContactAsync(Guid contactId)
        {
            var contact = _context.Contacts.FirstOrDefault(c => c.Id == contactId);

            if (contact == null) return false;

            _context.Contacts.Remove(contact);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<ContactDTO> CreateContactFromEmailAsync(string ownerEmail, string contactnerEmail)
        {
            if(ownerEmail == contactnerEmail)
                throw new BaseCustomException("You cannot add yourself to contacts");
            var owner = await _context.Users.FirstOrDefaultAsync(u => u.Email == ownerEmail);
            var contactner = await _context.Users.FirstOrDefaultAsync(u => u.Email == contactnerEmail);
            if (owner is null)
                throw new NotFoundException("Owner", ownerEmail);
            if (contactner is null)
                throw new NotFoundException("Contactner", contactnerEmail);

            var contact = await _context.Contacts
                .FirstOrDefaultAsync(c => c.ContactnerId == contactner.Id && c.OwnerId == owner.Id);
            if (contact is object)
                throw new AlreadyExistsException("Contact");

            contact = new Contact()
            {
                OwnerId = owner.Id,
                ContactnerId = contactner.Id,
                IsBlocked = false
            };
            _context.Contacts.Add(contact);
            await _context.SaveChangesAsync();
            return await GetContactAsync(contact.Id);
        }
    }
}
