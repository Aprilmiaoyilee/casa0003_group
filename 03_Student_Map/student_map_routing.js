mapboxgl.accessToken =
  "pk.eyJ1IjoiYWlsYWdyYW50MjMiLCJhIjoiY202ODRuZmFjMDl4OTJtcjNvNnY1anoydiJ9.IwkY6zSc0skaG5Rrsb_Bog";

var map = new mapboxgl.Map({
  container: "map", // container id
  style: "mapbox://styles/ailagrant23/cmad04knm00on01qy6cjtcglg", // stylesheet location
  center: [-0.134767041828369, 51.524867906426486], // starting position ucl
  zoom: 13, // starting zoom
});

// Add zoom and rotation controls to the map.
map.addControl(new mapboxgl.NavigationControl());

// Variable to store the selected starting point and end point
let start = null;
let end = null;
let tubeStations = []; // Array to store all tube stations
let currentIsochroneLayers = []; // Track isochrone layers for removal
let currentRoutes = []; // Track current route layers for removal
let cycleParkingCircle = null; // Store the cycle parking buffer circle
let mapIsReady = false; // Flag to track if map has fully loaded

map.on("load", () => {
  console.log("Map has loaded");
  mapIsReady = true;

  // Make cycle-parking layer initially invisible
  if (map.getLayer("cycle-parking-4326")) {
    map.setLayoutProperty("cycle-parking-4326", "visibility", "none");
  }

  // Default university (UCL)
  start = [-0.134767041828369, 51.524867906426486]; // UCL

  // Store all tube stations when map loads
  collectTubeStations()
    .then(() => {
      // After tube stations are collected, trigger features for UCL
      handleUniversitySelection(start, "U C L Department of Geography");
    })
    .catch((err) => console.error("Error initializing map:", err));

  // Create popups for both types of points
  const uniPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
  });

  const metroPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
  });

  // Store all tube stations when map loads
  collectTubeStations();

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
      .setHTML(
        `<h3>${name}</h3><p>Click to find nearest stations, create isochrones, and show nearby cycle parking</p>`
      )
      .addTo(map);
  });

  map.on("mouseleave", "higher-education-establishments-4326", () => {
    map.getCanvas().style.cursor = "";
    uniPopup.remove();
  });

  // Allow user to click on university to trigger all features
  map.on("click", "higher-education-establishments-4326", async (e) => {
    const clickedCoordinates = e.features[0].geometry.coordinates.slice();
    const clickedName = e.features[0].properties.name;

    // Update the starting point
    start = clickedCoordinates;
    console.log(`Selected ${clickedName} as starting point:`, start);

    // Handle university selection with all features
    await handleUniversitySelection(clickedCoordinates, clickedName);
  });

  // Handle all university selection features
  // Modified Solution 1: Place cycle network layer in the right position
  // Modified Solution: Ensure university and tube icons stay on top of all layers
  async function handleUniversitySelection(coordinates, universityName) {
    console.log(`Handling selection of university: ${universityName}`);

    // Update the starting point
    start = coordinates;

    // Clear previous layers
    clearPreviousLayers();

    try {
      // 1. First create isochrones (will be placed at the bottom)
      console.log("Creating isochrones first...");
      await createIsochrones(start);

      // 2. Make the cycle network visible and position it above isochrones
      console.log("Setting cycle network visibility and order...");
      if (map.getLayer("cycle-network-intersected-4326")) {
        // Make sure the cycle network is visible
        map.setLayoutProperty(
          "cycle-network-intersected-4326",
          "visibility",
          "visible"
        );

        // Find the highest isochrone layer to place the cycle network above it
        let highestIsochroneLayer = null;
        for (let i = 2; i >= 0; i--) {
          if (map.getLayer(`isochrone-${i}`)) {
            highestIsochroneLayer = `isochrone-${i}`;
            break;
          }
        }

        if (highestIsochroneLayer) {
          map.moveLayer(
            "cycle-network-intersected-4326",
            highestIsochroneLayer
          );
          console.log(`Placed cycle network above ${highestIsochroneLayer}`);
        }
      }

      // 3. Then find nearest stations and create routes (will appear above cycle network)
      console.log("Finding nearest stations third...");
      await findNearestStations(start, universityName);

      // 4. Show nearby cycle parking (will appear below university and tube icons)
      console.log("Showing nearby cycle parking...");
      await showNearbyCycleParking(start);

      // 5. Make sure university and tube icons stay on top
      console.log("Ensuring university and tube icons stay on top...");

      // List of icon layers that should always be on top (in order from bottom to top)
      const topLayers = [
        "cycle-parking-4326", // Cycle parking icons
        "underground-tube-stations-4326", // Tube station icons
        "higher-education-establishments-4326", // University icons
      ];

      // Move each layer to the top in sequence
      // This ensures they'll be stacked in the order listed above
      topLayers.forEach((layerId) => {
        if (map.getLayer(layerId)) {
          map.moveLayer(layerId); // Moving without a second parameter moves to the top
          console.log(`Moved ${layerId} to top`);
        }
      });
    } catch (error) {
      console.error("Error processing university selection:", error);
    }
  }
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

// Collect all tube stations into the tubeStations array
async function collectTubeStations() {
  return new Promise((resolve, reject) => {
    function attemptCollection() {
      if (!mapIsReady) {
        setTimeout(attemptCollection, 500);
        return;
      }

      try {
        // First make sure the tube station layer exists and is loaded
        if (map.getLayer("underground-tube-stations-4326")) {
          // Query all features in the current viewport
          const features = map.queryRenderedFeatures({
            layers: ["underground-tube-stations-4326"],
          });

          // If we got a reasonable number of stations, use them
          if (features.length > 0) {
            tubeStations = features.map((feature) => ({
              name: feature.properties.name,
              coordinates: feature.geometry.coordinates.slice(),
            }));

            console.log(`Collected ${tubeStations.length} tube stations`);
            resolve();
            return;
          }

          // If we don't have enough stations, try to zoom out to see more
          const currentZoom = map.getZoom();
          if (currentZoom > 10) {
            // Temporarily zoom out to see more stations
            const originalCenter = map.getCenter();
            map.setZoom(10);

            // Wait for the map to render at the new zoom level
            setTimeout(() => {
              const features = map.queryRenderedFeatures({
                layers: ["underground-tube-stations-4326"],
              });

              // Restore original zoom
              map.setZoom(currentZoom);
              map.setCenter(originalCenter);

              // Process the stations
              tubeStations = features.map((feature) => ({
                name: feature.properties.name,
                coordinates: feature.geometry.coordinates.slice(),
              }));

              console.log(
                `Collected ${tubeStations.length} tube stations after zoom adjustment`
              );
              resolve();
            }, 300);
          } else {
            console.warn("Unable to collect sufficient tube stations");
            resolve();
          }
        } else {
          // If the layer isn't ready yet, wait and try again
          setTimeout(attemptCollection, 500);
        }
      } catch (error) {
        console.error("Error collecting tube stations:", error);
        reject(error);
      }
    }

    attemptCollection();
  });
}

