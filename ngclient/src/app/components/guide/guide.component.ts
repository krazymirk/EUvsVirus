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
import { ChatComponent } from '../chat/chat.component';
import { StartingPosition } from 'src/app/models/Position';

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
  @ViewChild('chat', {static: false}) chat: ChatComponent;
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
    audio: true
  };
  decoder: TextDecoder;
  privateLinks: string[];
  publicLink: string;
  publicLinkVisible = false;
  privateLinksVisible = false;
  povFocusedForViewers = false;

  linkCount: number = 5;

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
        this.setStartingPosition(tour.startPosition);
        this.hub.start().then(this.hubStart.bind(this));
      }
    });

    this.hub = new HubConnectionBuilder()
      .withUrl(this.serverUrl + 'connect')
      .build();

    this.ensureStreams().then(() => {
      this.changeVideoDomStream();
    });

    this.decoder = new TextDecoder('utf-8');
  }

  private setStartingPosition(startingPosition: StartingPosition) {
    const position = new google.maps.LatLng(startingPosition.lat, startingPosition.lng);
    this.streetView.setPosition(position);

    if (startingPosition.heading && startingPosition.pitch && startingPosition.zoom) {
      this.streetView.setPov({heading: startingPosition.heading, pitch: startingPosition.pitch});
      this.streetView.setZoom(startingPosition.zoom);
    }
    this.map.setCenter(position);
  }

  toggleVideo() {
    this.abilities.video = !this.abilities.video;

    this.toggledMedia();
  }

  toggleAudio() {
    this.abilities.audio = !this.abilities.audio;

    this.toggledMedia();
  }

  toggledMedia() {
    if (this.audioStream && !this.abilities.audio) {
      this.destroyAudioStream();
    }
    if (this.videoStream && !this.abilities.video) {
      this.destroyVideoStream();
    }

    this.ensureStreams().then(() => {
      if (this.videoStream) {
        this.changeVideoDomStream();
      }
      this.updateAbilities();
    });
  }

  getPrivateLinks() {
    if (!this.linkCount) {
      return;
    }
    this.http.post(this.serverUrl + `api/link/${this.tourHash}/${this.linkCount}`, {}).toPromise().then((links: string[]) => {
      this.privateLinks = links;
      this.linkCount = 5;
    }).catch((err: HttpErrorResponse) => {
      console.log('Error getting private links', err);
    });
  }

  getPublicLink() {
    this.http.get(this.serverUrl + `api/link/${this.tourHash}`).toPromise().then((hash: string) => {
      this.publicLink = this.concatLink(hash);
    }).catch((err: HttpErrorResponse) => {
      this.publicLink = this.concatLink(err.error.text);
      console.log('Error getting public link', err);
    });
  }

  concatLink(link: string) {
    return location.protocol + '//' + location.host + '/viewer/' + link;
  }

  togglePrivateLinks() {
    if (this.publicLinkVisible){
      this.publicLinkVisible = !this.publicLinkVisible;
    }
    this.privateLinksVisible = !this.privateLinksVisible;
  }

  togglePublicLink() {
    if (!this.publicLink) {
      this.getPublicLink();
    }
    if (this.privateLinksVisible){
      this.privateLinksVisible = !this.privateLinksVisible;
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
          this.hub.invoke('SendSignalToViewer', viewer.id, this.tourHash, JSON.stringify(signal));
        });

        viewer.peer.on('connect', () => {
          viewer.connected = true;
          this.ensureStreams().then(() => {
            this.updateAbilities();
          });
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
      this.guideId = id;
    });

    this.hub.on('Question', this.onQuestion.bind(this));
  }

  onQuestion(question: string, from: string) {
    this.chat.setmessage({message: question, name: from});
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

    this.streetView.addListener('pov_changed', () => {
      this.povFocusedForViewers = false;
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
      this.hub.invoke('SyncPosition', this.tour.tourHash, position.body.lat, position.body.lng,
                this.streetView.getPov().heading, this.streetView.getPov().pitch, this.streetView.getZoom());
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
    this.povFocusedForViewers = true;
  }

  toggleParticipants() {
    // show people connected
  }

  ensureStreams() {
    const promises: Promise<void>[] = [];
    if (!this.audioStream && this.abilities.audio) {
      promises.push(navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {
        this.audioStream = stream;
      }));
    }
    if (!this.videoStream && this.abilities.video) {
      promises.push(navigator.mediaDevices.getUserMedia({video: true}).then((stream) => {
        this.videoStream = stream;
      }));
    }

    return Promise.all(promises);
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
  copyLink(link, id){
    const selBox = document.createElement('textarea');
    selBox.style.position = 'fixed';
    selBox.style.left = '0';
    selBox.style.top = '0';
    selBox.style.opacity = '0';
    selBox.value = link;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand('copy');
    document.body.removeChild(selBox);
    const button = document.getElementById(id.currentTarget.id);
    button.innerText = 'Copied!';
    setTimeout(() => {
      button.innerText = 'Copy Link';
    }, 3000);
  }
}
