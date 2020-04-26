import { Component, AfterViewInit, ViewChild, ElementRef, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { Tour } from 'src/app/models/Tour';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StartingPosition } from 'src/app/models/Position';

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss']
})
export class LandingPageComponent implements AfterViewInit, OnInit {
  @ViewChild('mapContainer', { static: false }) mapRef: ElementRef;
  serverUrl = environment.serverUrl;
  map: google.maps.Map;
  tourName = '';
  tourDate: Date = new Date();
  markedLocation: google.maps.LatLng;
  transformDate: string;
  tourForm: FormGroup;
  adjustedPosition: StartingPosition;

  constructor(private http: HttpClient, private router: Router, private formBuilder: FormBuilder) { }

  ngOnInit(): void {
    this.transformDate = new DatePipe('en-GB').transform(this.tourDate, 'yyyy-MM-dd hh:mm:ss', 'GMT+1');
    this.tourDate = new Date(this.transformDate);

    this.tourForm = this.formBuilder.group({
      destination: ['', Validators.required],
      tourName: ['', Validators.required],
      tourDate: [Date, Validators.required]
    });

  }
  ngAfterViewInit(): void {
    this.map = new google.maps.Map(document.getElementById('mapTour'), {
      center: { lat: -33.8688, lng: 151.2195 },
      zoom: 13,
      mapTypeId: 'roadmap'
    });

    // Create the search box and link it to the UI element.
    const input = document.getElementById('pac-input') as any;
    const searchBox = new google.maps.places.SearchBox(input);

    // Bias the SearchBox results towards current map's viewport.
    this.map.addListener('bounds_changed', () => {
      searchBox.setBounds(this.map.getBounds());
    });

    let markers = [];
    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.
    searchBox.addListener('places_changed', () => {
      const places = searchBox.getPlaces();

      if (places.length === 0) {
        return;
      }

      // Clear out the old markers.
      markers.forEach((marker) => {
        marker.setMap(null);
      });
      markers = [];

      // For each place, get the icon, name and location.
      const bounds = new google.maps.LatLngBounds();
      places.forEach((place) => {
        if (!place.geometry) {
          console.log('Returned place contains no geometry');
          return;
        }
        const icon = {
          url: place.icon,
          size: new google.maps.Size(71, 71),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(17, 34),
          scaledSize: new google.maps.Size(25, 25)
        };

        // Create a marker for each place.
        markers.push(new google.maps.Marker({
          map: this.map,
          icon,
          title: place.name,
          position: place.geometry.location
        }));

        this.map.getStreetView().addListener('pano_changed', () => {
          if (this.map.getStreetView()) {
            this.adjustedPosition = {
              lat: (this.map.getStreetView() as any).location.latLng.lat(),
              lng: (this.map.getStreetView() as any).location.latLng.lng(),
              heading: this.map.getStreetView().getPov().heading,
              pitch: this.map.getStreetView().getPov().pitch,
              zoom: this.map.getStreetView().getZoom(),
            } as StartingPosition;
          }
       });

        this.map.getStreetView().addListener('position_changed', () => {
          this.adjustedPosition = {
            lat: this.map.getStreetView().getPosition().lat(),
            lng: this.map.getStreetView().getPosition().lng(),
            heading: this.map.getStreetView().getPov().heading,
            pitch: this.map.getStreetView().getPov().pitch,
            zoom: this.map.getStreetView().getZoom(),
          } as StartingPosition;
      });

        this.map.getStreetView().addListener('pov_changed', () => {
            this.adjustedPosition = {
              lat: this.map.getStreetView().getPosition().lat(),
              lng: this.map.getStreetView().getPosition().lng(),
              heading: this.map.getStreetView().getPov().heading,
              pitch: this.map.getStreetView().getPov().pitch,
              zoom: this.map.getStreetView().getZoom(),
            } as StartingPosition;
        });

        this.markedLocation = place.geometry.location;

        if (place.geometry.viewport) {
          // Only geocodes have viewport.
          bounds.union(place.geometry.viewport);
        } else {
          bounds.extend(place.geometry.location);
        }
      });
      this.map.fitBounds(bounds);
    });
  }

  createTour() {

    if (this.tourForm.invalid) {
      return;
    }

    if (!this.adjustedPosition) {
      this.adjustedPosition = {
        lat: this.markedLocation.lat(),
        lng: this.markedLocation.lng()
      };
    }

    const tourToCreate: Tour = {
      startPosition: {
        lat: this.adjustedPosition.lat,
        lng: this.adjustedPosition.lng,
        heading: this.adjustedPosition.heading,
        pitch: this.adjustedPosition.pitch,
        zoom: this.adjustedPosition.zoom
      },
      name: this.tourName,
      startDateTime: this.tourDate,
    };

    this.http.post(this.serverUrl + 'api/tour', tourToCreate).toPromise().then((tour: Tour) => {
      if (tour) {
        this.navigateToTour(tour.tourHash);
      }
    }).catch((err: HttpErrorResponse) => {
      console.log('Creating tour failed.', err);
    });
  }

  private navigateToTour(hash: any) {
    this.router.navigate([`/guide/${hash}`]);
  }

}
