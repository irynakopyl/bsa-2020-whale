import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppRoutingModule } from './routing/app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { AuthService } from './core/auth/auth.service';
import { TokenInterceptorService } from './core/auth/token-interceptor.service';
import { LandingPageModule } from './scenes/landing-page/landing-page.module';
import { MeetingPageModule } from './scenes/meeting-page/meeting-page.module';
import { ProfilePageModule } from './scenes/profile-page/profile-page.module';
import { ScheduleMeetingPageModule } from './scenes/schedule-meeting-page/schedule-meeting-page.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { HomePageModule } from './scenes/home-page/home-page.module';
import { SimpleModalModule } from 'ngx-simple-modal';
import { AngularDraggableModule } from 'angular2-draggable';
import { PagesModule } from './scenes/pages.module';
import { SharedModule } from '@shared/shared.module';
import { CanvasWhiteboardModule } from 'ng2-canvas-whiteboard';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    CoreModule,
    LandingPageModule,
    MeetingPageModule,
    ProfilePageModule,
    ScheduleMeetingPageModule,
    HttpClientModule,
    AngularDraggableModule,
    BrowserAnimationsModule,
    PagesModule,
    SharedModule,
    CanvasWhiteboardModule,
    ToastrModule.forRoot({
      tapToDismiss: true,
      timeOut: 5000,
      positionClass: 'toast-bottom-right',
      toastClass: 'ngx-toastr ui message toast-container',
      iconClasses: {
        error: 'negative',
        info: 'info',
        show: 'info',
        success: 'positive',
        warning: 'warning',
      },
    }),
    HomePageModule,
    SimpleModalModule,
  ],
  providers: [
    AuthService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptorService,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
