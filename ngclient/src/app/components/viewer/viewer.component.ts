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
  }

  ngOnInit(): void {
    this.route.params.pipe(take(1)).subscribe((params) => {
      this.id = params.id;
    });

    const hubConnection = new HubConnectionBuilder()
    .withUrl(this.serverUrl + 'connect')
    .build();

    hubConnection.start().then(() => {
      const viewer = new SimplePeer( { initiator: true });

      viewer.on('signal', signal => {
        hubConnection.invoke('SendSignalToGuide', this.id, JSON.stringify(signal));
      });

      hubConnection.on('SignalToViewer', signal => {
        viewer.signal(JSON.parse(signal));
      });

      viewer.on('stream', stream => {
        const video = document.querySelector('video');

        this.addStreamToDom(stream, video);
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
}
