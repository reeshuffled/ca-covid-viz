var map = L.map('map').setView([39.265072,-122.0689133], 6);
L.tileLayer('https://api.maptiler.com/maps/basic/{z}/{x}/{y}.png?key=vyE9xjzMt1ffUGVrSDPQ', {
    attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
}).addTo(map);
//var marker = L.marker([37.6046773, -120.0689133]).addTo(map);
map.addListener('click', function(e) {
    console.log(e);
    addMarker(e.latLng);
});

function addMarker(lat){
    let marker = new L.marker({
        map:map,
        position:lat,
        draggable:true
    });
    markersArray.push(marker);

}