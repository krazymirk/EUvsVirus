import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { GuideComponent } from './components/guide/guide.component';
import { ViewerComponent } from './components/viewer/viewer.component';
import { AppRoutingModule } from './app-routing.module';
import { LandingPageComponent } from './components/landing-page/landing-page.component';

@NgModule({
  declarations: [
    AppComponent,
    GuideComponent,
    ViewerComponent,
    LandingPageComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
