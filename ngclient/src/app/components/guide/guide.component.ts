import { Component, OnInit, AfterViewInit, ViewChild, ElementRef  } from '@angular/core';
import { HubConnectionBuilder, HubConnection } from '@microsoft/signalr';
import * as SimplePeer from 'simple-peer';
import { environment } from 'src/environments/environment';
import {  PositionInfo } from 'src/app/models/PanoInfo';
import { DataFormat, DataType } from 'src/app/models/DataFormat';

interface PeerInfo {
  id: number;
  peer: SimplePeer.Instance;
  connected?: boolean;
}

@Component({
  selector: 'app-guide',
  templateUrl: './guide.component.html',
  styleUrls: ['./guide.component.scss']
})
export class GuideComponent implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', {static: false}) pano: ElementRef;

  serverUrl = environment.serverUrl;

  streetView: google.maps.StreetViewPanorama;
  guideId: string;
  panoInfo: PositionInfo;

  viewers: PeerInfo[] = [];
  hub: HubConnection;
  stream: any;
  connected: boolean;


  constructor() { }

  ngOnInit(): void {
    this.hub = new HubConnectionBuilder()
      .withUrl(this.serverUrl + 'connect')
      .build();

    this.hub.start().then(this.hubStart.bind(this));
  }

  private send(data: any, ...viewers: PeerInfo[]) {
    const str = typeof data === 'object' ? JSON.stringify(data) : data.toString();

    if (!viewers || !viewers.length) {
      viewers = this.viewers.filter(v => v.connected);
    } else {
      const notConnected = viewers.filter(v => !v.connected);
      if (notConnected.length) {
        console.error('Tried to send to not connected peer', notConnected);
      } else {
        viewers = viewers.filter(v => v.connected);
      }
    }
    viewers.forEach(v => v.peer.send(str));
  }

  private hubStart() {
    this.hub.invoke('RegisterGuide');

    this.hub.on('SignalToGuide', (viewerId, signal) => {
      let viewer = this.viewers.find(v => v.id === viewerId);
      if (!viewer) {
        const peer = new SimplePeer({ initiator: false });
        viewer =  {id: viewerId, peer};
        this.viewers.push(viewer);

        viewer.peer.on('signal', signal => {
          this.hub.invoke('SendSignalToViewer', viewer.id, JSON.stringify(signal));
        });

        viewer.peer.on('connect', () => {
          viewer.connected = true;
          this.send(this.panoInfo, viewer);
          if (this.stream) {
            viewer.peer.addStream(this.stream);
          }
        });
      }
      viewer.peer.signal(JSON.parse(signal));
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

    this.streetView.addListener('pano_changed', () => {
      const panoCell = document.getElementById('pano-id');
      panoCell.innerHTML = 'PANO ID: ' + this.streetView.getPano();
    });

    this.streetView.addListener('position_changed', () => {
      const positionCell = document.getElementById('position');
      positionCell.innerHTML = 'POS: ' + this.streetView.getPosition() + '';

      this.sendPosition();
    });

    this.streetView.addListener('pov_changed', () => {
      const headingCell = document.getElementById('heading');
      const pitchCell = document.getElementById('pitch');
      headingCell.innerHTML = 'HEAD: ' + this.streetView.getPov().heading + '';
      pitchCell.innerHTML = 'PITCH: ' + this.streetView.getPov().pitch + '';
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

  toggleVideo() {
    if (document.querySelector('video').hasChildNodes()) {
        this.deleteMedia();
    } else {
        this.getMedia();
    }

    this.changeVideoButtonText();
  }

  changeVideoButtonText() {
    const defaultButtonText = 'Start video';
    const button = document.getElementById('start-video-btn') as HTMLButtonElement;

    if (button.value === defaultButtonText) {
        button.value = 'Stop video';
    } else {
        button.value = defaultButtonText;
    }
  }

  getMedia() {
    // get video/voice stream
    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    }).then(this.gotMedia.bind(this)).catch(() => {});
  }

  gotMedia(stream) {
    const video = document.querySelector('video');
    this.addStreamToDom(stream, video);
    this.stream = stream;

    const connected = this.viewers.filter(v => v.connected);
    connected.forEach(c => c.peer.addStream(stream));
  }

  addStreamToDom(stream, dom) {
    if ('srcObject' in dom) {
      dom.srcObject = stream;
    } else {
      dom.src = window.URL.createObjectURL(stream); // for older browsers
    }

    dom.play();
  }

  get countConnected() {
    return this.viewers.filter(v => v.connected).length;
  }

  deleteMedia() {
  }
}
