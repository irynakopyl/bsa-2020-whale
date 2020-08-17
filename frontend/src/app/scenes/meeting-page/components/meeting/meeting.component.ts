import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  AfterContentInit,
  EventEmitter,
  OnDestroy,
  Inject,
} from '@angular/core';
import Peer from 'peerjs';
import { SignalRService } from 'app/core/services/signal-r.service';
import { environment } from '@env';
import { Subject } from 'rxjs';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { MeetingService } from 'app/core/services/meeting.service';
import { takeUntil, filter } from 'rxjs/operators';
import { Meeting } from '@shared/models/meeting/meeting';
import {
  MeetingSignalrService,
  SignalMethods,
} from 'app/core/services/meeting-signalr.service';
import { ToastrService } from 'ngx-toastr';
import { DOCUMENT } from '@angular/common';
import { BlobService } from 'app/core/services/blob.service';
import { MeetingConnectionData } from '@shared/models/meeting/meeting-connect';

import { HttpService } from 'app/core/services/http.service';
import { PollService } from 'app/core/services/poll.service';
import { PollCreateDto } from 'app/shared/models/poll/poll-create-dto';
import { MeetingMessage } from '@shared/models/meeting/message/meeting-message';
import { MeetingMessageCreate } from '@shared/models/meeting/message/meeting-message-create';
import { Participant } from '@shared/models/participant/participant';
import { ParticipantRole } from '@shared/models/participant/participant-role';
import { Statistics } from '@shared/models/statistics/statistics';
import { AuthService } from 'app/core/auth/auth.service';
import { UserMediaData } from '@shared/models/media/user-media-data';
import { CopyClipboardComponent } from '@shared/components/copy-clipboard/copy-clipboard.component';
import { SimpleModalService } from 'ngx-simple-modal';

