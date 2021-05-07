const map = L.map('map').setView([37.8, -96], 5);

// control that shows state info on hover
const countyInfoBox = L.control();
const prisonInfoBox = L.control();
const dateInput = document.getElementById("dateInput");

// global variables
let countiesGeoJson, prisonsGeoJson;
let cases = [];
const counties = [], prisons = [];

/**
 * Initialize the UI components.
 */
(async function initUI() {
    // add mapbox map data
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox/light-v9',
        tileSize: 512,
        zoomOffset: -1
    }).addTo(map);
     
    // add the cases info box element
    addInfoBox();
    addPrsnBox();

    // generate legend and add to map
    addMapLegend();
    addPrisonLegend();

    // add data attribution for map
    map.attributionControl.addAttribution('Population data &copy; <a href="http://census.gov/">US Census Bureau</a>');

    // bind date input to get case data
    dateInput.oninput = e => getCasesByDate(e.target.value);
    
    // get the case data for today
    const today = new Date();
    await getCasesByDate(`${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`);

    // load the state GeoJSON data
    countiesGeoJson = L.geoJson(statesData, {
        style: getCountyStyle,
        onEachFeature: (feature, layer) => {
            // bind mouseo and click events for highlighting and zooming
            layer.on({
                mouseover: highlightFeature,
                mouseout: resetHighlight,
                click: zoomToFeature
            });

            // if the feature is a county
            if (layer.feature.properties.kind == "county")
            {
                // add the feature to the counties array
                counties.push({
                    layer: layer,
                    feature: layer.feature
                });

                // find the case data for the county
                const caseData = cases.county.find(x => x.county == layer.feature.properties.name);

                // if there is case data found for the county
                if (caseData != null)
                {
                    // update the county cases and death properties
                    layer.feature.properties.cases = caseData.cases;
                    layer.feature.properties.deaths = caseData.deaths;
                    layer.feature.properties.date = caseData.date;

                    // update the style because the case data changed
                    layer.setStyle(getCountyStyle(feature));
                }
            }
        }
    }).addTo(map);

    prisonsGeoJson = L.geoJson(prisonData, {
        pointToLayer: (feature, latlng) => {
            return L.circleMarker(latlng, {
                radius: 10,
                fillColor: "#0",
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.5
            });
        },
        onEachFeature: (feature, layer) => {
            layer.on({
                mouseover: highlightPrisonFeature,
                mouseout: resetPrisonHighlight,
                //mouseover: highlightFeature
            });

            if (layer.feature.properties.kind == "prison")
            {
                // add the feature to the counties array
                prisons.push({
                    layer: layer,
                    feature: layer.feature
                });

                // find the case data for the county
                const prsnCaseData = cases.prison.find(x => x.name == layer.feature.properties.name);

                // if there is case data found for the county
                if (prsnCaseData != null)
                {
                    // update the county cases and death properties
                    layer.feature.properties.date = prsnCaseData.date;
                    layer.feature.properties.casesRes = prsnCaseData.residentsConfirmed;
                    layer.feature.properties.casesStaff = prsnCaseData.staffConfirmed;

                    layer.feature.properties.deathsRes = prsnCaseData.residentsDeaths;
                    layer.feature.properties.deathsStaff = prsnCaseData.staffDeaths;

                    layer.feature.properties.residentsRecovered = prsnCaseData.residentsRecovered;
                    layer.feature.properties.staffRecovered = prsnCaseData.staffRecovered;

                    layer.feature.properties.popFebTwenty = prsnCaseData.popFebTwenty;
                    layer.feature.properties.residentsPopulation = prsnCaseData.residentsPopulation;

                    layer.feature.properties.county = prsnCaseData.county;
                    layer.feature.properties.staffRecovered = prsnCaseData.staffRecovered;

                    lat = prsnCaseData.latitude;
                    lng = prsnCaseData.longitude;

                    // update the style because the case data changed
                    layer.setStyle({
                        weight: 2,
                        opacity: 1,
                        color: 'white',
                        fillOpacity: 0.5,
                        fillColor: getPrisonColor(feature)
                    });
                }
            }
        }
    }).addTo(map);
})();

/**
 * Add the cases info box element.
 */
function addInfoBox() {
    countyInfoBox.onAdd = function(map) {
        this._div = L.DomUtil.create('div', 'info');

        this.update();

        return this._div;
    };

    countyInfoBox.update = function(props) {
        this._div.innerHTML = '<h4>US Cases</h4>' +  (props ?
            '<b>' + props.name + '</b><br />' + props.cases + ' cases<br /> ' + props.deaths + ' deaths<br />'  + 
            ' Last reported: <br /> ' + props.date + ' <br />': 'Hover over a county');
    };

    countyInfoBox.addTo(map);
}

