import { Component, OnInit, AfterViewInit, ViewChild, ElementRef  } from '@angular/core';
import { HubConnectionBuilder } from '@microsoft/signalr';
import * as SimplePeer from 'simple-peer';
import { environment } from 'src/environments/environment';
import {  PositionInfo } from 'src/app/models/PanoInfo';

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
  guide: any;
  panoInfo: PositionInfo;

  constructor() { }

  ngOnInit(): void {
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
      this.panoInfo.lng = this.streetView.getPosition().lng();
      this.panoInfo.lat = this.streetView.getPosition().lat();

      // TODO: Send coordinates to viewers
    });

    this.streetView.addListener('pov_changed', () => {
      const headingCell = document.getElementById('heading');
      const pitchCell = document.getElementById('pitch');
      headingCell.innerHTML = 'HEAD: ' + this.streetView.getPov().heading + '';
      pitchCell.innerHTML = 'PITCH: ' + this.streetView.getPov().pitch + '';
    });
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


    const hubConnection = new HubConnectionBuilder()
      .withUrl(this.serverUrl + 'connect')
      .build();

    hubConnection.start().then(() => {
      hubConnection.invoke('RegisterGuide');

      hubConnection.on('GuideId', id => {
        const a = document.querySelector('a');
        this.guideId = id;
        a.innerHTML = location.protocol + '//' + location.host + '/viewer/' + id;
      });

      hubConnection.on('SignalToGuide', (viewerId, signal) => {
        const guide = new SimplePeer({ initiator: false, stream });
        guide.on('signal', signal => {
          hubConnection.invoke('SendSignalToViewer', viewerId, JSON.stringify(signal));
        });
        guide.signal(JSON.parse(signal));

        const guide1 = guide;
        guide.on('connect', () => {
          this.guide = guide1;
          guide1.send(JSON.stringify(this.panoInfo));
        });
      });
    });
  }

  addStreamToDom(stream, dom) {
    if ('srcObject' in dom) {
      dom.srcObject = stream;
    } else {
      dom.src = window.URL.createObjectURL(stream); // for older browsers
    }

    dom.play();
  }

  deleteMedia() {
  }
}
