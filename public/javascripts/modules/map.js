import axios from 'axios';
import { $ } from './bling';

//config for map
const mapOptions = {
	center: { lat: 43.2, lng: -79.8 },
	zoom: 10
};

//location and map
function loadPlaces(map, lat = 43.2, lng = -79.8) {
	axios.get(`/api/stores/near?lat=${lat}&lng=${lng}`)
		.then(res => {
			const places = res.data;
			if(!places.length) {
				alert('no places found!');
				return;
			}
			//for centering the map according to the locations of the stores
			const bounds = new google.maps.LatLngBounds();
			//for the popup info of each store location
			const infoWindow = new google.maps.InfoWindow();

			const markers = places.map(place => {
				const [placeLng, placeLat] = place.location.coordinates;
				const position = { lat: placeLat, lng: placeLng };
				bounds.extend(position);
				const marker = new google.maps.Marker({
					map: map,
					position: position
				});
				marker.place = place;
				//console.log(marker);
				return marker;
			});

			//show the details of the store, when clicked on a marker
			markers.forEach(marker => marker.addListener('click', function() {
				const html = `
					<div class="popup">
						<a href="/stores/${this.place.slug}">
							<img src="/uploads/${this.place.photo || 'store.png'}" alt="${this.place.name}" />
							<p>${this.place.name} - ${this.place.location.address}</p>
						</a>
					</div>
				`;
				infoWindow.setContent(html);
				infoWindow.open(map, this)
			}));

			//the map is ready, now zoom to appropriate level using bounds
			map.setCenter(bounds.getCenter());
			map.fitBounds(bounds); 
		})
}

//loading everything
function makeMap(mapDiv) {
	if(!mapDiv) return;

	const map = new google.maps.Map(mapDiv, mapOptions);
	loadPlaces(map);

	const input = $(['[name="geolocate"]']);
	const autocomplete = new google.maps.places.Autocomplete(input);
	autocomplete.addListener('place_changed', () => {
		const place = autocomplete.getPlace();
		loadPlaces(map, place.geometry.location.lat(), place.geometry.location.lng());
	});

}

export default makeMap;
