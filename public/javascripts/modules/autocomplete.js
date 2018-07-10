function autocomplete(input, latInput, lngInput) {
	if(!input) return; //if there is no input then skip ruuning this function
	const dropdown = new google.maps.places.Autocomplete(input);

	dropdown.addListener('place_changed', () => {
		const place = dropdown.getPlace();
		console.log(place);

		latInput.value = place.geometry.location.lat();
		lngInput.value = place.geometry.location.lng();
	});

	//this is to avoid the submission of the form on 'enter' key press, if someone is trying to select an option from the dropdown address options
	input.on('keydown', (e) => {
		if(e.keyCode === 13) 
			e.preventDefault();
	});
}

export default autocomplete;