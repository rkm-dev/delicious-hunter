const axios = require('axios');
import dompurify from 'dompurify';

//for the display of the quick-search results popup
function searchResultsHTML(stores) {
	return stores.map(store => {
		return `
			<a href="/stores/${store.slug}" class="search__result">
				<strong>${store.name}</strong>
			</a>
		`;
	}).join('');
};

function typeAhead(search) {
	if(!search) return;

	const searchInput = search.querySelector('input[name="search"]');
	const searchResults = search.querySelector('.search__results');

	searchInput.on('input', function() {
		if(!this.value) {
			searchResults.style.display = 'none';
			return;
		}

		searchResults.style.display = 'block';
		searchResults.innerHTML = '';

		axios.get(`/api/search?q=${this.value}`)
			 .then(res => {
			 	if(res.data.length){
			 		searchResults.innerHTML = dompurify.sanitize(searchResultsHTML(res.data));
			 		return;
			 	}
			 	//for no valid results
			 	searchResults.innerHTML = dompurify.sanitize(`<div class="search__result">No results for <strong>${this.value}</strong> found!</div>`);
			 }).catch(err => {
			 	console.error(err);
			 });
	});

	//handle the keyboard on the resultant list
	searchInput.on('keyup', (e) => {
		//looking for the up(keycode=38), down(keycode=40) and enter(keycode=13)
		if(![38, 40, 13].includes(e.keyCode)) {
			return; //skip if any other key
		}
		const activeClass = 'search__result--active';
		const current = search.querySelector(`.${activeClass}`);
		const items = search.querySelectorAll('.search__result');
		let next;
		if(e.keyCode === 40 && current) {
			next = current.nextElementSibling || items[0];
		}else if(e.keyCode === 40) {
			next = items[0];
		}else if(e.keyCode === 38 && current) {
			next = current.previousElementSibling || items[items.length - 1];
		}else if(e.keyCode === 38) {
			next = items[items.length - 1];
		}else if(e.keyCode === 13 && current.href) {
			window.location = current.href;
			return;
		}

		if(current) {
			current.classList.remove(activeClass);
		}
		next.classList.add(activeClass);
	});
}

export default typeAhead;