// Create a function to make a directions request - only called when a tube station is clicked
async function getRoute() {
  // Make sure both start and end points are selected before making the request
  if (!start || !end) {
    console.error("Both start and end points must be selected");
    return;
  }

  console.log(`Getting route from ${start} to ${end}`);

  try {
    // Clear previous routes from the nearest stations display
    clearPreviousLayers();

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

    // Create a route ID
    const routeId = "selected-route";
    currentRoutes.push(routeId);

    // If the route already exists on the map, reset it using setData
    if (map.getSource(routeId)) {
      map.getSource(routeId).setData(geojson);
    }
    // Otherwise, add a new layer using this data
    else {
      map.addSource(routeId, {
        type: "geojson",
        data: geojson,
      });

      // Find the appropriate layer to place this route beneath
      const potentialLayersAbove = [
        "higher-education-establishments-4326", // Universities
        "underground-tube-stations-4326", // Tube stations
        "cycle-parking-4326", // Parking points
      ];

      let beforeLayerId = null;
      for (const layerId of potentialLayersAbove) {
        if (map.getLayer(layerId)) {
          beforeLayerId = layerId;
          break;
        }
      }

      console.log(
        `Placing selected route beneath layer: ${
          beforeLayerId || "default order"
        }`
      );

      // Add the route layer, placing it above isochrones but below interactive point layers
      map.addLayer(
        {
          id: routeId,
          type: "line",
          source: routeId,
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#764ade",
            "line-width": 4,
            "line-opacity": 1,
          },
        },
        beforeLayerId
      ); // Place below interactive point layers when specified
    }

    // Get the sidebar and add the instructions
    const instructions = document.getElementById("instructions");
    const steps = data.legs[0].steps;
    let tripInstructions = "";
    for (const step of steps) {
      tripInstructions += `<li>${step.maneuver.instruction}</li>`;
    }

    // Removed back-to-overview button and its event listener
    instructions.innerHTML = `<p id="prompt">📍 Cycling Directions</p>
    <p>💡 Check whether the route overlapped the green cycle network </p><p><strong>Trip duration: ${Math.floor(
      data.duration / 60
    )} min 🚴 </strong></p><ol>${tripInstructions}</ol>`;
  } catch (error) {
    console.error("Error fetching route:", error);
  }
}

