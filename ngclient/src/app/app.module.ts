import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { GuideComponent } from './components/guide/guide.component';
import { ViewerComponent } from './components/viewer/viewer.component';
import { AppRoutingModule } from './app-routing.module';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { ChatComponent } from './components/chat/chat.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from './shared/material/material.module';
import { OwlDateTimeModule, OwlNativeDateTimeModule } from 'ng-pick-datetime';

@NgModule({
  declarations: [
    AppComponent,
    GuideComponent,
    ViewerComponent,
    LandingPageComponent,
    ChatComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    BrowserAnimationsModule,
    MaterialModule,
    OwlDateTimeModule,
    OwlNativeDateTimeModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
