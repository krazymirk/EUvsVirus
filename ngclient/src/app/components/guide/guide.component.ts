import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy  } from '@angular/core';
import { HubConnectionBuilder, HubConnection, HubConnectionState } from '@microsoft/signalr';
import * as SimplePeer from 'simple-peer';
import { environment } from 'src/environments/environment';
import {  PositionInfo } from 'src/app/models/PanoInfo';
import { DataFormat, DataType } from 'src/app/models/DataFormat';
import { Abilities } from 'src/app/models/Abilities';
import { Observable, Subscriber, Subscription } from 'rxjs';
import { destroyStream, changeDomStream } from 'src/app/audioVideoHelpers';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Tour } from 'src/app/models/Tour';

interface PeerInfo {
  id: number;
  peer: SimplePeer.Instance;
  currentAbilities: Abilities;
  wantedAbilities: Abilities;
  connected?: boolean;
  audioStream?: MediaStream;
  videoStream?: MediaStream;
}

@Component({
  selector: 'app-guide',
  templateUrl: './guide.component.html',
  styleUrls: ['./guide.component.scss']
})
export class GuideComponent implements OnInit {
  @ViewChild('streetViewContainer', {static: false}) panoRef: ElementRef;
  @ViewChild('mapContainer', {static: false}) mapRef: ElementRef;
  @ViewChild('video', {static: false}) videoDom: ElementRef;

  serverUrl = environment.serverUrl;
  tourHash: string;
  tour: Tour;

  streetView: google.maps.StreetViewPanorama;
  map: google.maps.Map;
  guideId: string;

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
  decoder: TextDecoder;
  privateLinks: string[];
  publicLink: string;
  publicLinkVisible = false;
  privateLinksVisible = false;

  constructor(private route: ActivatedRoute, private http: HttpClient) { }

