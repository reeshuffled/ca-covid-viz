const map = L.map('map').setView([37.8, -96], 4);

// control that shows state info on hover
const info = L.control();

// global variable for cases
let cases = [];

/**
 * Initialize the UI components.
 */
(async function initUI() {
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox/light-v9',
        tileSize: 512,
        zoomOffset: -1
    }).addTo(map);
    
    // bind date input to get case data
    document.getElementById("dateInput").oninput = e => getCasesByDate(e.target.value);

    info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'info');
        this.update();
        return this._div;
    };

    info.update = function (props) {
        this._div.innerHTML = '<h4>US Cases</h4>' +  (props ?
            '<b>' + props.name + '</b><br />' + props.cases + ' cases<br /> ' + props.deaths + ' deaths<br />' : 'Hover over a county');
            //the stuff that needs are placeholders are props.cases and deaths. They need to take data from the database
    };

    info.addTo(map);
    
    // get the case data for today
    const today = new Date();
    await getCasesByDate(`${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`);

    // load the state GeoJSON data
    geojson = L.geoJson(statesData, {
        style: style,
        onEachFeature: onEachFeature
    }).addTo(map);
})();

// get color depending on population cases value
function getCases(d) {
    return d > 1000000 ? '#800026' :
            d > 80000  ? '#BD0026' :
            d > 60000  ? '#E31A1C' :
            d > 40000  ? '#FC4E2A' :
            d > 20000   ? '#FD8D3C' :
            d > 15000   ? '#FEB24C' :
            d > 10000   ? '#FED976' :
                        '#FFEDA0';
}

function style(feature) {
    return {
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7,
        fillColor: getCases(feature.properties.cases)//this is the a placeholder getCases needs to get the amount of cases from a database
    };
}



/**
 * A function that queries the API for case data for a specific date.
 * @param {String} date
 */
async function getCasesByDate(date) {
    // make a POST request to the /date endpoint of the Flask server
    const request = await fetch("/date", { 
        method: "POST",
        // let the server know we're POSTing JSON data
        headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
        },
        // stringify the JSON for transport
        body: JSON.stringify({ 
            date: date
        })
    });

    // get the response JSON data from the server
    const response = await request.json();
    const data = response.data;

    cases = data;

    document.getElementById("dateInput").value = response.date;
}

function highlightFeature(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 5,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }

    // find the case data for the county
    const caseData = cases.find(x => x.county == layer.feature.properties.name);

    // set the layer feature properties if there is case data
    layer.feature.properties.cases = caseData?.cases;
    layer.feature.properties.deaths = caseData?.deaths;

    info.update(layer.feature.properties);
}

var geojson;

function resetHighlight(e) {
    geojson.resetStyle(e.target);
    info.update();
}

function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
}

function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: zoomToFeature
    });

    if (layer.feature.properties.kind == "county")
    {
        const caseData = cases.find(x => x.county == layer.feature.properties.name);

        if (caseData != null)
        {
            layer.feature.properties.cases = caseData.cases;
            layer.feature.properties.deaths = caseData.deaths;

            layer.setStyle(style(feature));
        }
    }
}

map.attributionControl.addAttribution('Population data &copy; <a href="http://census.gov/">US Census Bureau</a>');


var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {

    var div = L.DomUtil.create('div', 'info legend'),
        grades = [
            0,
            10000,
            15000,
            20000,
            40000,
            60000,
            80000,
            1000000
        ],
        labels = [],
        from, to;

    for (var i = 0; i < grades.length; i++) {
        from = grades[i];
        to = grades[i + 1];

        labels.push(
            '<i style="background:' + getCases(from + 1) + '"></i> ' +
            from + (to ? '&ndash;' + to : '+'));
    }

    div.innerHTML = labels.join('<br>');
    return div;
};

legend.addTo(map);