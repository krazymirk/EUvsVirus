import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { HubConnectionBuilder, HubConnection } from '@microsoft/signalr';
import * as SimplePeer from 'simple-peer';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { DataFormat, DataType } from 'src/app/models/DataFormat';

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

  isBroadcasting = true;

  guidePeer: SimplePeer.Instance;

  hub: HubConnection;

  stream: MediaStream;

  currentPosition: google.maps.LatLng;
  currentHeading: google.maps.StreetViewPov;

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

    this.hub = new HubConnectionBuilder()
      .withUrl(this.serverUrl + 'connect')
      .build();

    this.hub.start().then(this.hubStart.bind(this));
  }

  changePosition() {
    // TODO: get position from guide from singnalR/webrtc
    const coordinates = new google.maps.LatLng(48.860294, 2.338629); // the Louver
    this.streetView.setPosition(coordinates);
    this.streetView.setPov({heading: 270, pitch: 0});
  }

  toggleVideo() {
    this.isBroadcasting = !this.isBroadcasting;
    if (this.isBroadcasting) {
      const video = document.querySelector('video');
      // TODO: recover streaming
      this.addStreamToDom(this.stream, video);
    }
  }

  toggleAudio() {
    // mute
  }

  private hubStart() {
    this.guidePeer = new SimplePeer( { initiator: true });

    this.guidePeer.on('signal', signal => {
      this.hub.invoke('SendSignalToGuide', this.id, JSON.stringify(signal));
    });

    this.hub.on('SignalToViewer', signal => {
      this.guidePeer.signal(JSON.parse(signal));
    });

    this.guidePeer.on('stream', stream => {
      this.stream = stream;

      const video = document.querySelector('video');
      this.addStreamToDom(stream, video);
    });

    this.guidePeer.on('data', data => {
      const parsed = this.parseData(data);
      if (parsed.dataType === DataType.HEADING) {
        this.updateHeading(parsed.body);
      } else if (parsed.dataType === DataType.POSITION) {
        this.updatePosition(parsed.body);
      }
    });
  }

  private updatePosition(positionData) {
    const position = new google.maps.LatLng(positionData.lat, positionData.lng);
    this.streetView.setPosition(position);
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

  private parseData(data): DataFormat {
    const dataString = this.decoder.decode(data);
    return JSON.parse(dataString);
  }

  addStreamToDom(stream: MediaStream, dom: HTMLVideoElement) {
    if ('srcObject' in dom) {
      dom.srcObject = stream;
    } else {
      (dom as any).src = window.URL.createObjectURL(stream); // for older browsers
    }

    dom.play();
  }
}
