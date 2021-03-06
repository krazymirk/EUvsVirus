import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { GuideComponent } from './components/guide/guide.component';
import { ViewerComponent } from './components/viewer/viewer.component';
import { AppRoutingModule } from './app-routing.module';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { ChatComponent } from './components/chat/chat.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from './shared/material/material.module';
import { OwlDateTimeModule, OwlNativeDateTimeModule } from 'ng-pick-datetime';
import { FlexLayoutModule } from '@angular/flex-layout';
import { AvatarModule } from 'ngx-avatar';
import { TooltipComponent } from './components/chat/tooltip/tooltip.component';
import { TooltipDirective } from './components/chat/tooltip/tooltip.directive';
import { HithereComponent } from './components/hithere/hithere.component';
import { OWL_DATE_TIME_LOCALE } from 'ng-pick-datetime';

@NgModule({
  declarations: [
    AppComponent,
    GuideComponent,
    ViewerComponent,
    LandingPageComponent,
    ChatComponent,
    TooltipComponent,
    TooltipDirective,
    HithereComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MaterialModule,
    OwlDateTimeModule,
    OwlNativeDateTimeModule,
    FlexLayoutModule,
    AvatarModule
  ],
  providers: [{provide:OWL_DATE_TIME_LOCALE,useValue:'en-GB'}],
  bootstrap: [AppComponent],
  entryComponents: [HithereComponent]
})
export class AppModule { }
