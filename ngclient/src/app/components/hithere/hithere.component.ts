import { Component, OnInit, Inject, EventEmitter, Output } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Tour } from 'src/app/models/Tour';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { StartingPosition } from 'src/app/models/Position';
import { Observable, Subscription } from 'rxjs';

export interface HithereConfig {
  hub: signalR.HubConnection;
  tourHash: string;
  position: Subscription;
}

export interface HithereData {
  tour: Tour;
  nickname: string;
}


@Component({
  selector: 'app-hithere',
  templateUrl: './hithere.component.html',
  styleUrls: ['./hithere.component.scss']
})
export class HithereComponent implements OnInit {

  public nickname = '';
  private tour: Tour;

  constructor(
    @Inject(MAT_DIALOG_DATA) private config: HithereConfig,
    private dialogRef: MatDialogRef<HithereComponent>,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.http.get(environment.serverUrl + `api/tour/${this.config.tourHash}`).toPromise()
      .then((tour: Tour) => {
        if (tour) {
          this.tour = tour;
          this.config.position.next(tour.startPosition);
        }
      })
      .catch(err => {
        if (err instanceof HttpErrorResponse && err.status === 403) {
          alert('Your private link is already in use by someone.\nIf you haven`t shared the link with anyone, please refresh.');
          window.document.body.innerHTML = '';
        }
      });
  }


  close() {
    this.dialogRef.close({nickname: this.nickname, tour: this.tour});
  }
}