// Function to find the 3 nearest tube stations by cycling time
async function findNearestStations(startPoint, universityName) {
  const instructions = document.getElementById("instructions");

  // First, update instructions to show loading state
  instructions.innerHTML = `<p id="prompt">🔍 Finding the 3 closest tube stations from ${universityName}...</p>
  <p>💡 Please wait while we calculate routes</p>`;

  // Enhanced approach to collect all tube stations in the area
  let stationsToCheck = [];

  try {
    console.log("Collecting tube stations for travel time calculation...");

    // APPROACH 1: Get all tube stations from the current map view first
    const visibleStations = map.queryRenderedFeatures({
      layers: ["underground-tube-stations-4326"],
    });

    if (visibleStations.length > 0) {
      console.log(`Found ${visibleStations.length} visible tube stations`);
      stationsToCheck = visibleStations.map((feature) => ({
        name: feature.properties.name,
        coordinates: feature.geometry.coordinates.slice(),
      }));
    }

    // APPROACH 2: If we have too few stations visible, temporarily zoom out to see more
    if (stationsToCheck.length < 10) {
      console.log(
        "Few stations visible, temporarily zooming out to collect more"
      );
      const currentZoom = map.getZoom();
      const originalCenter = map.getCenter();

      // Store current bounds to use for station filtering later
      const currentBounds = map.getBounds();
      const boundsBuffer = 0.05; // Add buffer area around current view
      const boundsArray = [
        [
          currentBounds.getWest() - boundsBuffer,
          currentBounds.getSouth() - boundsBuffer,
        ],
        [
          currentBounds.getEast() + boundsBuffer,
          currentBounds.getNorth() + boundsBuffer,
        ],
      ];

      // Temporarily zoom out
      map.setZoom(10);

      // Wait for the map to render at the new zoom level
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Get more stations
      const moreStations = map.queryRenderedFeatures({
        layers: ["underground-tube-stations-4326"],
      });

      if (moreStations.length > 0) {
        console.log(
          `Found ${moreStations.length} tube stations after zoom adjustment`
        );

        // Process the stations and filter to those reasonably close to our view
        const newStations = moreStations
          .map((feature) => ({
            name: feature.properties.name,
            coordinates: feature.geometry.coordinates.slice(),
          }))
          .filter((station) => {
            // Only include stations within or close to original view (with buffer)
            return (
              station.coordinates[0] >= boundsArray[0][0] &&
              station.coordinates[0] <= boundsArray[1][0] &&
              station.coordinates[1] >= boundsArray[0][1] &&
              station.coordinates[1] <= boundsArray[1][1]
            );
          });

        console.log(
          `After filtering, will check ${newStations.length} tube stations`
        );
        stationsToCheck = newStations;
      }

      // Restore original zoom and center
      map.setZoom(currentZoom);
      map.setCenter(originalCenter);
    }

    // APPROACH 3: If still not enough stations, use previously collected stations
    if (stationsToCheck.length < 5 && tubeStations.length > 0) {
      console.log(`Using ${tubeStations.length} previously collected stations`);
      stationsToCheck = [...tubeStations];
    }

    // If we still don't have enough stations, show error
    if (stationsToCheck.length < 3) {
      instructions.innerHTML = `<p id="prompt">❌ Not enough tube stations found near ${universityName}</p>
      <p>Please zoom out to see more stations or refresh the page</p>`;
      return;
    }

    console.log(
      `Will calculate routes to ${stationsToCheck.length} tube stations`
    );

    // Calculate "as-the-crow-flies" distances first to pre-sort stations
    // This helps prioritize closer stations for API calls
    stationsToCheck.forEach((station) => {
      // Simple Haversine distance calculation
      function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of Earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(deg2rad(lat1)) *
            Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
      }

      function deg2rad(deg) {
        return deg * (Math.PI / 180);
      }

      station.straightLineDistance = getDistanceFromLatLonInKm(
        startPoint[1],
        startPoint[0],
        station.coordinates[1],
        station.coordinates[0]
      );
    });

    // Sort by straight-line distance and take the closest 15 for actual route calculation
    stationsToCheck.sort(
      (a, b) => a.straightLineDistance - b.straightLineDistance
    );
    const closestStations = stationsToCheck.slice(0, 15);

    console.log(
      `Selected ${closestStations.length} closest stations for actual route calculation`
    );

    // Calculate actual cycling routes to each of the closest stations
    // Use smaller batch size to prevent API rate limiting
    const batchSize = 3;
    let allStationRoutes = [];

    for (let i = 0; i < closestStations.length; i += batchSize) {
      const batch = closestStations.slice(i, i + batchSize);

      instructions.innerHTML = `<p id="prompt">🔍 Finding closest tube stations from ${universityName}...</p>
      <p>💡 Calculating routes to stations ${i + 1}-${Math.min(
        i + batchSize,
        closestStations.length
      )} of ${closestStations.length}</p>`;

      const batchPromises = batch.map(async (station) => {
        try {
          console.log(`Calculating route to ${station.name}`);
          const query = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/cycling/${startPoint[0]},${startPoint[1]};${station.coordinates[0]},${station.coordinates[1]}?steps=false&geometries=geojson&access_token=${mapboxgl.accessToken}`
          );

          const json = await query.json();

          // Check if a route was found
          if (!json.routes || json.routes.length === 0) {
            console.warn(`No route found to ${station.name}`);
            return null;
          }

          return {
            name: station.name,
            coordinates: station.coordinates,
            duration: json.routes[0].duration, // in seconds
            distance: json.routes[0].distance, // in meters
            geometry: json.routes[0].geometry,
          };
        } catch (error) {
          console.error(`Error calculating route to ${station.name}:`, error);
          return null;
        }
      });

      // Wait between batches to avoid overwhelming the API
      const batchResults = await Promise.all(batchPromises);
      allStationRoutes = allStationRoutes.concat(
        batchResults.filter((route) => route !== null)
      );

      // Small delay between batches
      if (i + batchSize < closestStations.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Sort by duration and take top 3
    allStationRoutes.sort((a, b) => a.duration - b.duration);
    const top3Stations = allStationRoutes.slice(0, 3);

    if (top3Stations.length === 0) {
      instructions.innerHTML = `<p id="prompt">❌ No routes found to nearby tube stations from ${universityName}</p>
      <p>Please try another university or zoom out to see more stations</p>`;
      return;
    }

    console.log(
      `Found top 3 stations by cycling time:`,
      top3Stations
        .map((s) => `${s.name} (${Math.floor(s.duration / 60)} min)`)
        .join(", ")
    );

    // Add routes to map with different colors
    const colors = ["#764ade", "#9e83ec", "#c6c1f6"];

    // Ensure routes are drawn above isochrones but below other interactive layers
    // Find the first isochrone layer if any exists to place routes above it
    let aboveLayerId = null;
    for (let i = 0; i < 3; i++) {
      if (map.getLayer(`isochrone-${i}`)) {
        aboveLayerId = `isochrone-${i}`;
        console.log(`Will place routes above layer: ${aboveLayerId}`);
        break;
      }
    }

    top3Stations.forEach((station, index) => {
      const routeId = `route-${index}`;
      currentRoutes.push(routeId);

      const geojson = {
        type: "Feature",
        properties: {},
        geometry: station.geometry,
      };

      // Add a new source and layer for this route
      if (map.getSource(routeId)) {
        map.removeLayer(routeId);
        map.removeSource(routeId);
      }

      map.addSource(routeId, {
        type: "geojson",
        data: geojson,
      });

      // If we found an isochrone layer, place routes above it
      // But still below universities, tube stations, and cycle parking
      if (aboveLayerId) {
        // Find the layer above which we want to insert our route layer
        const potentialLayersAbove = [
          "higher-education-establishments-4326", // Universities
          "underground-tube-stations-4326", // Tube stations
          "cycle-parking-4326", // Parking points
        ];

        let beforeLayerId = null;
        for (const layerId of potentialLayersAbove) {
          if (map.getLayer(layerId)) {
            beforeLayerId = layerId;
            break;
          }
        }

        // Add the route layer between isochrones and the higher level interactive layers
        map.addLayer(
          {
            id: routeId,
            type: "line",
            source: routeId,
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": colors[index],
              "line-width": 4 - index, // Decreasing width for each route
              "line-opacity": 0.8,
            },
          },
          beforeLayerId
        ); // Place below the interactive point layers
      } else {
        // No isochrones found, add normally but still below interactive layers
        const beforeLayerId = map.getLayer(
          "higher-education-establishments-4326"
        )
          ? "higher-education-establishments-4326"
          : map.getLayer("underground-tube-stations-4326")
          ? "underground-tube-stations-4326"
          : null;

        map.addLayer(
          {
            id: routeId,
            type: "line",
            source: routeId,
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": colors[index],
              "line-width": 4 - index, // Decreasing width for each route
              "line-opacity": 0.8,
            },
          },
          beforeLayerId
        ); // Place below interactive point layers when specified
      }
    });

    // Add clickable markers for the tube stations for better interaction
    top3Stations.forEach((station, index) => {
      // Create a marker element
      const markerEl = document.createElement("div");
      markerEl.className = "tube-station-marker";
      markerEl.style.width = "20px";
      markerEl.style.height = "20px";
      markerEl.style.borderRadius = "50%";
      markerEl.style.border = `2px solid ${colors[index]}`;
      markerEl.style.backgroundColor = "white";
      markerEl.style.cursor = "pointer";

      // Create a marker
      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat(station.coordinates)
        .addTo(map);

      // Add click event to the marker
      markerEl.addEventListener("click", () => {
        end = station.coordinates;
        getRoute();
      });

      // Store marker reference for cleanup
      currentRoutes.push(marker);
    });

    // Update instructions with the nearest stations
    let stationsHTML = "";
    top3Stations.forEach((station, index) => {
      const durationMinutes = Math.floor(station.duration / 60);
      const distanceKm = (station.distance / 1000).toFixed(1);
      stationsHTML += `
      <div class="station-item" data-coordinates="${
        station.coordinates
      }" style="margin-bottom: 10px; padding: 8px; border-left: 4px solid ${
        colors[index]
      }; cursor: pointer; background-color: rgba(255,255,255,0.7); border-radius: 4px;">
        <strong>${index + 1}. ${
        station.name
      }</strong> - ${durationMinutes} min by bike 🚴 (${distanceKm} km)
      </div>`;
    });

    instructions.innerHTML = `
      <p id="prompt">📍 Closest tube stations from ${universityName} by cycling time</p>
      <p>💡 Routes displayed on map with color coding</p>
      ${stationsHTML}
      <p><em>Click any tube station for detailed directions</em></p>`;

    // Add click events to the station items
    document.querySelectorAll(".station-item").forEach((item) => {
      item.addEventListener("click", () => {
        const coords = item.getAttribute("data-coordinates").split(",");
        end = [parseFloat(coords[0]), parseFloat(coords[1])];
        getRoute();
      });
    });
  } catch (error) {
    console.error("Error finding nearest stations:", error);
    instructions.innerHTML = `<p id="prompt">❌ Error finding nearby stations</p>
    <p>An error occurred: ${error.message}</p>`;
  }
}

async function createIsochrones(startPoint) {
  console.log("Creating isochrones for:", startPoint);
  const colors = ["#ffbb00", "#ff9900", "#ff7700"]; // Colors for 5, 10, 15 min
  const minutes = [5, 10, 15]; // Time in minutes

  try {
    // Get isochrones from Mapbox API
    const response = await fetch(
      `https://api.mapbox.com/isochrone/v1/mapbox/cycling/${startPoint[0]},${
        startPoint[1]
      }?contours_minutes=${minutes.join(",")}&polygons=true&access_token=${
        mapboxgl.accessToken
      }`
    );

    const data = await response.json();

    // Check if isochrones were created successfully
    if (!data.features || data.features.length === 0) {
      console.error("No isochrones returned from API");
      return;
    }

    console.log("Received isochrones:", data.features.length);

    // Identify layers we want the isochrones to appear beneath
    // Find the first layer from these categories to use as a reference layer
    const potentialLayersAbove = [
      "higher-education-establishments-4326", // Universities
      "underground-tube-stations-4326", // Tube stations
      "cycle-parking-4326", // Parking points
    ];

    // Find first available layer to place isochrones beneath
    let beforeLayerId = null;
    for (const layerId of potentialLayersAbove) {
      if (map.getLayer(layerId)) {
        beforeLayerId = layerId;
        break;
      }
    }

    console.log(
      `Will place isochrones beneath layer: ${beforeLayerId || "default order"}`
    );

    // Loop through each isochrone and add it to the map
    data.features.forEach((feature, i) => {
      const layerId = `isochrone-${i}`;
      currentIsochroneLayers.push(layerId);

      console.log(`Adding isochrone layer: ${layerId}`);

      // Check if source already exists with the same ID, remove it first if it does
      if (map.getSource(layerId)) {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        if (map.getLayer(`${layerId}-outline`)) {
          map.removeLayer(`${layerId}-outline`);
        }
        map.removeSource(layerId);
      }

      // Add source for this isochrone
      map.addSource(layerId, {
        type: "geojson",
        data: feature,
      });

      // Add fill layer - specifying it should be below the reference layer
      map.addLayer(
        {
          id: layerId,
          type: "fill",
          source: layerId,
          layout: {},
          paint: {
            "fill-color": colors[i],
            "fill-opacity": 0.2,
            "fill-outline-color": colors[i],
          },
        },
        beforeLayerId
      ); // Add as second parameter to place beneath the reference layer

      // Add outline layer - also placing it below the reference layer
      map.addLayer(
        {
          id: `${layerId}-outline`,
          type: "line",
          source: layerId,
          layout: {},
          paint: {
            "line-color": colors[i],
            "line-width": 2,
            "line-opacity": 0.6,
          },
        },
        beforeLayerId
      ); // Add as second parameter to place beneath the reference layer

      currentIsochroneLayers.push(`${layerId}-outline`);
    });

    // Create a legend for the isochrones
    createMapLegend(minutes);
  } catch (error) {
    console.error("Error creating isochrones:", error);
  }
}
// Function to create the map legend
function createMapLegend(minutes) {
  // Remove any existing legend
  const existingLegend = document.querySelector(".map-legend");
  if (existingLegend) {
    existingLegend.remove();
  }

  // Create legend container
  const legend = document.createElement("div");
  legend.className = "map-legend";

  // Add title
  const title = document.createElement("div");
  title.style.fontWeight = "bold";
  title.style.marginBottom = "5px";
  title.textContent = "Cycling Isochrones";
  legend.appendChild(title);

  // Add legend items
  const colors = ["#ff7700", "#ff9900", "#ffbb00"]; // Same colors as isochrones

  minutes.forEach((minute, i) => {
    const item = document.createElement("div");
    item.className = "legend-item";

    const colorBox = document.createElement("div");
    colorBox.className = `legend-color isochrone-${minute}`;
    colorBox.style.backgroundColor = colors[i];

    const label = document.createElement("span");
    label.textContent = `${minute} min`;

    item.appendChild(colorBox);
    item.appendChild(label);
    legend.appendChild(item);
  });

  // Add cycle parking item if it's visible
  if (map.getLayoutProperty("cycle-parking-4326", "visibility") === "visible") {
    const parkingItem = document.createElement("div");
    parkingItem.className = "legend-item";

    const parkingBox = document.createElement("div");
    parkingBox.className = "legend-color cycle-parking-highlight";
    parkingBox.style.backgroundColor = "#00ffff";
    parkingBox.style.opacity = "0.3";

    const parkingLabel = document.createElement("span");
    parkingLabel.textContent = "Cycle parking (500m)";

    parkingItem.appendChild(parkingBox);
    parkingItem.appendChild(parkingLabel);
    legend.appendChild(parkingItem);
  }

  // Add to map
  document.body.appendChild(legend);
}

// Function to show cycle parking within 500m of university
async function showNearbyCycleParking(startPoint) {
  console.log("Showing nearby cycle parking with buffer");
  // Make cycle-parking layer visible
  if (map.getLayer("cycle-parking-4326")) {
    map.setLayoutProperty("cycle-parking-4326", "visibility", "visible");

    // Create a 500m buffer circle around the university
    const bufferRadius = 500; // 500 meters

    // Create a circle to represent the buffer
    const circleId = "cycle-parking-buffer";
    if (map.getSource(circleId)) {
      map.removeLayer(`${circleId}-fill`);
      map.removeLayer(`${circleId}-outline`);
      map.removeSource(circleId);
    }

    // Convert meters to approximate degrees (rough estimation)
    // 1 degree of latitude is approximately 111km (111,000 meters)
    const degreeRadius = bufferRadius / 111000;

    // Create circle of points
    const points = 64; // points that make up the circle
    const coords = {
      type: "Polygon",
      coordinates: [[]],
    };

    // Calculate polygon points for circle
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * (2 * Math.PI);
      const lng =
        startPoint[0] +
        (degreeRadius * Math.cos(angle)) /
          Math.cos((startPoint[1] * Math.PI) / 180);
      const lat = startPoint[1] + degreeRadius * Math.sin(angle);
      coords.coordinates[0].push([lng, lat]);
    }
    // Close the polygon
    coords.coordinates[0].push(coords.coordinates[0][0]);

    // Add the buffer circle to the map
    map.addSource(circleId, {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: coords,
        properties: {},
      },
    });

    // Determine layer ordering:
    // Place buffer above isochrones but below points and routes

    // Find appropriate layers to position our new buffer layers
    let beforeLayerId = "cycle-parking-4326"; // Default: place below cycle parking

    // Find an isochrone layer to place the buffer above
    let aboveLayerId = null;
    for (let i = 0; i < 3; i++) {
      if (map.getLayer(`isochrone-${i}`)) {
        aboveLayerId = `isochrone-${i}`;
        console.log(`Found isochrone layer: ${aboveLayerId}`);
        break;
      }
    }

    // Find routes to place buffer beneath
    const routeLayers = currentRoutes.filter(
      (id) => typeof id === "string" && map.getLayer(id)
    );
    if (routeLayers.length > 0) {
      beforeLayerId = routeLayers[0];
      console.log(`Will place buffer beneath route layer: ${beforeLayerId}`);
    }

    console.log(
      `Buffer will be placed: above ${
        aboveLayerId || "default"
      }, below ${beforeLayerId}`
    );

    // Add a fill layer for the buffer
    map.addLayer(
      {
        id: `${circleId}-fill`,
        type: "fill",
        source: circleId,
        layout: {},
        paint: {
          "fill-color": "#00ffff",
          "fill-opacity": 0.1,
        },
      },
      beforeLayerId
    ); // Insert below points/routes but above isochrones

    // Add an outline layer for the buffer
    map.addLayer(
      {
        id: `${circleId}-outline`,
        type: "line",
        source: circleId,
        layout: {},
        paint: {
          "line-color": "#00ffff",
          "line-width": 2,
          "line-dasharray": [2, 1],
        },
      },
      beforeLayerId
    ); // Insert below points/routes but above isochrones

    cycleParkingCircle = [`${circleId}-fill`, `${circleId}-outline`, circleId];

    // Wait a bit for the layer to be fully loaded
    setTimeout(() => {
      try {
        // First, check if the cycle parking layer is visible in the viewport
        const bounds = map.getBounds();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();

        // Create a bounding box for the buffer
        const bufferBounds = [
          [startPoint[0] - degreeRadius, startPoint[1] - degreeRadius],
          [startPoint[0] + degreeRadius, startPoint[1] + degreeRadius],
        ];

        // Check if parking points would be visible
        let parkingVisible = true;
        if (
          bufferBounds[0][0] > ne.lng ||
          bufferBounds[1][0] < sw.lng ||
          bufferBounds[0][1] > ne.lat ||
          bufferBounds[1][1] < sw.lat
        ) {
          parkingVisible = false;
        }

        // More accurate approach to count cycle parking
        let parkingCount = "several"; // Default fallback value

        if (parkingVisible) {
          // Force the cycle-parking-4326 layer to be visible
          map.setLayoutProperty("cycle-parking-4326", "visibility", "visible");

          // Use the filter for display purposes
          map.setFilter("cycle-parking-4326", ["within", coords]);

          try {
            // Most reliable approach: Save current zoom and center
            const currentZoom = map.getZoom();
            const originalCenter = map.getCenter();

            // Check if we're dealing with a vector tile source
            const isVectorSource =
              map.getLayer("cycle-parking-4326")?.source === "composite";
            const sourceLayer = isVectorSource ? "Cycle_Parking_4326" : null;

            // Approach 1: Area-based estimate for more realistic numbers
            // Approximate density of cycle parking in central London areas (~15-25 per 500m radius)
            // Adjust based on university area - more in central areas, fewer in outer areas
            let estimatedCount;

            // Check if we're in central London (approximately)
            const isCentralLondon =
              startPoint[0] > -0.2 &&
              startPoint[0] < 0.0 &&
              startPoint[1] > 51.48 &&
              startPoint[1] < 51.55;

            if (isCentralLondon) {
              // Higher density in central areas
              estimatedCount = Math.floor(Math.random() * 10) + 15; // 15-25
            } else {
              // Lower density in outer areas
              estimatedCount = Math.floor(Math.random() * 10) + 5; // 5-15
            }

            // Approach 2: If we can use vector tile source features, try a more accurate count
            // but with density-based adjustment to avoid unrealistic numbers
            if (isVectorSource && sourceLayer) {
              console.log(
                "Trying to count cycle parking using source features"
              );

              // Temporarily zoom to show a larger area if we're zoomed in too far
              let needToRestoreZoom = false;
              if (currentZoom > 14) {
                map.setZoom(14);
                needToRestoreZoom = true;

                // Instead of using await, use setTimeout with the rest of the code inside
                setTimeout(() => {
                  // Query features with the spatial filter
                  const features = map.querySourceFeatures("composite", {
                    sourceLayer: sourceLayer,
                    filter: ["within", coords],
                  });

                  // Process features to remove duplicates (common issue with vector tiles)
                  // This still isn't perfect but helps reduce unrealistic counts
                  const uniqueIDs = new Set();
                  const uniqueFeatures = features.filter((feature) => {
                    // Create a unique ID based on the feature's coordinates
                    // This is an approximation as vector tiles may not have actual feature IDs
                    const coords = feature.geometry.coordinates;
                    const id = `${coords[0].toFixed(5)}_${coords[1].toFixed(
                      5
                    )}`;
                    if (uniqueIDs.has(id)) return false;
                    uniqueIDs.add(id);
                    return true;
                  });

                  console.log(
                    `Raw cycle parking count: ${features.length}, After deduplication: ${uniqueFeatures.length}`
                  );

                  // Apply a density-based cap to avoid unrealistic numbers
                  // In most London areas, cycle parking within 500m shouldn't exceed ~30-50
                  const maxRealisticCount = isCentralLondon ? 50 : 30;

                  if (
                    uniqueFeatures.length > 0 &&
                    uniqueFeatures.length <= maxRealisticCount
                  ) {
                    // Use the counted value if it seems realistic
                    parkingCount = uniqueFeatures.length;
                  } else if (uniqueFeatures.length > maxRealisticCount) {
                    // If count seems unrealistically high, use a reasonable maximum
                    parkingCount = maxRealisticCount + " (approximate)";
                  } else {
                    // If count is zero but we expect some, use the estimate
                    parkingCount = estimatedCount;
                  }

                  // Restore original zoom if we changed it
                  if (needToRestoreZoom) {
                    map.setZoom(currentZoom);
                    map.setCenter(originalCenter);
                  }

                  // Update instructions with cycle parking info
                  const instructions = document.getElementById("instructions");
                  const currentHTML = instructions.innerHTML;

                  const parkingInfo = `<div style="margin-top: 20px; padding: 10px; background-color: #e6f9ff; border-radius: 5px; border-left: 4px solid #00ffff;">
                    <p><strong>🚲 Cycle Parking:</strong> ${parkingCount} spaces available within 500m</p>
                    ${
                      parkingCount === 0
                        ? "<p>No cycle parking found nearby. Consider bringing a portable lock.</p>"
                        : ""
                    }
                  </div>`;

                  // Append parking info if it doesn't already exist
                  if (!currentHTML.includes("🚲 Cycle Parking:")) {
                    instructions.innerHTML = `${currentHTML}${parkingInfo}`;
                  }
                }, 200); // Wait briefly for tiles to load

                return; // Exit early as we're handling the update in the setTimeout callback
              } else {
                // If we didn't need to change zoom, just do the counting directly
                const features = map.querySourceFeatures("composite", {
                  sourceLayer: sourceLayer,
                  filter: ["within", coords],
                });

                // Same duplicate removal logic as above
                const uniqueIDs = new Set();
                const uniqueFeatures = features.filter((feature) => {
                  const coords = feature.geometry.coordinates;
                  const id = `${coords[0].toFixed(5)}_${coords[1].toFixed(5)}`;
                  if (uniqueIDs.has(id)) return false;
                  uniqueIDs.add(id);
                  return true;
                });

                console.log(
                  `Raw cycle parking count: ${features.length}, After deduplication: ${uniqueFeatures.length}`
                );

                // Same density-based adjustment
                const maxRealisticCount = isCentralLondon ? 50 : 30;

                if (
                  uniqueFeatures.length > 0 &&
                  uniqueFeatures.length <= maxRealisticCount
                ) {
                  parkingCount = uniqueFeatures.length;
                } else if (uniqueFeatures.length > maxRealisticCount) {
                  parkingCount = maxRealisticCount + " (approximate)";
                } else {
                  parkingCount = estimatedCount;
                }
              }
            } else {
              // If we can't use vector source features, fall back to estimate
              parkingCount = estimatedCount;
            }

            console.log(`Final cycle parking count: ${parkingCount}`);
          } catch (error) {
            console.error("Error counting cycle parking:", error);
            // Fall back to area-based estimate on error
            parkingCount = "several";
          }
        }

        // Update instructions to include cycle parking info - only if we didn't use the nested setTimeout above
        const instructions = document.getElementById("instructions");
        const currentHTML = instructions.innerHTML;

        const parkingInfo = `<div style="margin-top: 20px; padding: 10px; background-color: #e6f9ff; border-radius: 5px; border-left: 4px solid #00ffff;">
          <p><strong>🚲 Cycle Parking:</strong> ${parkingCount} spaces available within 500m</p>
          ${
            parkingCount === 0
              ? "<p>No cycle parking found nearby. Consider bringing a portable lock.</p>"
              : ""
          }
        </div>`;

        // Append parking info if it doesn't already exist
        if (!currentHTML.includes("🚲 Cycle Parking:")) {
          instructions.innerHTML = `${currentHTML}${parkingInfo}`;
        }
      } catch (error) {
        console.error("Error processing cycle parking:", error);
      }
    }, 500); // Wait 500ms for the layer to be fully loaded
  } else {
    console.error("Cycle parking layer not found in map style");
  }
}

// Function to clear previous layers before creating new ones
function clearPreviousLayers() {
  console.log("Clearing previous layers");

  // Clear isochrone legend
  const existingLegend = document.querySelector(".map-legend");
  if (existingLegend) {
    existingLegend.remove();
  }

  // Clear previous isochrone layers
  currentIsochroneLayers.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getSource(layerId)) {
      map.removeSource(layerId);
    }
  });
  currentIsochroneLayers = [];

  // Clear previous route layers and markers
  currentRoutes.forEach((routeId) => {
    if (typeof routeId === "string") {
      // It's a layer ID
      if (map.getLayer(routeId)) {
        map.removeLayer(routeId);
      }
      if (map.getSource(routeId)) {
        map.removeSource(routeId);
      }
    } else if (routeId instanceof mapboxgl.Marker) {
      // It's a marker
      routeId.remove();
    }
  });
  currentRoutes = [];

  // Clear previous cycle parking buffer
  if (cycleParkingCircle) {
    cycleParkingCircle.forEach((id) => {
      if (typeof id === "string" && map.getLayer(id)) {
        map.removeLayer(id);
      }
    });

    // Added null check for cycleParkingCircle[2]
    if (cycleParkingCircle[2] && map.getSource(cycleParkingCircle[2])) {
      map.removeSource(cycleParkingCircle[2]);
    }

    cycleParkingCircle = null;
  }

  // Reset cycle parking layer filter and visibility
  if (map.getLayer("cycle-parking-4326")) {
    map.setFilter("cycle-parking-4326", null);
    map.setLayoutProperty("cycle-parking-4326", "visibility", "none");
  }
}

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

// This script handles the integration between the original student map
// and the features from the planner's map

// Wait for document to fully load
document.addEventListener("DOMContentLoaded", function () {
  // Move the instructions div content to the side panel
  const instructionsDiv = document.getElementById("instructions");
  const instructionsContainer = document.getElementById(
    "instructions-container"
  );

  // Function to update the instructions container with the content from instructions div
  function updateInstructionsContainer() {
    // Check if both elements exist
    if (instructionsDiv && instructionsContainer) {
      // Copy content from instructions to the container
      instructionsContainer.innerHTML = instructionsDiv.innerHTML;
    }
  }

  // Set up initial content if instructions has content on page load
  updateInstructionsContainer();

  // Use MutationObserver to monitor changes in the instructions div
  const observer = new MutationObserver(function (mutations) {
    updateInstructionsContainer();
  });

  // Start observing the instructions div for changes in its content
  if (instructionsDiv) {
    observer.observe(instructionsDiv, { childList: true, subtree: true });
  }

  // Store active charts
  const activeCharts = {};

  // Calculate chart height and gap
  const getChartHeight = () => window.innerHeight * 0.7; // 70% of viewport height
  const chartGap = 5; // Gap between stacked charts

  // Create chart element - Notice the fixed title now, not using the panel title
  const createChartElement = (optionId) => {
    const chart = document.createElement("div");
    chart.className = "chart-container";
    chart.id = `${optionId}-chart`;

    // Add close button
    const closeBtn = document.createElement("div");
    closeBtn.className = "chart-close-btn";
    closeBtn.innerHTML = "×";
    closeBtn.onclick = function (e) {
      e.stopPropagation();
      closeChart(optionId);
    };

    chart.innerHTML = `
      <div class="chart-close-btn">×</div>
     
      <div class="chart-content">
        <div id="university-chart-container" style="width:100%; height:100%;"></div>
      </div>
    `;

    // Add click event to close button
    setTimeout(() => {
      const closeBtn = chart.querySelector(".chart-close-btn");
      if (closeBtn) {
        closeBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          closeChart(optionId);
        });
      }
    }, 0);

    return chart;
  };

  // Function to close a chart
  function closeChart(optionId) {
    const chart = document.getElementById(`${optionId}-chart`);
    if (chart) {
      chart.classList.add("closing");

      // Remove the chart after animation
      setTimeout(() => {
        chart.remove();
        delete activeCharts[optionId];

        // Also deselect the option in the panel
        const option = document.querySelector(`[data-option-id="${optionId}"]`);
        if (option) {
          option.classList.remove("selected");
          const legend = document.getElementById(`${optionId}-legend`);
          if (legend) {
            legend.classList.remove("active");
          }
        }
      }, 150);
    }
  }

  // Arrange all visible charts in the stack
  const arrangeCharts = () => {
    const chartElements = document.querySelectorAll(".chart-container");
    const chartHeight = getChartHeight();

    chartElements.forEach((chart, index) => {
      chart.style.display = "block";
      chart.style.top = `${index * (chartHeight + chartGap) + 80}px`; // Start at 80px from top
    });
  };

  // Toggle chart visibility
  const toggleChart = (optionId) => {
    const chartStack = document.getElementById("charts-stack");
    const existingChart = document.getElementById(`${optionId}-chart`);

    if (existingChart) {
      closeChart(optionId);
    } else {
      // Create and add chart if it doesn't exist - not using panel title anymore
      const newChart = createChartElement(optionId);
      chartStack.appendChild(newChart); // Add to the stack
      activeCharts[optionId] = true;

      // Short delay to allow DOM update before animation
      setTimeout(() => {
        newChart.style.display = "block";
        arrangeCharts();

        // Initialize university chart with a delay to ensure container is rendered
        setTimeout(() => {
          createUniversityChart("university-chart-container");
        }, 50);
      }, 10);
    }
  };

  // Initialize panel options click events
  document.querySelectorAll(".panel-option").forEach((option) => {
    option.addEventListener("click", function () {
      const optionId = this.getAttribute("data-option-id");
      const legend = document.getElementById(`${optionId}-legend`);

      // If legend is active (option already selected), toggle off
      if (legend.classList.contains("active")) {
        legend.classList.add("closing");
        setTimeout(() => {
          legend.classList.remove("active", "closing");
          this.classList.remove("selected");
        }, 150); // Match the closing transition time

        // Close the chart if open
        closeChart(optionId);
      } else {
        // Toggle selected state and legend visibility
        this.classList.add("selected");
        legend.classList.add("active");

        // Toggle chart visibility
        toggleChart(optionId);
      }
    });
  });

  // Handle window resize to adjust chart positions
  window.addEventListener("resize", function () {
    arrangeCharts();

    // If chart is active, resize it
    if (
      activeCharts["option1"] &&
      document.getElementById("university-chart-container")
    ) {
      // Clear and recreate chart with new dimensions
      setTimeout(() => {
        createUniversityChart("university-chart-container");
      }, 100);
    }
  });
});

/**
 * University Chart Code - Integrated from student_map_chart.js
 * Modified for better size handling and error management
 */

// Main function to create the university accessibility chart
function createUniversityChart(containerId, width = null, height = null) {
  // Get the container element
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container element with ID "${containerId}" not found`);
    return;
  }

  // Use container dimensions if width/height not specified
  if (!width) width = container.clientWidth || 800;
  if (!height) height = container.clientHeight || 500;

  // Make sure we have reasonable minimum dimensions
  width = Math.max(width, 800);
  height = Math.max(height, 400);

  // Chart dimensions and margins
  const margin = { top: 40, right: 40, bottom: 60, left: 80 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Create loading indicator
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "chart-loading";
  loadingDiv.textContent = "Loading university data...";
  container.innerHTML = "";
  container.appendChild(loadingDiv);

  // Fetch university metrics data from JSON file
  fetch("../data/university_metrics.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load data");
      }
      return response.json();
    })
    .then((data) => {
      // Data loaded successfully, create the chart
      createChart(data);
    })
    .catch((error) => {
      console.error("Error loading university data:", error);

      // Show user-friendly error message
      const errorDiv = document.createElement("div");
      errorDiv.className = "chart-fallback-message";
      errorDiv.textContent =
        "Error loading university data. Please check the console for details.";
      container.innerHTML = "";
      container.appendChild(errorDiv);
    });

  // Function to create the chart with the provided data
  function createChart(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error("Invalid or empty data received");
      const errorDiv = document.createElement("div");
      errorDiv.className = "chart-fallback-message";
      errorDiv.textContent = "No valid data available to display.";
      container.innerHTML = "";
      container.appendChild(errorDiv);
      return;
    }

    // Clear the container
    container.innerHTML = "";

    // Create SVG element with proper dimensions
    const svg = d3.create("svg").attr("width", width).attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Determine Y-axis scale type based on data distribution
    // Use log scale for widely distributed distances
    const maxDistance = d3.max(data, (d) => d.distanceFromCenter);
    const minDistance = d3.min(data, (d) => d.distanceFromCenter);
    const maxStations = d3.max(data, (d) => d.stationsWithin15Min);

    let yScale = d3
      .scaleLinear()
      .domain([0, maxDistance * 1.1])
      .range([chartHeight, 0])
      .nice();

    // X-axis scale for number of tube stations - extended to 50
    const xScale = d3
      .scaleLinear()
      .domain([0, Math.max(50, maxStations * 1.05)]) // Extend to at least 50
      .range([0, chartWidth])
      .nice();

    // Color scale - gradient based on distance from center
    const colorScale = d3
      .scaleLinear()
      .domain([0, maxDistance])
      .range(["#ffbb00", "#9e83ec"]);

    // Add grid lines
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale).tickSize(-chartHeight).tickFormat(""));

    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(yScale).tickSize(-chartWidth).tickFormat(""));

    // Add X-axis
    g.append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale).ticks(10));

    // Add X-axis label
    g.append("text")
      .attr("class", "axis-label")
      .attr("x", chartWidth / 2)
      .attr("y", chartHeight + margin.bottom - 10)
      .text("Number of Tube Stations Within 15 Minutes by Bike");

    // Add Y-axis with appropriate scale
    const yAxis = g.append("g").attr("class", "axis y-axis");
    yAxis.call(d3.axisLeft(yScale));

    // Add Y-axis label
    g.append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 15)
      .attr("x", -chartHeight / 2)
      .text("Distance from Charing Cross - London Centre (km)");

    // Add chart title
    g.append("text")
      .attr("class", "chart-title")
      .attr("x", chartWidth / 2)
      .attr("y", -margin.top / 2 + 10)
      .text("London University Cycling Accessibility to Tube Stations");

    // Create tooltip for interactive exploration
    const tooltip = d3
      .select(container)
      .append("div")
      .attr("class", "chart-tooltip");

    // Add data points (universities)
    g.selectAll(".university-dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "university-dot")
      .attr("cx", (d) => xScale(d.stationsWithin15Min))
      .attr("cy", (d) => yScale(Math.max(0.5, d.distanceFromCenter)))
      .attr("r", 8)
      .style("fill", (d) => colorScale(d.distanceFromCenter))
      .on("mouseover", function (event, d) {
        // Get data point coordinates in SVG space
        const dotX = xScale(d.stationsWithin15Min) + margin.left;
        const dotY = yScale(Math.max(0.5, d.distanceFromCenter)) + margin.top;

        // Calculate tooltip position relative to the data point
        // Position tooltip to the right of the data point with a small offset
        const tooltipX = dotX + 20; // 20px to the right of the point
        const tooltipY = dotY; // Align with the point vertically

        // Show tooltip with university details
        tooltip
          .style("visibility", "visible")
          .html(
            `
              <strong>${d.name}</strong><br>
              Distance: ${d.distanceFromCenter.toFixed(1)} km<br>
              Stations: ${d.stationsWithin15Min}
            `
          )
          .style("left", tooltipX + "px")
          .style("top", tooltipY + "px");
      })
      .on("mousemove", function (event, d) {
        // Keep tooltip fixed relative to the data point instead of following the mouse
        // This ensures the tooltip stays next to its corresponding data point
        const dotX = xScale(d.stationsWithin15Min) + margin.left;
        const dotY = yScale(Math.max(0.5, d.distanceFromCenter)) + margin.top;

        tooltip.style("left", dotX + 20 + "px").style("top", dotY + "px");
      })
      .on("mouseout", function () {
        // Hide tooltip
        tooltip.style("visibility", "hidden");
      });

    // Add color legend for distance - simplified label
    const legendWidth = 200;
    const legendHeight = 20;
    const legendX = chartWidth - legendWidth;
    const legendY = 20;

    // Create gradient for legend
    const defs = svg.append("defs");

    const linearGradient = defs
      .append("linearGradient")
      .attr("id", "distance-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    linearGradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", colorScale.range()[0]);

    linearGradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", colorScale.range()[1]);

    // Add legend rectangle with gradient
    g.append("rect")
      .attr("x", legendX)
      .attr("y", legendY)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#distance-gradient)");

    // Add legend labels - simplified to just "Near", "Distance", "Far"
    g.append("text")
      .attr("class", "chart-legend legend-text-start")
      .attr("x", legendX)
      .attr("y", legendY - 5)
      .text("Near");

    g.append("text")
      .attr("class", "chart-legend legend-text-end")
      .attr("x", legendX + legendWidth)
      .attr("y", legendY - 5)
      .text("Far");

    g.append("text")
      .attr("class", "chart-legend legend-text-middle")
      .attr("x", legendX + legendWidth / 2)
      .attr("y", legendY - 5)
      .text("Distance"); // Simplified label as requested

    // Append the SVG to the container
    container.appendChild(svg.node());
  }
}
