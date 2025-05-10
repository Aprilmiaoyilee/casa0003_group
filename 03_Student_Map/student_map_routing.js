mapboxgl.accessToken =
  "pk.eyJ1IjoiYWlsYWdyYW50MjMiLCJhIjoiY202ODRuZmFjMDl4OTJtcjNvNnY1anoydiJ9.IwkY6zSc0skaG5Rrsb_Bog";

var map = new mapboxgl.Map({
  container: "map", // container id
  style: "mapbox://styles/ailagrant23/cmad04knm00on01qy6cjtcglg", // stylesheet location
  center: [-0.133599, 51.524931], // starting position [lng, lat]
  zoom: 13, // starting zoom
});

// Variable to store the selected starting point and end point
let start = null;
let end = null;

map.on("load", () => {
  console.log("Map has loaded");

  // Default route
  start = [-0.134767041828369, 51.524867906426486]; // UCL
  end = [-0.138821797654053, 51.534278420999748]; // Morinington Cresent

  getRoute();

  // Create popups for both types of points
  const uniPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
  });

  const metroPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
  });

  // 1. Set up interaction for university points (using vector tile source)
  map.on("mouseenter", "higher-education-establishments-4326", (e) => {
    map.getCanvas().style.cursor = "pointer";

    const coordinates = e.features[0].geometry.coordinates.slice();
    const name = e.features[0].properties.name;

    // Ensure popup appears over the point being hovered
    if (["mercator", "equirectangular"].includes(map.getProjection().name)) {
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }
    }

    uniPopup
      .setLngLat(coordinates)
      .setHTML(`<h3>${name}</h3><p>Click to select as starting point</p>`)
      .addTo(map);
  });

  map.on("mouseleave", "higher-education-establishments-4326", () => {
    map.getCanvas().style.cursor = "";
    uniPopup.remove();
  });

  // Allow user to click on university to set it as starting point
  map.on("click", "higher-education-establishments-4326", (e) => {
    const clickedCoordinates = e.features[0].geometry.coordinates.slice();
    const clickedName = e.features[0].properties.name;

    // Update the starting point
    start = clickedCoordinates;
    console.log(`Selected ${clickedName} as starting point:`, start);

    // If end point is already selected, calculate the route
    if (end) {
      getRoute();
    }
  });

  // 2. Set up interaction for metro stations (using vector tile source)
  map.on("mouseenter", "underground-tube-stations-4326", (e) => {
    map.getCanvas().style.cursor = "pointer";

    const coordinates = e.features[0].geometry.coordinates.slice();
    const name = e.features[0].properties.name;

    // Ensure popup appears over the point being hovered
    if (["mercator", "equirectangular"].includes(map.getProjection().name)) {
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }
    }

    metroPopup
      .setLngLat(coordinates)
      .setHTML(`<h3>${name}</h3><p>Click to select as destination</p>`)
      .addTo(map);
  });

  map.on("mouseleave", "underground-tube-stations-4326", () => {
    map.getCanvas().style.cursor = "";
    metroPopup.remove();
  });

  // Allow user to click on metro station to set it as end point
  map.on("click", "underground-tube-stations-4326", (e) => {
    const clickedCoordinates = e.features[0].geometry.coordinates.slice();
    const clickedName = e.features[0].properties.name;

    // Update the end point
    end = clickedCoordinates;
    console.log(`Selected ${clickedName} as destination:`, end);

    // If start point is already selected, calculate the route
    if (start) {
      getRoute();
    }
  });
});

// Create a function to make a directions request
async function getRoute() {
  // Make sure both start and end points are selected before making the request
  if (!start || !end) {
    console.error("Both start and end points must be selected");
    return;
  }

  console.log(`Getting route from ${start} to ${end}`);

  // Make a directions request using cycling profile
  try {
    const query = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/cycling/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`
    );

    const json = await query.json();

    // Check if a route was found
    if (!json.routes || json.routes.length === 0) {
      console.error("No route found");
      return;
    }

    const data = json.routes[0];
    const route = data.geometry;
    const geojson = {
      type: "Feature",
      properties: {},
      geometry: data.geometry,
    };

    // If the route already exists on the map, reset it using setData
    if (map.getSource("route")) {
      map.getSource("route").setData(geojson);
    }
    // Otherwise, add a new layer using this data
    else {
      map.addLayer({
        id: "route",
        type: "line",
        source: {
          type: "geojson",
          data: geojson,
        },
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#b42222",
          "line-width": 2,
          "line-opacity": 1,
        },
      });
    }
    // get the sidebar and add the instructions
    const instructions = document.getElementById("instructions");
    const steps = data.legs[0].steps;
    let tripInstructions = "";
    for (const step of steps) {
      tripInstructions += `<li>${step.maneuver.instruction}</li>`;
    }
    instructions.innerHTML = `<p id="prompt">📍 Click the map to get directions from a university to a tube station</p>
    <p>💡 Check whether the route overlapped the green cycle network </p><p><strong>Trip duration: ${Math.floor(
      data.duration / 60
    )} min 🚴 </strong></p><ol>${tripInstructions}</ol>`;
  } catch (error) {
    console.error("Error fetching route:", error);
  }
}
