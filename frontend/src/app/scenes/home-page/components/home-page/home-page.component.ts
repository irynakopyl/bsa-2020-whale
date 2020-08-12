import {
  Component,
  OnInit,
  EventEmitter,
  ViewChild,
  Output,
  OnDestroy,
} from '@angular/core';
import { User } from '@shared/models/user/user';
import { Contact } from '@shared/models/contact/contact';
import { SignalRService } from 'app/core/services/signal-r.service';
import { HttpService } from 'app/core/services/http.service';
import { HubConnection } from '@aspnet/signalr';
import { SimpleModalService } from 'ngx-simple-modal';
import { AddContactModalComponent } from '../add-contact-modal/add-contact-modal.component';
import { ContactsChatComponent } from '../contacts-chat/contacts-chat.component';
import { ToastrService } from 'ngx-toastr';
import { UpstateService } from 'app/core/services/upstate.service';
import { MeetingService } from 'app/core/services/meeting.service';
import { Router } from '@angular/router';
import { MeetingCreate } from '@shared/models/meeting/meeting-create';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { AuthService } from 'app/core/auth/auth.service';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.sass'],
})
export class HomePageComponent implements OnInit, OnDestroy {
  private counterComponent: ContactsChatComponent;
  contacts: Contact[];
  loggedInUser: User;
  contactsVisibility = true;
  groupsVisibility = false;
  chatVisibility = true;
  ownerEmail: string;
  private hubConnection: HubConnection;
  contactSelected: Contact;
  private unsubscribe$ = new Subject<void>();
  constructor(
    private toastr: ToastrService,
    private stateService: UpstateService,
    private signalRService: SignalRService,
    private httpService: HttpService,
    private simpleModalService: SimpleModalService,
    private meetingService: MeetingService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  ngOnInit(): void {
    this.stateService.getLoggedInUser().subscribe(
      (usr: User) => {
        this.loggedInUser = usr;
      },
      (error) => this.toastr.error(error.Message)
    );
    this.httpService.getRequest<Contact[]>('/api/contacts').subscribe(
      (data: Contact[]) => {
        this.contacts = data;
      },
      (error) => this.toastr.error(error.Message)
    );
    this.ownerEmail = this.authService.currentUser.email;
    console.log(this.ownerEmail);
  }

  addNewGroup(): void {
    console.log('group clicked!');
  }
  addNewContact(): void {
    this.simpleModalService
      .addModal(AddContactModalComponent)
      .subscribe((contact) => console.log(contact));
  }
  visibilityChange(event): void {
    this.chatVisibility = event;
    this.contactSelected = undefined;
  }
  onContactClick(contact: Contact): void {
    this.chatVisibility = false;
    this.contactSelected = contact;
  }

  onGroupClick(): void {
    this.chatVisibility = !this.chatVisibility;
  }
  isContactActive(contact): boolean {
    return this.contactSelected === contact;
  }
  createMeeting(): void {
    this.meetingService
      .createMeeting({
        settings: '',
        startTime: new Date(),
        anonymousCount: 0,
        isScheduled: false,
        isRecurrent: false,
      } as MeetingCreate)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(
        (resp) => {
          const meetingLink = resp.body;
          this.router.navigate([
            '/meeting-page',
            `?id=${meetingLink.id}&pwd=${meetingLink.password}`,
          ]);
        },
        (error) => console.log(error.message)
      );
  }
  goToPage(pageName: string): void {
    this.router.navigate([`${pageName}`]);
  }
}
export interface UserModel {
  id: number;
  firstName: string;
  lastName: string;
  image: string;
}