  ngOnInit(): void {
    this.route.params.pipe(take(1)).subscribe((params) => {
      this.tourHash = params.id;
    });

    // get tour
    this.http.get(environment.serverUrl + `api/tour/${this.tourHash}`).toPromise().then((tour: Tour) => {
      if (tour) {
        this.tour = tour;
        this.initializeMap();
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

    this.decoder = new TextDecoder('utf-8');
  }

  private setStartingPosition() {
    const position = new google.maps.LatLng(this.tour.startPosition.lat, this.tour.startPosition.lng);
    this.streetView.setPosition(position);
    this.map.setCenter(position);
  }

  toggleVideo() {
    this.abilities.video = !this.abilities.video;

    this.updateAbilities();
  }

  toggleAudio() {
    this.abilities.audio = !this.abilities.audio;

    this.updateAbilities();
  }

  getPrivateLinks() {
    const hardcodedCount = 5;
    // this.http.post(this.serverUrl + `api/link`, dataToSend).toPromise().then((links: string[]) => {
    //   this.privateLinks = links;
    // }).catch((err: HttpErrorResponse) => {
    //   console.log('Error getting private links', err);
    // });

    this.privateLinks = ['asdfadsf', 'sf', 'dsafdsafdsa',' safddsafdsa'];
  }

  getPublicLink() {
    // this.http.get(this.serverUrl + `api/link/${this.tourHash}`).toPromise().then((hash: string) => {
    //   this.publicLink = this.concatLink(hash);
    // }).catch((err: HttpErrorResponse) => {
    //   console.log('Error getting public link', err);
    // });

    this.publicLink = 'asfddsafadsfdsafasd';
  }

  concatLink(link: string) {
    return location.protocol + '//' + location.host + '/viewer/' + link;
  }

  togglePrivateLinks() {
    if (!this.privateLinks?.length) {
      this.getPrivateLinks();
    }
    this.privateLinksVisible = !this.privateLinksVisible;
  }

  togglePublicLink() {
    if (this.publicLink === '') {
      this.getPublicLink();
    }
    this.publicLinkVisible = !this.publicLinkVisible;
  }

  private updateAbilities(fromViewer?: boolean) {

    if (!fromViewer) {
      this.send({dataType: DataType.ABILITIES, body: this.abilities});
    }

    const viewers = this.getConnectedViewers();

    for (const viewer of viewers) {
      if (viewer.wantedAbilities.audio) {
        if (viewer.currentAbilities.audio) {
          if (!this.abilities.audio) {
            viewer.peer.removeStream(viewer.audioStream);
            destroyStream(viewer.audioStream);
            viewer.currentAbilities.audio = false;
            viewer.audioStream = undefined;
          }
        } else if (this.abilities.audio) {
          viewer.audioStream = this.audioStream.clone();
          viewer.peer.addStream(viewer.audioStream);
          viewer.currentAbilities.audio = true;
        }
      } else if (viewer.currentAbilities.audio){
        viewer.peer.removeStream(viewer.audioStream);
        destroyStream(viewer.audioStream);
        viewer.currentAbilities.audio = false;
        viewer.audioStream = undefined;
      }

      if (viewer.wantedAbilities.video) {
        if (viewer.currentAbilities.video) {
          if (!this.abilities.video) {
            viewer.peer.removeStream(viewer.videoStream);
            destroyStream(viewer.videoStream);
            viewer.currentAbilities.video = false;
            viewer.videoStream = undefined;
          }
        } else if (this.abilities.video) {
          viewer.videoStream = this.videoStream.clone();
          viewer.peer.addStream(viewer.videoStream);
          viewer.currentAbilities.video = true;
        }
      } else if (viewer.currentAbilities.video){
        viewer.peer.removeStream(viewer.videoStream);
        destroyStream(viewer.videoStream);
        viewer.currentAbilities.video = false;
        viewer.videoStream = undefined;
      }
    }
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
    this.sendPosition();
    this.hub.invoke('RegisterGuide', this.tour.tourHash);

    this.hub.on('SignalToGuide', (viewerId, viewerSignal) => {
      let viewer = this.viewers.find(v => v.id === viewerId);
      if (!viewer) {
        const peer = new SimplePeer({ initiator: false });
        viewer =  {id: viewerId, peer, currentAbilities: {}, wantedAbilities: this.abilities};
        this.viewers.push(viewer);

        viewer.peer.on('signal', signal => {
          this.hub.invoke('SendSignalToViewer', viewer.id, JSON.stringify(signal));
        });

        viewer.peer.on('connect', () => {
          viewer.connected = true;
          this.updateAbilities();
        });

        viewer.peer.on('data', data => this.onData(data, viewer));

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
      a.innerHTML = location.protocol + '//' + location.host + '/viewer/' + this.tour.tourHash;
    });

    this.hub.on('Question', this.onQuestion.bind(this));
  }

  onQuestion(question: string, from: string) {
    
  }

  onData(data: any, viewer: PeerInfo): void {
    const decoded = this.parseData(data);

    viewer.wantedAbilities = decoded.body;
    this.updateAbilities(true);
  }

  initializeMap(): void {

    const coordinates = new google.maps.LatLng(42.646859, 23.396585);

    this.map = new google.maps.Map(this.mapRef.nativeElement, {
      center: coordinates,
      zoom: 14
    });

    const mapOptions = {
      position: coordinates,
      pov: {
        heading: 270,
        pitch: 0
      },
      visible: true,
      streetViewControl: true,
      source: google.maps.StreetViewSource.DEFAULT,
      draggable: true,
      linksControl: true
    };

    this.streetView = new google.maps.StreetViewPanorama(this.panoRef.nativeElement, mapOptions);
    this.map.setStreetView(this.streetView);


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
    if (this.hub.state === HubConnectionState.Connected) {
      this.hub.invoke('SyncPosition', this.tour.tourHash, position.body.lat, position.body.lng);
    }

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

  private parseData(data): DataFormat {
    const dataString = this.decoder.decode(data);
    return JSON.parse(dataString);
  }


  get countConnected() {
    return this.viewers.filter(v => v.connected).length;
  }
}
