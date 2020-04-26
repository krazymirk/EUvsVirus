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

  constructor(private route: ActivatedRoute, private http: HttpClient) {
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
    this.route.params.pipe(take(1)).subscribe((params) => {
      this.id = params.id;
    });

    this.http.get(environment.serverUrl + `api/tour/${this.id}`).toPromise()
      .then((tour: Tour) => {
        if (tour) {
          this.tour = tour;
          this.hub = new HubConnectionBuilder()
            .withUrl(this.serverUrl + 'connect')
            .build();
          this.hub.start().then(this.hubStart.bind(this));
        }
      })
      .catch(err => {
        if (err instanceof HttpErrorResponse && err.status === 403) {
          alert('Your private link is already in use by someone.\nIf you haven`t shared the link with anyone, please refresh.');
          window.document.body.innerHTML = '';
        }
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
    this.hub.send('AskQuestion', this.id, this.question);
    this.question = '';
  }

  private sendAbilitiesToGuide() {
    this.updateAbilitiesProperty();
    const data = {dataType: DataType.ABILITIES, body: this.wantedAbilities};
    this.guidePeer.send(JSON.stringify(data));
  }

  private hubStart() {
    this.guidePeer = new SimplePeer( { initiator: true });

    this.guidePeer.on('signal', signal => {
      this.hub.invoke('SendSignalToGuide', this.id, JSON.stringify(signal));
    });
    this.hub.invoke('JoinTour', this.id);
    this.hub.on('SyncPosition', (lat, lng) => {
      if (!this.currentPosition) {
        this.updatePosition({lat, lng});
      }});

    this.hub.on('SignalToViewer', signal => {
      this.guidePeer.signal(JSON.parse(signal));
    });

    this.guidePeer.on('stream', (stream: MediaStream) => {
      if (stream.getVideoTracks().length) {
        this.videoStream = stream;
        this.changeVideoDomStream();
      } else if (stream.getAudioTracks().length) {
        this.audioStream = stream;
        this.changeAudioDomStream();
      }
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

    this.guidePeer.on('error', console.error);
  }

  private destroyStreams() {
    this.destroyAudioStream();
    this.destroyVideoStream();
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
