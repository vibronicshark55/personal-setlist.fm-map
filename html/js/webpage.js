// Setlist.FM mapping tool

// Helper functions
// Format json data into HTML table
function jsonTable(data){
  var table,prop,key,row;
  if(data.length === 0){ return false; }

  table = '<table class="table table-striped table-hover">';
  table+= '<thead>';
  for(prop in data[0]){ // Column Headers
    if (data[0].hasOwnProperty(prop)) {
      table+= '<th>' + prop + '</th>';
    }
  }
  table+= '</thead><tbody>';
  for(key in data){ // Each row
    if (data.hasOwnProperty(key)) {
      table+= '<tr>';
      row = data[key];
      for(prop in row){
        if (row.hasOwnProperty(prop)) {
          table+= '<td>' + row[prop] + '</td>';
        }
      }
      table+= '</tr>';
    }
  }
  table+= '</tbody></table>';
  return table;
}

// Returns an object of all inputs used for the query
function getInputs() {
  var startdate     = $('#startdate input').val(),
      enddate       = $('#enddate input').val(),
      username      = $('#username input').val(),
      athlete_Id    = $('#athleteId').val()

  // Add values from grouping,region & custtype filter to their respective array
  $('#summary .checklist input:checked').each(function(a,b){summary.push($(b).val());});
  $('#following .checklist input:checked').each(function(a,b){following.push($(b).val());});
  $('#include_clubs .checklist input:checked').each(function(a,b){include_clubs.push($(b).val());});
  $('#include_map .checklist input:checked').each(function(a,b){include_map.push($(b).val());});

  return {
    username: username,
  }
}

// create layer group for markers
var marksLayerGroup = L.layerGroup();

// Display map div
function showMap(){
  window.map = L.map('map');

  L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  map.setView([0,0], 1);
}

function clearMap(){
  // clear current markers
  map.removeLayer(marksLayerGroup);
  marksLayerGroup = L.layerGroup();
}

function get_random_colour() {
  var letters = '0123456789ABCDEF'.split('');
  var colour = '#';
  for (var i = 0; i < 6; i++ )
  {
     colour += letters[Math.round(Math.random() * 15)];
  }
  return colour;
}

function onClick(e) {
  z = map.getZoom();
  if (z < 11) {
    z = 11;
  }
  map.setView(e.latlng, z);
 }

var customIconBlue = L.icon({
  iconUrl:'img/marker-15-blue.svg',
  iconSize: [30,30]
});

var customIconRed = L.icon({
  iconUrl:'img/marker-15-red.svg',
  iconSize: [30,30]
});

function plotMarkers(bounds, markArray){

  clearMap();

  // set new bounds
  map.flyToBounds(bounds,{padding:[50,50]})

  // loop over each marker and add to layer group
  markArray.forEach(function(mark){
    marker = L.marker([mark[1],mark[2]],{icon:customIconBlue}).bindPopup(mark[0]);
    marker.myCustomId = mark[0];
    marker.on('click', onClick);
    marker.on('mouseover', function (e) {
      this.openPopup();
    });
    marker.on('mouseout', function (e) {
      this.closePopup();
    });
    marksLayerGroup.addLayer(marker)
  });

  // add layer group to map
  marksLayerGroup.addTo(map);
}


// WEBSOCKETS CONNECTING TO KDB+
var ws = new WebSocket("ws://localhost:5600");
ws.binaryType = 'arraybuffer'; // Required by c.js
// WebSocket event handlers
ws.onopen = function () {
  $('#connecting').hide();
};
ws.onclose = function () {
  // Disable submit button
  $(this).attr("disabled",true);
  // Disable export button
//  $('#export').addClass("disabled");
};

ws.onmessage = function (event) {
  if(event.data){
    var edata = JSON.parse(deserialize(event.data)),
        name  = edata.name,
        data  = edata.data,
        markers = edata.markers,
        bounds = edata.bounds;

    // Enable submit button
    $('#submit').attr("disabled",false);

    // Map handling functionality
    if(edata.hasOwnProperty('markers')){
      plotMarkers(bounds,markers);
    }

    // Data handling functionality
    // Print database and table stats, and output table. Display error.
    if(edata.hasOwnProperty('data')){

      // Initial data about the database
      if(name === 'init'){
        // stylise field val into field: val
        $('#processing').hide();
        showMap();
      }

      // Output table data
      if(name === 'table'){

        // Build html table with data and fill in stats
        $('#processing').hide();
        $('#tableoutput').show();
        $('#tableoutput').html(jsonTable(data.data));

        // Enable export link
//        $('#export').removeClass("disabled");

        // Resize table cells
        $('#tableoutput tbody td, #tableoutput thead th').width($('#tableoutput').width()/$('#tableoutput thead th').length-10);
      }

    } else {
      $('#processing').hide();
      $('#error-msg').html(edata.error);
      // Show modal popup
      $('#error-modal').modal();
    }
  }
};
ws.error = function (error) {
  // hide processing
  $('#processing').hide();
  // Enable submit button
  $('#submit').attr("disabled",false);
  // Write error message
  $('#error-msg').html(error.data);
  // Show modal popup
  $('#error-modal').modal();
}

ws.ser = function (input) {
  return serialize(JSON.stringify(input));
}

// jQuery used for UI
$(function() {
  // When submit button is clicked, disabled buttons and send data over WebSocket
  $('#submit').click(function(){
    // Disable submit button on submit
    $(this).attr("disabled",true);
    $('#processing').show();
    // clear markers from map
    clearMap();
    // Disable export on submit
//    $('#export').addClass("disabled");
    // Send to kdb+ over websockets
    ws.send(ws.ser(getInputs()));
  });
});
