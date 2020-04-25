import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy  } from '@angular/core';
import { HubConnectionBuilder, HubConnection } from '@microsoft/signalr';
import * as SimplePeer from 'simple-peer';
import { environment } from 'src/environments/environment';
import {  PositionInfo } from 'src/app/models/PanoInfo';
import { DataFormat, DataType } from 'src/app/models/DataFormat';
import { Abilities } from 'src/app/models/Abilities';
import { Observable, Subscriber, Subscription } from 'rxjs';
import { destroyStream, changeDomStream } from 'src/app/audioVideoHelpers';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Tour } from 'src/app/models/Tour';

interface PeerInfo {
  id: number;
  peer: SimplePeer.Instance;
  abilities: Abilities;
  connected?: boolean;
}

@Component({
  selector: 'app-guide',
  templateUrl: './guide.component.html',
  styleUrls: ['./guide.component.scss']
})
export class GuideComponent implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', {static: false}) pano: ElementRef;
  @ViewChild('video', {static: false}) videoDom: ElementRef;

  serverUrl = environment.serverUrl;
  tourId: string;
  tour: Tour;

  streetView: google.maps.StreetViewPanorama;
  guideId: string;
  panoInfo: PositionInfo;

  viewers: PeerInfo[] = [];
  hub: HubConnection;
  videoStream: MediaStream;
  audioStream: MediaStream;
  connected: boolean;
  isBroadcasting = false;
  abilities: Abilities = {
    video: true,
    audio: false
  };

  constructor(private route: ActivatedRoute, private http: HttpClient) { }

  ngOnInit(): void {

    this.route.params.pipe(take(1)).subscribe((params) => {
      this.tourId = params.id;
    });

    this.http.get(environment.serverUrl + 'idHash').toPromise().then((tour: Tour) => {
      if (tour) {
        this.tour = tour;
        this.setStartingPosition();
        this.hub.start().then(this.hubStart.bind(this));
      }
    });

    this.hub = new HubConnectionBuilder()
      .withUrl(this.serverUrl + 'connect')
      .build();


    this.getAudioVideoStreams().then(([a, v]) => {
      this.audioStream = a;
      this.videoStream = v;
      this.changeVideoDomStream();
    });
  }

  private updateStream(stream: MediaStream) {
    this.changeVideoDomStream();
  }

  private setStartingPosition() {
    const position = new google.maps.LatLng(this.tour.startPosition.lat, this.tour.startPosition.lat);
    this.streetView.setPosition(position);
  }

  toggleVideo() {
    this.abilities.video = !this.abilities.video;
  }

  toggleAudio() {
    this.abilities.audio = !this.abilities.audio;
  }

  private updateAbilities() {
    const viewers = this.getConnectedViewers();

    // viewers.forEach(v => v.peer.removeStream(this.stream));

    // this.getNewMedia().then(stream => {
    //   this.stream = stream;

    //   viewers.forEach(v => v.peer.addStream(this.stream.));
    // });
  }

  private getConnectedViewers() {
    return this.viewers.filter(v => v.connected);
  }

  private send(data: DataFormat, ...viewers: PeerInfo[]) {
    const str = JSON.stringify(data);

    if (!viewers || !viewers.length) {
      viewers = this.getConnectedViewers();
    } else {
      const notConnected = viewers.filter(v => !v.connected);
      if (notConnected.length) {
        console.error('Tried to send to not connected peer', notConnected);
      } else {
        viewers = viewers.filter(v => v.connected);
      }
    }

    for (const v of viewers) {
      try {
        v.peer.send(str);
      } catch (e) {
        console.error('Error on trying to send to viewer', e, v);
        const index = this.viewers.indexOf(v);
        this.viewers.splice(index, 1);
      }
    }
  }

  private hubStart() {
    this.hub.invoke('RegisterGuide', this.tour.idHash);

    this.hub.on('SignalToGuide', (viewerId, viewerSignal) => {
      let viewer = this.viewers.find(v => v.id === viewerId);
      if (!viewer) {
        const peer = new SimplePeer({ initiator: false });
        viewer =  {id: viewerId, peer, abilities: this.abilities};
        this.viewers.push(viewer);

        viewer.peer.on('signal', signal => {
          this.hub.invoke('SendSignalToViewer', viewer.id, JSON.stringify(signal));
        });

        viewer.peer.on('connect', () => {
          viewer.connected = true;
          this.send(this.panoInfo as any, viewer);
          if (this.audioStream) {
            viewer.peer.addStream(this.audioStream);
          }
          if (this.videoStream) {
            viewer.peer.addStream(this.videoStream);
          }
        });

        viewer.peer.on('close', () => {
          const index = this.viewers.indexOf(viewer);
          this.viewers.splice(index, 1);
        });

        viewer.peer.on('error', console.error);
      }
      viewer.peer.signal(JSON.parse(viewerSignal));
    });

    this.hub.on('GuideId', id => {
      const a = document.querySelector('a');
      this.guideId = id;
      a.innerHTML = location.protocol + '//' + location.host + '/viewer/' + id;
    });
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
    this.panoInfo = {
      lat: coordinates.lat(),
      lng: coordinates.lng(),
      heading: mapOptions.pov.heading,
      pitch: mapOptions.pov.pitch
    };

    this.streetView.addListener('position_changed', () => {
      this.sendPosition();
    });
  }

  sendPosition() {
    const position: DataFormat = {
      dataType: DataType.POSITION,
      body: {
        lat: this.streetView.getPosition().lat(),
        lng: this.streetView.getPosition().lng()
      }
    };
    this.hub.invoke('SyncPosition', position.body.lat, position.body.lng);

    this.send(position);
  }

  sendHeading() {
    const heading: DataFormat = {
      dataType: DataType.HEADING,
      body: {
        heading: this.streetView.getPov().heading,
        pitch: this.streetView.getPov().pitch,
        zoom: this.streetView.getZoom()
      }
    };

    this.send(heading);
  }

  changeVideoButtonText() {
    const defaultButtonText = 'Start video';
    const button = document.getElementById('start-video-btn') as HTMLButtonElement;
  }

  toggleParticipants() {
    // show people connected
  }

  getAudioVideoStreams() {
    this.destroyStreams();

    const audioPromise = navigator.mediaDevices.getUserMedia({audio: true});
    const videoPromise = navigator.mediaDevices.getUserMedia({video: true});

    return Promise.all([audioPromise, videoPromise]);
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

  changeVideoDomStream() {
    changeDomStream(this.videoStream, this.videoDom.nativeElement);
  }

  get countConnected() {
    return this.viewers.filter(v => v.connected).length;
  }
}
