// Mapbox token
mapboxgl.accessToken =
  "pk.eyJ1IjoiYWlsYWdyYW50MjMiLCJhIjoiY202ODRuZmFjMDl4OTJtcjNvNnY1anoydiJ9.IwkY6zSc0skaG5Rrsb_Bog";

// Initialize map - following the successful student map pattern
var map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/ailagrant23/cmaivdr8s010n01qohek1dec6",
  center: [-0.1275, 51.5072],
  zoom: 9.5,
});

// Set up layer information
const layers = [
  {
    id: "cycle-network-intersected-4326",
    name: "Cycle Network",
    type: "line",
  },
  {
    id: "cycle-parking-4326",
    name: "Cycle Parking",
    type: "symbol",
  },
  {
    id: "accident-2018-2023-4326",
    name: "Accidents (2018–2023)",
    type: "circle",
  },
  {
    id: "underground-tube-stations-4326",
    name: "Tube Stations",
    type: "symbol",
  },
  {
    id: "higher-education-establishments-4326",
    name: "Universities",
    type: "symbol",
  },
];

// Default opacity values for each layer type
const defaultOpacity = {
  line: 0.8,
  circle: 0.8,
  fill: 0.72,
};

// Wait for the map to load
map.on("load", function () {
  console.log("Map loaded");

  // Add navigation controls AFTER map is loaded
  map.addControl(new mapboxgl.NavigationControl());

  // Set up panel options click events
  document.querySelectorAll(".panel-option").forEach((option) => {
    const layerId = option.getAttribute("data-option-id");
    const layerType = option.getAttribute("data-layer-type");

    // Set all layers visible by default
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", "visible");

      // Set default opacity for non-symbol layers
      if (layerType !== "symbol" && layerType) {
        map.setPaintProperty(
          layerId,
          `${layerType}-opacity`,
          defaultOpacity[layerType] || 0.8
        );
      }

      // Mark option as selected
      option.classList.add("selected");
    }

    // Add click event listener
    option.addEventListener("click", function () {
      const isSelected = this.classList.toggle("selected");

      // Toggle layer visibility
      if (map.getLayer(layerId)) {
        if (isSelected) {
          // Show layer
          map.setLayoutProperty(layerId, "visibility", "visible");

          // Animate opacity for non-symbol layers
          if (layerType !== "symbol" && layerType) {
            const startOpacity =
              map.getPaintProperty(layerId, `${layerType}-opacity`) || 0;
            const targetOpacity = defaultOpacity[layerType] || 0.8;

            // Simple animation for opacity
            let step = 0;
            const steps = 10;
            const interval = setInterval(() => {
              step++;
              const opacity =
                startOpacity + (targetOpacity - startOpacity) * (step / steps);
              map.setPaintProperty(layerId, `${layerType}-opacity`, opacity);

              if (step >= steps) {
                clearInterval(interval);
              }
            }, 20);
          }
        } else {
          // For non-symbol layers, animate opacity to 0 before hiding
          if (layerType !== "symbol" && layerType) {
            const startOpacity =
              map.getPaintProperty(layerId, `${layerType}-opacity`) || 0;

            // Simple animation for opacity
            let step = 0;
            const steps = 10;
            const interval = setInterval(() => {
              step++;
              const opacity = startOpacity * (1 - step / steps);
              map.setPaintProperty(layerId, `${layerType}-opacity`, opacity);

              if (step >= steps) {
                clearInterval(interval);
                map.setLayoutProperty(layerId, "visibility", "none");
              }
            }, 20);
          } else {
            // For symbol layers, just hide immediately
            map.setLayoutProperty(layerId, "visibility", "none");
          }
        }
      }
    });
  });
});
