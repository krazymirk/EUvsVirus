import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { GuideComponent } from './components/guide/guide.component';
import { ViewerComponent } from './components/viewer/viewer.component';
import { LandingPageComponent } from './components/landing-page/landing-page.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
          path: '',
          component: LandingPageComponent,
      },
      {
        path: 'guide/:id',
        component: GuideComponent
      },
      {
        path: 'viewer/:id',
        component: ViewerComponent
      }
    ]
  }
];


@NgModule({
  imports: [
    RouterModule.forRoot(routes)
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
