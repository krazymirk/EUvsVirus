import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { HubConnectionBuilder, HubConnection } from '@microsoft/signalr';
import * as SimplePeer from 'simple-peer';
import { ActivatedRoute } from '@angular/router';
import { take, throwIfEmpty, ignoreElements } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { DataFormat, DataType } from 'src/app/models/DataFormat';
import { destroyStream, changeDomStream } from 'src/app/audioVideoHelpers';
import { Abilities } from 'src/app/models/Abilities';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Tour } from 'src/app/models/Tour';
import { MatDialogConfig, MatDialog } from '@angular/material/dialog';
import { HithereComponent, HithereConfig, HithereData } from '../hithere/hithere.component';

@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.scss']
})
export class ViewerComponent implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', {static: false}) pano: ElementRef;
  @ViewChild('video', {static: false}) videoDom: ElementRef<HTMLVideoElement>;
  @ViewChild('audio', {static: false}) audioDom: ElementRef<HTMLAudioElement>;

  serverUrl = environment.serverUrl;

  streetView: google.maps.StreetViewPanorama;
  id: string;
  decoder: TextDecoder;

  isBroadcasting = true;

  guidePeer: SimplePeer.Instance;

  hub: HubConnection;

  audioStream: MediaStream;
  videoStream: MediaStream;

  currentPosition: google.maps.LatLng;
  currentHeading: google.maps.StreetViewPov;

  guideAbilities: Abilities;

  wantedAbilities: Abilities = {audio: true, video: true};

  abilities: Abilities;
  question: string;
  tour: Tour;
  nickname: string;
  public isConnectionActive = false;

  constructor(private route: ActivatedRoute, private http: HttpClient, private dialog: MatDialog) {
  }

  ngAfterViewInit(): void {
    const coordinates = new google.maps.LatLng(42.646859, 23.396585);
    const mapOptions = {
      position: coordinates,     // {lat: 42.646859, lng: 23.396585} - Capital Fort
      pov: {
        heading: 270,
        pitch: 0
      },
      visible: true,
      streetViewControl: false,
      source: google.maps.StreetViewSource.OUTDOOR
    };

    this.streetView = new google.maps.StreetViewPanorama(this.pano.nativeElement, mapOptions);

    this.decoder = new TextDecoder('utf-8');
  }

  ngOnInit(): void {
    this.hub = new HubConnectionBuilder()
    .withUrl(this.serverUrl + 'connect')
    .build();

    this.route.params.pipe(take(1)).subscribe((params) => {
      this.id = params.id;

      this.dialog.open(HithereComponent, {
        disableClose: true,
        autoFocus: true,
        width: '50vw',
        data: {
          hub: this.hub,
          tourHash: this.id
        } as HithereConfig
      }).afterClosed().toPromise().then((data: HithereData) => {
        this.tour = data.tour;
        this.nickname = data.nickname;
        this.hub.start().then(this.hubStart.bind(this));
      });
    });
  }

  changePosition() {
    // TODO: get position from guide from singnalR/webrtc
    const coordinates = new google.maps.LatLng(48.860294, 2.338629); // the Louver
    this.streetView.setPosition(coordinates);
    this.streetView.setPov({heading: 270, pitch: 0});
  }

  toggleVideo() {
    this.wantedAbilities.video = !this.wantedAbilities.video;
    this.sendAbilitiesToGuide();
  }

  toggleAudio() {
    this.wantedAbilities.audio = !this.wantedAbilities.audio;
    this.sendAbilitiesToGuide();
  }

  sendQuestion(question: string) {
    this.hub.send('AskQuestion', this.id, this.question, this.nickname);
    this.question = '';
  }

  private sendAbilitiesToGuide() {
    this.updateAbilitiesProperty();
    const data = {dataType: DataType.ABILITIES, body: this.wantedAbilities};
    this.guidePeer.send(JSON.stringify(data));
  }

  private hubStart() {

    this.hub.invoke('JoinTour', this.id);
    this.hub.on('SyncPosition', (lat, lng) => {
      if (!this.currentPosition) {
        this.updatePosition({lat, lng});
      }});

    this.hub.on('SignalToViewer', signal => {
      this.guidePeer.signal(JSON.parse(signal));
    });


    this.hub.on('ActivateTour', () => {
      console.log('АЙДЕ');
      this.createPeer();
    });
    this.createPeer();
  }

  private destroyStreams() {
    this.destroyAudioStream();
    this.destroyVideoStream();
  }

  private createPeer() {
    if (this.guidePeer) {
      this.guidePeer.destroy();
    }
    this.guidePeer = new SimplePeer( { initiator: true });

    this.guidePeer.on('signal', signal => {
      this.hub.invoke('SendSignalToGuide', this.id, JSON.stringify(signal));
    });
    this.guidePeer.on('connect', (x) => {
      console.log('connect', x);
      this.isConnectionActive = true;
    });

    this.guidePeer.on('stream', (stream: MediaStream) => {
      if (stream.getVideoTracks().length) {
        this.destroyVideoStream();
        this.videoStream = stream;
        this.changeVideoDomStream();
      } else if (stream.getAudioTracks().length) {
        this.destroyAudioStream();
        this.audioStream = stream;
        this.changeAudioDomStream();
      }
    });

    this.guidePeer.on('close', (x) => {
      console.log('close', x);
      this.currentPosition = undefined;
      this.isConnectionActive = false;
    });
    this.guidePeer.on('data', data => {
      const parsed = this.parseData(data);
      if (parsed.dataType === DataType.HEADING) {
        this.updateHeading(parsed.body);
      } else if (parsed.dataType === DataType.POSITION) {
        this.updatePosition(parsed.body);
      } else if (parsed.dataType === DataType.ABILITIES) {
        this.updateAbilities(parsed.body);
      }
    });

    this.guidePeer.on('error', (e) => {
      console.error(e);
    });
  }

  private destroyAudioStream() {
    destroyStream(this.audioStream);
    this.audioStream = undefined;
  }

  private destroyVideoStream() {
    destroyStream(this.videoStream);
    this.videoStream = undefined;
  }

  private updatePosition(positionData) {
    this.currentPosition = new google.maps.LatLng(positionData.lat, positionData.lng);
    this.streetView.setPosition(this.currentPosition);
  }

  private updateHeading(povData) {
    this.streetView.setOptions({
      pov: {
        heading: povData.heading,
        pitch: povData.pitch,
      },
      zoom: povData.zoom
    });
  }

  private updateAbilities(abilities) {
    this.guideAbilities = abilities;

    this.updateAbilitiesProperty();
  }

  private updateAbilitiesProperty() {
    this.abilities = {
      audio: this.guideAbilities.audio && this.wantedAbilities.audio,
      video: this.guideAbilities.video && this.wantedAbilities.video
    };

    if (!this.abilities.audio && this.audioStream) {
      destroyStream(this.audioStream);
      this.audioStream = undefined;
    }

    if (!this.abilities.video && this.videoStream) {
      destroyStream(this.videoStream);
      this.videoStream = undefined;
    }
  }

  private parseData(data): DataFormat {
    const dataString = this.decoder.decode(data);
    return JSON.parse(dataString);
  }

  changeVideoDomStream() {
    changeDomStream(this.videoStream, this.videoDom.nativeElement);
  }

  changeAudioDomStream() {
    changeDomStream(this.audioStream, this.audioDom.nativeElement);
  }
}
