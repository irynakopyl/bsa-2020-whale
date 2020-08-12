import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeetingComponent } from './components/meeting/meeting.component';
import { SharedModule } from '@shared/shared.module';
import { FormsModule } from '@angular/forms';
import { AngularDraggableModule } from 'angular2-draggable';

@NgModule({
  declarations: [MeetingComponent],
  imports: [SharedModule, FormsModule, AngularDraggableModule],
})
export class MeetingPageModule {}
