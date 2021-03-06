import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Notification } from '@shared/models/notification/notification';
import { OptionsText } from '@shared/models/notification/options-text';
import { OptionsAddContact } from '@shared/models/notification/options-add-contact';
import { NotificationTypeEnum } from '@shared/models/notification/notification-type-enum';
import { ContactService } from 'app/core/services/contact.service';
import { ToastrService } from 'ngx-toastr';
import {
  OptionsInviteMeeting,
  UnreadGroupMessageOptions,
} from '@shared/models';
import { Router } from '@angular/router';
import { UnreadMessageOptions } from '@shared/models/notification/unread-message-options';
import { CurrentChatService } from 'app/core/services/currentChat.service';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.sass'],
})
export class NotificationComponent implements OnInit {
  @Input() notification: Notification;
  @Output() delete: EventEmitter<string> = new EventEmitter<string>();
  @Output() openChatClicked = new EventEmitter<string>();
  @Output() openGroupChatClicked = new EventEmitter<string>();

  public message = '';
  public contactEmail = '';
  public isPendingContact = false;
  public isText = false;
  public isMeetingInvite = false;
  public show = true;
  public link = '';
  public unreadMessageOptions: UnreadMessageOptions;
  public unreadGroupMessageOptions: UnreadGroupMessageOptions;

  constructor(
    private contactService: ContactService,
    private toastr: ToastrService,
    private router: Router,
    private currentChat: CurrentChatService
  ) {}

  ngOnInit(): void {
    if (
      this.notification.notificationType ===
      NotificationTypeEnum.TextNotification
    ) {
      this.message = (JSON.parse(
        this.notification.options
      ) as OptionsText).message;
      this.isText = true;
      return;
    }
    if (
      this.notification.notificationType ===
      NotificationTypeEnum.AddContactNotification
    ) {
      this.contactEmail = (JSON.parse(
        this.notification.options
      ) as OptionsAddContact).contactEmail;
      this.message = `${this.contactEmail} wants add you to contacts.`;
      this.isPendingContact = true;
      return;
    }
    if (
      this.notification.notificationType ===
      NotificationTypeEnum.MeetingInviteNotification
    ) {
      this.contactEmail = (JSON.parse(
        this.notification.options
      ) as OptionsInviteMeeting).contactEmail;
      this.link = (JSON.parse(
        this.notification.options
      ) as OptionsInviteMeeting).link;
      this.message = `${this.contactEmail} invites you to meeting.`;
      this.isMeetingInvite = true;
      return;
    }
    if (
      this.notification.notificationType === NotificationTypeEnum.UnreadMessage
    ) {
      this.unreadMessageOptions = JSON.parse(this.notification.options);
      const count = this.unreadMessageOptions.unreadMessageIds.length;
      this.message =
        count <= 1
          ? `Unread message from ${this.unreadMessageOptions.senderName}.`
          : `${count} unread messages from ${this.unreadMessageOptions.senderName}.`;
    }
    if (
      this.notification.notificationType ===
      NotificationTypeEnum.UnreadGroupMessage
    ) {
      this.unreadGroupMessageOptions = JSON.parse(this.notification.options);
      const count = this.unreadGroupMessageOptions.unreadGroupMessages.length;
      this.message =
        count <= 1
          ? `Unread message from "${this.unreadGroupMessageOptions.groupName}" group.`
          : `${count} unread messages from "${this.unreadGroupMessageOptions.groupName}".`;
    }
  }

  onRejectContact(): void {
    this.contactService.DeletePendingContact(this.contactEmail).subscribe(
      (resp) => {
        this.toastr.success('Contact Rejected');
      },
      (error) => this.toastr.error(error.Message)
    );
    this.onClose();
  }
  onAcceptContact(): void {
    this.contactService.createContactByEmail(this.contactEmail).subscribe(
      (resp) => {
        this.toastr.success('Contact Accepted');
      },
      (error) => this.toastr.error(error.Message)
    );
    this.onClose();
  }
  onAcceptInvite(): void {
    const parts = this.link.split('/');
    this.router.navigate([`/redirection/${parts[parts.length - 1]}`]);
    this.onClose();
  }
  onClose(): void {
    this.delete.emit(this.notification.id);
    this.show = false;
  }

  onOpenChat(): void {
    if (this.router.url === '/home') {
      this.openChatClicked.emit(this.unreadMessageOptions.contactId);
    } else {
      this.currentChat.currentChatId = this.unreadMessageOptions.contactId;
      this.router.navigate([`/home`]);
    }
  }

  onOpenGroupChat(): void {
    if (this.router.url === '/home') {
      this.openGroupChatClicked.emit(this.unreadGroupMessageOptions.groupId);
    } else {
      this.currentChat.currentGroupChatId = this.unreadGroupMessageOptions.groupId;
      this.router.navigate([`/home`]);
    }
  }
}
