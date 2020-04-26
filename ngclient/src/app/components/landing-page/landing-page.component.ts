import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { Tour } from 'src/app/models/Tour';
import { FormGroup, FormControl, FormBuilder } from '@angular/forms';

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss']
})
export class LandingPageComponent implements AfterViewInit {

  searchForm: FormGroup;
  searchField: FormControl;
  @ViewChild('mapTour', {static: false}) mapRef: ElementRef;
  serverUrl = environment.serverUrl;
  map: google.maps.Map;
  tourName = '';
  tourDate: Date = new Date();
  markedLocation: google.maps.LatLng;

  constructor(private http: HttpClient, private router: Router,private formBuilder: FormBuilder) { }
 ngOnInit():void{
  this.searchForm = this.formBuilder.group({
    search:[""]
  });
 }
  ngAfterViewInit(): void {
    var map = new google.maps.Map(document.getElementById('map'), {
      center: {lat: -33.8688, lng: 151.2195},
      zoom: 13
    });
    var card = document.getElementById('pac-card');
    var input = document.getElementById('pac-input') as HTMLInputElement;
    var types = document.getElementById('type-selector');
    var strictbounds = document.getElementById('strict-bounds-selector')  as HTMLInputElement;

    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(card);

    var autocomplete = new google.maps.places.Autocomplete(input);

    // Bind the map's bounds (viewport) property to the autocomplete object,
    // so that the autocomplete requests use the current map bounds for the
    // bounds option in the request.
    autocomplete.bindTo('bounds', map);

    // Set the data fields to return when the user selects a place.
    autocomplete.setFields(
        ['address_components', 'geometry', 'icon', 'name']);

    var infowindow = new google.maps.InfoWindow();
    var infowindowContent = document.getElementById('infowindow-content');
    infowindow.setContent(infowindowContent);
    var marker = new google.maps.Marker({
      map: map,
      anchorPoint: new google.maps.Point(0, -29)
    });

    autocomplete.addListener('place_changed', function() {
      infowindow.close();
      marker.setVisible(false);
      var place = autocomplete.getPlace();
      if (!place.geometry) {
        // User entered the name of a Place that was not suggested and
        // pressed the Enter key, or the Place Details request failed.
        window.alert("No details available for input: '" + place.name + "'");
        return;
      }

      // If the place has a geometry, then present it on a map.
      if (place.geometry.viewport) {
        map.fitBounds(place.geometry.viewport);
      } else {
        map.setCenter(place.geometry.location);
        map.setZoom(17);  // Why 17? Because it looks good.
      }
      marker.setPosition(place.geometry.location);
      marker.setVisible(true);

      var address = '';
      if (place.address_components) {
        address = [
          (place.address_components[0] && place.address_components[0].short_name || ''),
          (place.address_components[1] && place.address_components[1].short_name || ''),
          (place.address_components[2] && place.address_components[2].short_name || '')
        ].join(' ');
      }

      infowindowContent.children['place-icon'].src = place.icon;
      infowindowContent.children['place-name'].textContent = place.name;
      infowindowContent.children['place-address'].textContent = address;
      infowindow.open(map, marker);
    });

    // Sets a listener on a radio button to change the filter type on Places
    // Autocomplete.
    function setupClickListener(id, types) {
      var radioButton = document.getElementById(id);
      radioButton.addEventListener('click', function() {
        autocomplete.setTypes(types);
      });
    }

    setupClickListener('changetype-all', []);
    setupClickListener('changetype-address', ['address']);
    setupClickListener('changetype-establishment', ['establishment']);
    setupClickListener('changetype-geocode', ['geocode']);

   
  strictbounds.addEventListener('click', function() {
          console.log('Checkbox clicked! New state=' + this.checked);
          autocomplete.setOptions({strictBounds: this.checked});
        });
  }

  createTour() {
    const tourToCreate: Tour = {
      startPosition: {
        lat: this.markedLocation.lat(),
        lng: this.markedLocation.lng()
      },
      name: this.tourName,
      startDateTime: this.tourDate,
    };

     if (this.tourName !== '') {
     this.http.post(this.serverUrl + 'api/tour', tourToCreate).toPromise().then((tour: Tour) => {
     if (tour) {
        this.navigateToTour(tour.tourHash);
        }
      }).catch((err: HttpErrorResponse) => {
         console.log('Creating tour failed.', err);
       });
     }
     
  }

  private navigateToTour(hash: any) {
    this.router.navigate([`/guide/${hash}`]);
  }

}