function addPrsnBox() {
    prisonInfoBox.onAdd = function(map) {
        this._div = L.DomUtil.create('div', 'info');

        this.update();

        return this._div;
    };

    prisonInfoBox.update = function(props) {
        if (props)
        {
            var cases = parseInt(props.residentsConfirmed, 10) + parseInt(props.staffConfirmed, 10)
        }

        // ToDo: Create an if statement for NaN for casesRes, casesStaff, deathsRes, deathsStaff, resRecovered, staffRecovered, popFebTwenty and adjust innerHTML accordingly
        this._div.innerHTML = '<h4>Prison Cases</h4>' +  (props ?
            '<b>' + props.name +'</b><br />' + props.residentsConfirmed + ' resident cases<br /> ' + props.staffConfirmed + ' staff cases<br />'  + 
            props.residentsDeaths + ' resident deaths<br />' + props.staffDeaths + ' staff deaths<br />' + props.residentsRecovered + ' resident recovered <br /> ' +
            props.staffRecovered + ' staff recovered <br /> ' + props.popFebTwenty + ' total Population <br />' +
            ' Last reported: <br /> ' + props.date + ' <br />': 'Hover over a prison');
    };

    prisonInfoBox.addTo(map);
}


/**
 * A function that queries the API for case data for a specific date.
 * @param {String} date
 */
async function getCasesByDate(date) {
    // make sure a date is valid before doing anything
    if (new Date(date) == "Invalid Date") return;

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

    // update cases global variable with fetched data
    cases = {
        county: response.countyData,
        prison: response.prisonData
    };

    /**
     * set the date input to the date in the JSON response, this is necessary in
     * case of date rollbacks because we don't have data for that date
     */
    dateInput.value = response.countyDataDate;

    // update the county coloring by case data
    counties.forEach(county => {
        // find the case data for the county
        const caseData = cases.county.find(x => x.county == county.layer?.feature.properties.name);

        // if there is case data found for the county
        if (caseData != null)
        {
            // update the county cases and death properties
            county.feature.properties.cases = caseData.cases;
            county.feature.properties.deaths = caseData.deaths;
            county.feature.properties.date = response.date;

            // update the style because the case data changed
            county.layer.setStyle(getCountyStyle(county.feature));
        }
        else
        {
            county.feature.properties.cases = 0;
            county.feature.properties.deaths = 0;
            county.feature.properties.date = response.date;

            // update the style because the case data changed
            county.layer.setStyle(getCountyStyle(county.feature));
        }

        countyInfoBox.update(county.layer.feature.properties);
    });

    prisons.forEach(prison => {
        const layer = prison.layer;
        const feature = prison.feature;

        // find the case data for the county
        const prsnCaseData = cases.prison.find(x => x.name == layer.feature.properties.name) || {};

        // update the county cases and death properties
        layer.feature.properties.date = prsnCaseData.date;
        layer.feature.properties.casesRes = prsnCaseData.residentsConfirmed;
        layer.feature.properties.casesStaff = prsnCaseData.staffConfirmed;

        layer.feature.properties.deathsRes = prsnCaseData.residentsDeaths;
        layer.feature.properties.deathsStaff = prsnCaseData.staffDeaths;

        layer.feature.properties.residentsRecovered = prsnCaseData.residentsRecovered;
        layer.feature.properties.staffRecovered = prsnCaseData.staffRecovered;

        layer.feature.properties.popFebTwenty = prsnCaseData.popFebTwenty;
        layer.feature.properties.residentsPopulation = prsnCaseData.residentsPopulation;

        layer.feature.properties.county = prsnCaseData.county;
        layer.feature.properties.staffRecovered = prsnCaseData.staffRecovered;

        lat = prsnCaseData.latitude;
        lng = prsnCaseData.longitude;

        // update the style because the case data changed
        layer.setStyle({
            weight: 2,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.5,
            fillColor: getPrisonColor(feature)
        });
    });
}

/**
 * Create map legend for the choropleth colors for case numbers and add it to the
 * map.
 */
function addMapLegend() {
    const legend = L.control({position: 'bottomright'});

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
                '<i style="background:' + getFillColorByCases(from + 1) + '"></i> ' +
                from + (to ? '&ndash;' + to : '+'));
        }

        div.innerHTML +=  '<h4>Counties Legend</h4> ' + labels.join('<br>');

        return div;
    };

    legend.addTo(map);
}

/**
 * Create map legend for the prison colors for case numbers and add it to the
 * map.
 */
 function addPrisonLegend() {
    const myLegend = L.control({position: 'bottomleft'});

    myLegend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend'),
            grades = [
                0,
                .05,
                .1,
                .2,
                .3,
                .4,
                .5
            ],
            labels = [];
            let from, to;
            myGrades = [
                "No data",
                "5%",
                "10%",
                "20%",
                "30%",
                "40%",
                "50%"
            ],
            myLabels = []
            let here, there;

            for (var i = 0; i < grades.length; i++) {
                from = grades[i];
                to = grades[i + 1];
                here = myGrades[i]
                there = myGrades[i+1]
                labels.push(
                    '<i style="background:' + getPrisonColorCapita(from+.01) + '"></i> ' +
                    here + (there ? '&ndash;' + there : '+'));
            }
    
            div.innerHTML +=  '<h4>Prison Legend</h4> ' + labels.join('<br>');
    
            return div;
        };
    
        myLegend.addTo(map);
    }
    

