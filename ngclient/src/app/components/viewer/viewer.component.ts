import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { HubConnectionBuilder } from '@microsoft/signalr';
import * as SimplePeer from 'simple-peer';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.scss']
})
export class ViewerComponent implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', {static: false}) pano: ElementRef;

  serverUrl = environment.serverUrl;

  streetView: google.maps.StreetViewPanorama;
  id: string;
  decoder: TextDecoder;

  videoMuted = false;
  stream: any;
  viewer: any;

  constructor(private route: ActivatedRoute) {
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

    const hubConnection = new HubConnectionBuilder()
    .withUrl(this.serverUrl + 'connect')
    .build();

    hubConnection.start().then(() => {
      this.viewer = new SimplePeer( { initiator: true });

      this.viewer.on('signal', signal => {
        hubConnection.invoke('SendVideoStarted', true, JSON.stringify(signal));
      });

      hubConnection.on('SignalToViewer', signal => {
        this.viewer.signal(JSON.parse(signal));
      });

      this.viewer.on('stream', stream => {
        const video = document.querySelector('video');
        this.stream = stream;
        this.addStreamToDom(stream, video);
      });

      this.viewer.on('data', (data) => {
        const decodedData = new TextDecoder('utf-8').decode(data);
        const mapinfo = JSON.parse(decodedData);
        console.log('========', mapinfo);

        const position = new google.maps.LatLng(mapinfo.lat, mapinfo.lng);
        this.streetView.setPosition(position);
      });
    });
  }

  changePosition() {
    // TODO: get position from guide from singnalR/webrtc
    const coordinates = new google.maps.LatLng(48.860294, 2.338629); // the Louver
    this.streetView.setPosition(coordinates);
    this.streetView.setPov({heading: 270, pitch: 0});
  }

  showHideGuideVideo() {
    this.videoMuted = !this.videoMuted;
    if (!this.videoMuted) {
      const video = document.querySelector('video');
      // TODO: recover streaming
      this.addStreamToDom(this.stream, video);
    }
  }

  addStreamToDom(stream, dom) {
    if ('srcObject' in dom) {
      dom.srcObject = stream;
    } else {
      dom.src = window.URL.createObjectURL(stream); // for older browsers
    }

    dom.play();
  }
}