@Component({
  selector: 'app-meeting',
  templateUrl: './meeting.component.html',
  styleUrls: ['./meeting.component.sass'],
})
export class MeetingComponent
  implements OnInit, AfterContentInit, AfterViewInit, OnDestroy {
  public meeting: Meeting;
  public meetingStatistics: Statistics;
  public isShowChat = false;
  public isShowParticipants = false;
  public isShowStatistics = false;
  public isScreenRecording = false;
  public isCameraOn = true;
  public isMicroOn = true;
  public isShowCurrentParticipantCard = true;

  @ViewChild('currentVideo') currentVideo: ElementRef;

  public peer: Peer;
  public connectedStreams: MediaStream[] = [];
  public mediaData: UserMediaData[] = [];
  public connectedPeers = new Map<string, MediaStream>();
  public messages: MeetingMessage[] = [];
  public msgText = '';
  public currentParticipant: Participant;
  public connectionData: MeetingConnectionData;

  private meetingSignalrService: MeetingSignalrService;
  public pollService: PollService;
  private unsubscribe$ = new Subject<void>();
  private currentUserStream: MediaStream;
  private currentStreamLoaded = new EventEmitter<void>();
  private contectedAt = new Date();
  private elem: any;
  private isMicrophoneMuted = false;
  private isCameraMuted = false;

  @ViewChild('mainArea', { static: false }) mainArea: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private meetingService: MeetingService,
    private signalRService: SignalRService,
    private toastr: ToastrService,
    private blobService: BlobService,
    private httpService: HttpService,
    @Inject(DOCUMENT) private document: any,
    private authService: AuthService,
    private simpleModalService: SimpleModalService
  ) {
    this.meetingSignalrService = new MeetingSignalrService(signalRService);
    this.pollService = new PollService(
      this.meetingSignalrService,
      this.httpService,
      this.toastr,
      this.unsubscribe$
    );
  }

  public async ngOnInit() {
    this.currentUserStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    this.currentStreamLoaded.emit();
    // create new peer
    this.peer = new Peer(environment.peerOptions);

    // when someone connected to meeting
    this.meetingSignalrService.signalUserConected$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(
        (connectData) => {
          console.log(connectData);
          console.log(this.meeting);

          if (connectData.peerId === this.peer.id) {
            this.pollService.getPollsAndResults(
              this.meeting.id,
              connectData.participant.user.email
            );
            return;
          }

          const index = this.meeting.participants.findIndex(
            (p) => p.id === connectData.participant.id
          );
          if (index >= 0) {
            this.meeting.participants[index] = connectData.participant;
          } else {
            this.meeting.participants.push(connectData.participant);
          }

          console.log('connected with peer: ' + connectData.peerId);
          this.connect(connectData.peerId);
          this.toastr.success('Connected successfuly');
        },
        (err) => {
          console.log(err.message);
          this.toastr.error(err.Message);
          this.leave();
        }
      );

    this.meetingSignalrService.participantConected$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(
        (participants) => {
          this.meeting.participants.push(...participants);
          this.currentParticipant = participants.find(
            (p) => p.user.email === this.authService.currentUser.email
          );

          this.createParticipantCard(this.currentParticipant);
        },
        (err) => {
          this.toastr.error(err.Message);
        }
      );

    // when someone left meeting
    this.meetingSignalrService.signalParticipantLeft$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((connectionData) => {
        this.meeting.participants = this.meeting.participants.filter(
          (p) => p.id !== connectionData.participant.id
        );

        if (this.connectedPeers.has(connectionData.peerId)) {
          this.connectedPeers.delete(connectionData.peerId);
        }

        const disconectedMediaDataIndex = this.mediaData.findIndex(
          (m) => m.stream.id == connectionData.participant.streamId
        );
        if (disconectedMediaDataIndex) {
          this.mediaData.splice(disconectedMediaDataIndex, 1);
          const secondName = ` ${
            connectionData.participant.user.secondName ?? ''
          }`;
          this.toastr.show(
            `${connectionData.participant.user.firstName}${secondName} left`
          );
        }
      });

    this.meetingSignalrService.signalParticipantDisconnected$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((participant) => {
        this.meeting.participants = this.meeting.participants.filter(
          (p) => p.id !== participant.id
        );

        this.connectedPeers = new Map(
          [...this.connectedPeers].filter(
            ([_, v]) => v.id !== participant.streamId
          )
        );

        const disconectedMediaDataIndex = this.mediaData.findIndex(
          (m) => m.stream.id == participant.streamId
        );
        if (disconectedMediaDataIndex) {
          this.mediaData.splice(disconectedMediaDataIndex, 1);
          const secondName = ` ${participant.user.secondName ?? ''}`;
          this.toastr.show(
            `${participant.user.firstName}${secondName} disconnected`
          );
        }
      });

    this.meetingSignalrService.meetingEnded$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(
        (connectionData) => {
          this.toastr.show('Meeting ended');
          this.leave();
        },
        (err) => {
          this.toastr.error('Error occured when ending meeting');
        }
      );

    this.meetingSignalrService.getMessages$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(
        (messages) => {
          this.messages = messages;
        },
        (err) => {
          this.toastr.error('Error occured when getting messages');
        }
      );

    this.meetingSignalrService.sendMessage$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(
        (message) => {
          this.messages.push(message);
        },
        (err) => {
          this.toastr.error('Error occured when sending message');
        }
      );

    // when peer opened send my peer id everyone
    this.peer.on('open', (id) => this.onPeerOpen(id));

    // when get call answer to it
    this.peer.on('call', (call) => {
      console.log('get call');
      // show caller
      call.on('stream', (stream) => {
        debugger;
        if (!this.connectedStreams.includes(stream)) {
          this.connectedStreams.push(stream);
          console.log(call.peer, 'call peer');

          const participant = this.meeting.participants.find(
            (p) => p.streamId == stream.id
          );

          this.createParticipantCard(participant);
        }
        this.connectedPeers.set(call.peer, stream);
      });

      // send mediaStream to caller
      call.answer(this.currentUserStream);
    });
  }

  public ngAfterViewInit(): void {
    this.elem = this.mainArea.nativeElement;
  }

  public ngAfterContentInit() {
    this.currentStreamLoaded.subscribe(
      () => (this.currentVideo.nativeElement.srcObject = this.currentUserStream)
    );
  }

  public ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  public showChat(): void {
    this.isShowChat = !this.isShowChat;
  }

  public leave(): void {
    let canLeave = true;
    if (this.currentParticipant?.role === ParticipantRole.Host) {
      canLeave = confirm('You will end current meeting!');
    }

    if (canLeave) {
      this.currentUserStream?.getTracks().forEach((track) => track.stop());
      this.destroyPeer();
      this.connectionData.participant = this.currentParticipant;
      this.meetingSignalrService.invoke(
        SignalMethods.OnParticipantLeft,
        this.connectionData
      );
      if (this.currentParticipant?.role === ParticipantRole.Host) {
        this.pollService.savePollResults(this.meeting.id);
      }
      this.router.navigate(['/home']);
    }
  }

  public startRecording(): void {
    this.blobService.startRecording();

    this.meetingSignalrService.invoke(
      SignalMethods.OnConferenceStartRecording,
      'Conference start recording'
    );

    this.isScreenRecording = true;
  }

  turnOffMicrophone(): void {
    if (!this.isMicrophoneMuted) {
      this.currentUserStream
        .getAudioTracks()
        .forEach((track) => (track.enabled = false));
    } else {
      this.currentUserStream
        .getAudioTracks()
        .forEach((track) => (track.enabled = true));
    }
    this.isMicrophoneMuted = !this.isMicrophoneMuted;
  }

  turnOffCamera(): void {
    if (!this.isCameraMuted) {
      this.currentUserStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = false));
    } else {
      this.currentUserStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = true));
    }
    this.isCameraMuted = !this.isCameraMuted;
  }

  stopRecording(): void {
    this.isScreenRecording = false;

    this.blobService.stopRecording();

    this.meetingSignalrService.invoke(
      SignalMethods.OnConferenceStopRecording,
      'Conference stop recording'
    );
  }

  public onStatisticsIconClick(): void {
    this.pollService.isShowPoll = false;
    this.pollService.isPollCreating = false;
    this.pollService.isShowPollResults = false;

    if (!this.meetingStatistics) {
      if (!this.meeting) {
        this.toastr.warning('Something went wrong. Try again later.');
        this.route.params.subscribe((params: Params) => {
          this.getMeeting(params[`link`]);
        });
      }
      this.meetingStatistics = {
        startTime: this.meeting.startTime,
        userJoinTime: this.contectedAt,
      };
    }
    this.isShowStatistics = !this.isShowStatistics;
  }

  public onCopyIconClick(): void {
    this.simpleModalService.addModal(CopyClipboardComponent, {
      message: this.document.location.href,
    });
  }

  public sendMessage(): void {
    this.meetingSignalrService.invoke(SignalMethods.OnSendMessage, {
      authorEmail: this.authService.currentUser.email,
      meetingId: this.meeting.id,
      message: this.msgText,
    } as MeetingMessageCreate);

    this.msgText = '';
  }

  public onEnterKeyPress(event: KeyboardEvent): void {
    event.preventDefault();
    if (this.msgText.length) {
      this.sendMessage();
    }
  }

  public goFullscreen(): void {
    if (this.elem.requestFullscreen) {
      this.elem.requestFullscreen();
    } else if (this.elem.mozRequestFullScreen) {
      this.elem.mozRequestFullScreen();
    } else if (this.elem.webkitRequestFullscreen) {
      this.elem.webkitRequestFullscreen();
    } else if (this.elem.msRequestFullscreen) {
      this.elem.msRequestFullscreen();
    }
  }

  public closeFullscreen(): void {
    if (this.document.exitFullscreen) {
      this.document.exitFullscreen();
    } else if (this.document.mozCancelFullScreen) {
      this.document.mozCancelFullScreen();
    } else if (this.document.webkitExitFullscreen) {
      this.document.webkitExitFullscreen();
    } else if (this.document.msExitFullscreen) {
      this.document.msExitFullscreen();
    }
  }

  // card actions
  public hideViewEventHandler(mediaDataId): void {
    debugger;
    this.mediaData = this.mediaData.filter((d) => d.id != mediaDataId);
    this.isShowCurrentParticipantCard = false;
  }

  public createParticipantCard(
    participant: Participant,
    shouldPrepend = false
  ): void {
    var newMediaData = {
      id: participant.id,
      userFirstName: participant.user.firstName,
      userLastName: participant.user.secondName,
      avatarUrl: participant.user.avatarUrl,
      isCurrentUser: participant.id === this.currentParticipant.id,
      isUserHost: participant.role == ParticipantRole.Host,
      stream:
        participant.id === this.currentParticipant.id
          ? this.currentUserStream
          : this.connectedStreams.find((s) => s.id === participant.streamId),
    };

    shouldPrepend
      ? this.mediaData.unshift(newMediaData)
      : this.mediaData.push(newMediaData);
  }

  // call to peer
  private connect(recieverPeerId: string) {
    const call = this.peer.call(recieverPeerId, this.currentUserStream);

    // get answer and show other user
    call.on('stream', (stream) => {
      this.connectedStreams.push(stream);
      const connectedPeer = this.connectedPeers.get(call.peer);
      if (!connectedPeer || connectedPeer.id !== stream.id) {
        var participant = this.meeting.participants.find(
          (p) => p.streamId == stream.id
        );
        this.createParticipantCard(participant);
        this.connectedPeers.set(call.peer, stream);
      }
    });
  }

  private destroyPeer() {
    this.peer.disconnect();
    this.peer.destroy();
  }

  private getMeeting(link: string): void {
    console.log('get meeting');
    this.meetingService
      .connectMeeting(link)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(
        (resp) => {
          this.meeting = resp.body;
          console.log('meeting: ', this.meeting);
          this.connectionData.meetingId = this.meeting.id;
          this.meetingSignalrService.invoke(
            SignalMethods.OnUserConnect,
            this.connectionData
          );
          this.meetingSignalrService.invoke(
            SignalMethods.OnGetMessages,
            this.meeting.id
          );
        },
        (error) => {
          console.log(error.message);
          this.leaveUnConnected();
        }
      );
  }

  private leaveUnConnected(): void {
    this.currentUserStream.getTracks().forEach((track) => track.stop());
    this.destroyPeer();
    this.router.navigate(['/home']);
  }

  // send message to all subscribers that added new user
  private onPeerOpen(id: string) {
    console.log('My peer ID is: ' + id);
    this.route.params.subscribe((params: Params) => {
      const link: string = params[`link`];
      const urlParams = new URLSearchParams(link);
      const groupId = urlParams.get('id');
      const groupPwd = urlParams.get('pwd');

      this.authService.user$
        .pipe(filter((user) => Boolean(user)))
        .subscribe((user) => {
          this.connectionData = {
            peerId: id,
            userEmail: this.authService.currentUser.email,
            meetingId: groupId,
            meetingPwd: groupPwd,
            streamId: this.currentUserStream.id,
            participant: this.currentParticipant, // this.currentParticipant is undefined here
          };
          this.getMeeting(link);
        });
    });
  }
}