/**
 * Get the corresponding color for a daily case number within a range.
 * @param {Number} d 
 * @returns {String} color
 */
function getFillColorByCases(d) {
    return d > 1000000 ? '#800026' :
            d > 80000  ? '#BD0026' :
            d > 60000  ? '#E31A1C' :
            d > 40000  ? '#FC4E2A' :
            d > 20000   ? '#FD8D3C' :
            d > 15000   ? '#FEB24C' :
            d > 10000   ? '#FED976' :
                        '#FFEDA0';
}

/**
 * Get the corresponding color for a daily case number within a range.
 * @param {Number} d 
 * @returns {String} color
 */
 function getPrisonColorCapita(d) {
    return d > .5 ? '#000000' :
            d > .4 ? '#2F4F4F' :
            d > .3  ? '#696969' :
            d > .2  ? '#808080' :
            d > .1 ? '#A9A9A9' :
            d > .05 ? '#FFFFFF' :
                        '#1E90FF';
}

/**
 * Return a feature style for a county that is colored by case data range.
 * @param {Feature} feature 
 * @returns {Style} style
 */
function getCountyStyle(feature) {
    return {
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.5,
        fillColor: getFillColorByCases(feature.properties.cases)//this is the a placeholder getCases needs to get the amount of cases from a database
    };
}

function getPrisonColor(feature) {
    // prefer resident population if reported, fallback feb 1, 2020 population count and "NA" if neither is reported
    let numResidents = "NA";

    // prefer resident population if reported
    if (feature.properties.residentsPopulation)
    {
        if (feature.properties.residentsPopulation != "NA")
        {
            numResidents = feature.properties.residentsPopulation;
        }
        // fallback feb 1, 2020 population count
        else if (feature.properties.popFebTwenty)
        {
            if (feature.properties.popFebTwenty != "NA")
            {
                numResidents = feature.properties.popFebTwenty;
            }
        }
    }

    return numResidents == "NA" ? "#0" : getPrisonColorCapita(feature.properties.casesRes / numResidents);
}

/**
 * Highlight a feature on hover.
 * @param {Event} e 
 */
function highlightFeature(e) {
    const layer = e.target;

    layer.setStyle({
        weight: 5,
        color: '#8A2BE2',
        fillOpacity: 0.5
    });

    //if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        //layer.bringToFront();
    //}

    // find the case data for the county
    const caseData = cases.county.find(x => x.county == layer.feature.properties.name);

    // set the layer feature properties if there is case data
    layer.feature.properties.cases = caseData?.cases;
    layer.feature.properties.deaths = caseData?.deaths;

    countyInfoBox.update(layer.feature.properties);
}

function highlightPrisonFeature(e) {
    const layer = e.target;

    layer.setStyle({
        weight: 4,
        color: '#8A2BE2',
        dashArray: 4,
        fillOpacity: 0.5,
        fillColor: '#F0FFFF'
    });

    //if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        //layer.bringToFront();
    //}

    // find the case data for the county
    const prsnCaseData = cases.prison.find(x => x.name == layer.feature.properties.name);

    // set the layer feature properties if there is case data
    if (prsnCaseData)
    {
        layer.feature.properties.residentsConfirmed = prsnCaseData?.residentsConfirmed;
        layer.feature.properties.staffConfirmed = prsnCaseData?.staffConfirmed;
        layer.feature.properties.residentsDeaths = prsnCaseData?.residentsDeaths;
        layer.feature.properties.staffDeaths = prsnCaseData?.staffDeaths;
        layer.feature.properties.residentsRecovered = prsnCaseData?.residentsRecovered;
        layer.feature.properties.staffRecovered = prsnCaseData?.staffRecovered;
        layer.feature.properties.popFebTwenty = prsnCaseData?.popFebTwenty;
        layer.feature.properties.date = prsnCaseData?.date;
    }
        
    // update the county cases and death properties
    prisonInfoBox.update(layer.feature.properties);
}

function resetHighlight(e) {
    countiesGeoJson.resetStyle(e.target);

    countyInfoBox.update();
}

function resetPrisonHighlight(e) {
    const layer = e.target;

    layer.setStyle({
        weight: 2,
        color: 'white',
        dashArray: 0,
        fillOpacity: 0.5,
        fillColor: getPrisonColor(layer.feature)
    });

    prisonInfoBox.update();
}

function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
}