// Map initialisation via Mapbox
mapboxgl.accessToken =
  "pk.eyJ1IjoiYWlsYWdyYW50MjMiLCJhIjoiY202ODRuZmFjMDl4OTJtcjNvNnY1anoydiJ9.IwkY6zSc0skaG5Rrsb_Bog";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/ailagrant23/cmadpu5ig00ql01qog2hg6gwb",
  center: [-0.12574, 51.50853], // London coordinates
  zoom: 9.5,
});

// Hover popup
const roadPopup = new mapboxgl.Popup({
  closeButton: false,
  closeOnClick: false,
  maxWidth: "220px",
  offset: 10,
});

// Add custom styling for the popup
const style = document.createElement("style");
style.textContent = `
    .mapboxgl-popup-content {
        background-color: rgba(255, 255, 255, 0.95);
        border-radius: 6px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        padding: 10px;
        border: 1px solid rgba(157, 157, 200, 0.5);
    }
    .mapboxgl-popup-tip {
        border-top-color: rgba(255, 255, 255, 0.95);
    }
`;
document.head.appendChild(style);

const ANIMATION_DURATION = 200;

// Accident data for the line chart (2018-2023)
const accidentData = [
  { year: 2018, fatal: 12, serious: 770, slight: 3973, total: 4755 },
  { year: 2019, fatal: 5, serious: 773, slight: 3852, total: 4630 },
  { year: 2020, fatal: 6, serious: 864, slight: 3921, total: 4791 },
  { year: 2021, fatal: 10, serious: 989, slight: 4284, total: 5283 },
  { year: 2022, fatal: 7, serious: 1021, slight: 4065, total: 5093 },
  { year: 2023, fatal: 8, serious: 931, slight: 3858, total: 4797 },
];

// Top 10 roads by accident count for option2 chart
const roadRiskData = [
  { id: "86547", name: "Lambeth Bridge", length_m: 284.0, accident_count: 48 },
  {
    id: "34301",
    name: "Clapham High Street",
    length_m: 71.5,
    accident_count: 48,
  },
  {
    id: "34302",
    name: "Clapham High Street",
    length_m: 82.3,
    accident_count: 45,
  },
  { id: "72440", name: "London Bridge", length_m: 523.5, accident_count: 44 },
  { id: "12027", name: "Millbank", length_m: 254.2, accident_count: 43 },
  {
    id: "1692",
    name: "Royal College Street",
    length_m: 124.4,
    accident_count: 41,
  },
  { id: "86573", name: "Baynes Street", length_m: 170.8, accident_count: 39 },
  {
    id: "74141",
    name: "Clapham High Street",
    length_m: 34.1,
    accident_count: 39,
  },
  { id: "24", name: "Outer Circle", length_m: 669.4, accident_count: 39 },
  { id: "80703", name: "Beaufort Street", length_m: 303.8, accident_count: 38 },
];

// Accident severity distribution data for option3 chart
const accidentSeverityData = [
  { type: "fatal", percentage: 0.2, color: "rgba(222, 244, 78, 0.8)" },
  { type: "serious", percentage: 18.2, color: "rgba(148, 219, 6, 0.8)" },
  { type: "slight", percentage: 81.6, color: "rgba(51, 182, 12, 0.8)" },
];

// Layer groups configuration
const layerGroups = {
  option1: {
    layers: ["accident-rate", "accident-rate-only-none"],
    type: "fill",
    defaultOpacity: 0.7,
  },
  option2: {
    layers: ["road-accident-rates-cycle-only"],
    type: "line",
    defaultOpacity: 0.8,
  },
  option3: {
    layers: ["point_fatal", "point_serious", "point_slight"],
    type: "circle",
    defaultOpacity: 0.8,
  },
};

// Animate layer opacity - changes smoothly
function animateLayerOpacity(layerId, layerType, targetOpacity, onComplete) {
  const startOpacity =
    map.getPaintProperty(layerId, `${layerType}-opacity`) || 0;
  let startTime = null;

  const step = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const progress = timestamp - startTime;
    const fraction = Math.min(progress / ANIMATION_DURATION, 1);
    const currentOpacity =
      startOpacity + (targetOpacity - startOpacity) * fraction;

    map.setPaintProperty(layerId, `${layerType}-opacity`, currentOpacity);

    if (fraction < 1) {
      requestAnimationFrame(step);
    } else if (onComplete) {
      onComplete();
    }
  };
  requestAnimationFrame(step);
}

// Store active charts
const activeCharts = {};

// Function to render option1 chart (Accident Trends by Year)
const renderOption1Chart = (container) => {
  // Clear container
  container.innerHTML = "";

  // Set dimensions and margins
  const margin = { top: 25, right: 20, bottom: 70, left: 50 };
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;

  // Create SVG element
  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", containerWidth)
    .attr("height", containerHeight)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Add X axis (years)
  const x = d3
    .scaleLinear()
    .domain(d3.extent(accidentData, (d) => d.year))
    .range([0, width]);

  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")));

  // Add Y axis with ticks every 1000 units
  const yMax = d3.max(accidentData, (d) => d.total);
  const yTickValues = d3.range(0, yMax + 1001, 1000);

  const y = d3.scaleLinear().domain([0, yMax]).range([height, 0]);

  svg
    .append("g")
    .call(
      d3
        .axisLeft(y)
        .tickValues(yTickValues)
        .tickFormat(d3.format("d"))
        .tickSize(0)
    )
    .call((g) => g.select(".domain").remove())
    .selectAll("text")
    .attr("transform", "translate(-3, 0)");

  // Add horizontal grid lines
  svg
    .selectAll("grid-line")
    .data(yTickValues)
    .enter()
    .append("line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", (d) => y(d))
    .attr("y2", (d) => y(d))
    .attr("stroke", "#e0e0e0")
    .attr("stroke-width", 1);

  // Add X axis label
  svg
    .append("text")
    .attr("transform", `translate(${width / 2},${height + margin.bottom - 35})`)
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "var(--purple-dark)")
    .text("Year");

  // Add Y axis label
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "var(--purple-dark)")
    .text("Number of Casualties");

  // Define line types with colors
  const lineTypes = [
    { key: "fatal", color: "rgba(244, 120, 101, 0.8)", label: "Fatal" },
    { key: "serious", color: "rgba(105, 225, 215, 0.8)", label: "Serious" },
    { key: "slight", color: "rgba(133, 222, 37, 0.8)", label: "Slight" },
    { key: "total", color: "rgba(124, 111, 237, 0.8)", label: "Total" },
  ];

  // Create tooltip for hover information
  const tooltip = d3
    .select(container)
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "white")
    .style("border", "1px solid var(--purple-dark)")
    .style("border-radius", "5px")
    .style("padding", "5px")
    .style("font-size", "12px")
    .style("color", "var(--purple-dark)")
    .style("pointer-events", "none")
    .style("z-index", "10");

  // Draw lines for each data series
  lineTypes.forEach((lineType) => {
    // Add the line
    svg
      .append("path")
      .datum(accidentData)
      .attr("fill", "none")
      .attr("stroke", lineType.color)
      .attr("stroke-width", 2)
      .attr(
        "d",
        d3
          .line()
          .x((d) => x(d.year))
          .y((d) => y(d[lineType.key]))
      );

    // Add circles at data points with tooltips
    svg
      .selectAll(`.dot-${lineType.key}`)
      .data(accidentData)
      .enter()
      .append("circle")
      .attr("class", `dot-${lineType.key}`)
      .attr("cx", (d) => x(d.year))
      .attr("cy", (d) => y(d[lineType.key]))
      .attr("r", 4)
      .attr("fill", lineType.color)
      .on("mouseover", function (event, d) {
        tooltip
          .style("visibility", "visible")
          .html(`${lineType.label} (${d.year}): ${d[lineType.key]}`)
          .style(
            "left",
            event.pageX - container.getBoundingClientRect().left + "px"
          )
          .style(
            "top",
            event.pageY - container.getBoundingClientRect().top + "px"
          );
      })
      .on("mousemove", function (event) {
        tooltip
          .style(
            "left",
            event.pageX - container.getBoundingClientRect().left + "px"
          )
          .style(
            "top",
            event.pageY - container.getBoundingClientRect().top + "px"
          );
      })
      .on("mouseout", function () {
        tooltip.style("visibility", "hidden");
      });
  });

  // Add legend at the bottom
  const legendItems = [
    { key: "total", color: "rgba(124, 111, 237, 0.8)", label: "Total" },
    { key: "slight", color: "rgba(133, 222, 37, 0.8)", label: "Slight" },
    { key: "serious", color: "rgba(105, 225, 215, 0.8)", label: "Serious" },
    { key: "fatal", color: "rgba(244, 120, 101, 0.8)", label: "Fatal" },
  ];

  // Position legend items
  const legendSpacing = width / 3.2;
  const legendY = height + 45;

  legendItems.forEach((item, i) => {
    const xPos = i * legendSpacing;

    // Add line
    svg
      .append("line")
      .attr("x1", xPos - 30)
      .attr("x2", xPos - 5)
      .attr("y1", legendY)
      .attr("y2", legendY)
      .attr("stroke", item.color)
      .attr("stroke-width", 2);

    // Add circle
    svg
      .append("circle")
      .attr("cx", xPos - 18)
      .attr("cy", legendY)
      .attr("r", 4)
      .attr("fill", item.color);

    // Add text label
    svg
      .append("text")
      .attr("x", xPos)
      .attr("y", legendY)
      .attr("dy", ".35em")
      .style("text-anchor", "start")
      .style("font-size", "10px")
      .style("font-weight", "500")
      .style("fill", "var(--purple-dark)")
      .text(item.label);
  });
};

// Function to render option2 chart (Road Risk Level)
const renderOption2Chart = (container) => {
  // Clear container
  container.innerHTML = "";

  // Sort data by accident count (descending)
  const sortedData = [...roadRiskData].sort(
    (a, b) => b.accident_count - a.accident_count
  );

  // Create unique keys for y-axis labels
  sortedData.forEach((d) => {
    d.uniqueKey = d.name + " (ID:" + d.id + ")";
    d.displayName = d.name;
  });

  // Set dimensions and margins
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  const chartCenterX = containerWidth / 2;
  const margin = {
    top: 30,
    right: 10,
    bottom: 35,
    left: chartCenterX - 30, // Position y-axis near center
  };

  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;

  // Create SVG element
  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", containerWidth)
    .attr("height", containerHeight)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Add X axis with range starting at 30
  const x = d3
    .scaleLinear()
    .domain([30, d3.max(sortedData, (d) => d.accident_count) * 1.05])
    .range([0, width]);

  // Add Y axis with uniqueKey to prevent merging same-named roads
  const y = d3
    .scaleBand()
    .range([0, height])
    .domain(sortedData.map((d) => d.uniqueKey))
    .padding(0.2);

  // Draw X-axis
  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5))
    .attr("color", "var(--purple-dark)");

  // Draw Y-axis with road names only
  svg
    .append("g")
    .call(d3.axisLeft(y).tickFormat((d, i) => sortedData[i].displayName))
    .attr("color", "var(--purple-dark)");

  // Add Y axis label
  svg
    .append("text")
    .attr("x", -35)
    .attr("y", -20)
    .style("text-anchor", "start")
    .style("font-size", "11px")
    .style("fill", "var(--purple-dark)")
    .append("tspan")
    .text("Road Name")
    .append("tspan")
    .attr("x", -3)
    .attr("dy", "1.2em")
    .attr("text-anchor", "middle")
    .text("(Length)");

  // Add X axis label
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 3)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "var(--purple-dark)")
    .text("Accident Count");

  // Add bars
  svg
    .selectAll("bars")
    .data(sortedData)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d) => y(d.uniqueKey) + 3)
    .attr("width", (d) => x(d.accident_count) - x(30))
    .attr("height", y.bandwidth() / 1.5)
    .attr("fill", "rgba(252, 119, 96, 0.8)");

  // Add road length below road names
  svg
    .selectAll(".road-length")
    .data(sortedData)
    .enter()
    .append("text")
    .attr("class", "road-length")
    .attr("x", -5)
    .attr("y", (d) => y(d.uniqueKey) + y.bandwidth() / 2 + 15)
    .attr("text-anchor", "end")
    .style("font-size", "11px")
    .style("fill", "var(--purple-dark)")
    .text((d) => `(${d.length_m.toFixed(1)}m)`);

  // Add accident count numbers
  svg
    .selectAll(".accident-count")
    .data(sortedData)
    .enter()
    .append("text")
    .attr("class", "accident-count")
    .attr("x", (d) => x(d.accident_count) - x(30) + 5)
    .attr("y", (d) => y(d.uniqueKey) + y.bandwidth() / 2)
    .attr("dy", ".35em")
    .style("font-size", "11px")
    .style("fill", "var(--purple-dark)")
    .text((d) => d.accident_count);
};

// Function to render option3 chart (Accident Severity Distribution)
const renderOption3Chart = (container) => {
  // Clear container
  container.innerHTML = "";

  // Set dimensions and margins
  const margin = { top: 15, right: 10, bottom: 10, left: 50 };
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;

  // Column width and positioning
  const columnWidth = width * 0.36;
  const leftShift = 6;

  // Create SVG element
  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", containerWidth)
    .attr("height", containerHeight)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Severity data with arranged order
  const severityData = [
    { type: "slight", percentage: 81.6, color: "rgba(133, 222, 37, 0.8)" },
    { type: "serious", percentage: 18.2, color: "rgba(130, 130, 233, 0.8)" },
    { type: "fatal", percentage: 0.2, color: "rgba(244, 120, 101, 0.8)" },
  ];

  // Calculate starting positions for each segment
  let cumulative = 0;
  const stackedData = severityData.map((d) => {
    const item = { ...d };
    item.start = cumulative;
    cumulative += item.percentage;
    return item;
  });

  // Create the stacked column
  svg
    .selectAll("rect")
    .data(stackedData)
    .enter()
    .append("rect")
    .attr("x", width / 2 - columnWidth / 2 - leftShift)
    .attr("y", (d) => height * (1 - d.start / 100 - d.percentage / 100))
    .attr("width", columnWidth)
    .attr("height", (d) => height * (d.percentage / 100))
    .attr("fill", (d) => d.color);

  // Add labels for each segment
  svg
    .selectAll(".segment-label")
    .data(stackedData)
    .enter()
    .append("text")
    .attr("class", "segment-label")
    .attr("x", width / 2 + columnWidth / 2 - leftShift + 10)
    .attr("y", (d) => height * (1 - d.start / 100 - d.percentage / 2 / 100))
    .attr("text-anchor", "start")
    .attr("dominant-baseline", "middle")
    .style("font-size", "12px")
    .style("fill", "var(--purple-dark)")
    .text((d) => `${d.type} ${d.percentage}%`);

  // Add Y axis label
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left)
    .attr("x", -height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "var(--purple-dark)")
    .text("Percentage");

  // Add Y axis with percentage ticks
  svg.append("g").call(
    d3
      .axisLeft(d3.scaleLinear().domain([0, 100]).range([height, 0]))
      .ticks(5)
      .tickFormat((d) => `${d}%`)
  );
};

// Create chart container element
const createChartElement = (optionId) => {
  const chart = document.createElement("div");
  chart.className = "chart-container";
  chart.id = `${optionId}-chart`;

  // Apply padding
  chart.style.paddingTop = "10px";
  chart.style.paddingBottom = "15px";

  // Set chart title based on option
  let chartTitle = "";
  let chartSubtitle = "";

  if (optionId === "option1") {
    chartTitle = "Annual casualty numbers";
    chartSubtitle = "(2018-2023)";
  } else if (optionId === "option2") {
    chartTitle = "Top 10 Roads by casualty count";
  } else if (optionId === "option3") {
    chartTitle = "Accident Severity Distribution";
  }

  // Create chart HTML structure
  chart.innerHTML = `
    <div class="chart-title">
      ${chartTitle}
      ${
        chartSubtitle
          ? `<div style="font-size: 0.9em; margin-top: 3px;">${chartSubtitle}</div>`
          : ""
      }
    </div>
    <div class="chart-content"></div>
  `;

  return chart;
};

const arrangeCharts = () => {
  const chartStack = document.getElementById("charts-stack");
  const chartElements = document.querySelectorAll(".chart-container");

  // Sort charts by priority (option1: highest, option3: lowest)
  const chartsSorted = [];

  chartElements.forEach((chart) => {
    let priority = 999;

    if (chart.id === "option1-chart") priority = 1;
    else if (chart.id === "option2-chart") priority = 2;
    else if (chart.id === "option3-chart") priority = 3;

    chartsSorted.push({ element: chart, priority: priority });
  });

  // Sort by priority (ascending)
  chartsSorted.sort((a, b) => a.priority - b.priority);

  // Create a document fragment to minimise reflows
  const fragment = document.createDocumentFragment();
  chartsSorted.forEach((chart) => {
    // Preserve classes during rearrangement
    fragment.appendChild(chart.element);
  });

  // Clear and repopulate the chart stack
  while (chartStack.firstChild) {
    chartStack.removeChild(chartStack.firstChild);
  }

  chartStack.appendChild(fragment);

  // Ensure all charts are displayed
  chartsSorted.forEach((chart) => {
    chart.element.style.display = "block";
  });
};

// Add custom styling for charts transition
const chartStyle = document.createElement("style");
chartStyle.textContent = `
    .chart-container {
        opacity: 0;
        transform: translateY(10px);
        transition: opacity ${ANIMATION_DURATION}ms ease, transform ${ANIMATION_DURATION}ms ease;
    }
    .chart-container.visible {
        opacity: 1;
        transform: translateY(0);
    }
    .chart-container.closing {
        opacity: 0;
        transform: translateY(10px);
    }
`;
document.head.appendChild(chartStyle);

// Toggle chart visibility when an option is selected/deselected
// Toggle chart visibility when an option is selected/deselected
const toggleChart = (optionId) => {
  const chartStack = document.getElementById("charts-stack");
  const existingChart = document.getElementById(`${optionId}-chart`);

  if (existingChart) {
    // Remove chart if it exists - apply closing animation first
    existingChart.classList.add("closing");
    existingChart.classList.remove("visible");

    setTimeout(() => {
      existingChart.remove();
      delete activeCharts[optionId];
      arrangeCharts();
    }, ANIMATION_DURATION / 2);
  } else {
    // Create and add chart if it doesn't exist
    const optionElement = document.querySelector(
      `[data-option-id="${optionId}"]`
    );
    const title = optionElement.querySelector(
      ".panel-option-title"
    ).textContent;

    const newChart = createChartElement(optionId);
    chartStack.appendChild(newChart);
    activeCharts[optionId] = true;

    // Short delay to allow DOM update before rendering
    setTimeout(() => {
      // Apply visibility class to trigger CSS transition
      newChart.classList.add("visible");
      arrangeCharts();

      // Render the appropriate chart
      const chartContent = newChart.querySelector(".chart-content");
      if (optionId === "option1") {
        renderOption1Chart(chartContent);
      } else if (optionId === "option2") {
        renderOption2Chart(chartContent);
      } else if (optionId === "option3") {
        renderOption3Chart(chartContent);
      }
    }, 10);
  }
};

let lastFeatureId = null;

// Map initialisation and layer configuration
map.on("load", () => {
  // Hide all layers except option1 to prevent flickering
  ["option2", "option3"].forEach((optionId) => {
    const group = layerGroups[optionId];
    if (group) {
      group.layers.forEach((layerId) => {
        // Set initial visibility to 'none'
        map.setLayoutProperty(layerId, "visibility", "none");
        // Set initial opacity to 0
        map.setPaintProperty(layerId, `${group.type}-opacity`, 0);
      });
    }
  });

  // Initialise option1 layers (default selection)
  const defaultGroup = layerGroups["option1"];
  if (defaultGroup) {
    defaultGroup.layers.forEach((layerId) => {
      map.setLayoutProperty(layerId, "visibility", "visible");
      map.setPaintProperty(
        layerId,
        `${defaultGroup.type}-opacity`,
        defaultGroup.defaultOpacity
      );
    });
  }

  // Add mouse hover
  map.on("mousemove", "accident-rate", (e) => {
    if (
      !document
        .querySelector('[data-option-id="option1"]')
        .classList.contains("selected")
    )
      return;

    const feature = e.features[0];
    if (!feature || !feature.properties) return;

    // get unique id
    const currentFeatureId =
      feature.properties.LSOA11CD ||
      feature.id ||
      JSON.stringify(feature.properties);

    if (currentFeatureId === lastFeatureId) return;

    lastFeatureId = currentFeatureId;

    map.getCanvas().style.cursor = "pointer";

    const properties = feature.properties;
    const html = `
      <div style="font-family: 'Mulish', sans-serif; color: var(--purple-dark);">
        <div style="font-weight: bold;">${properties.LSOA11NM || "None"}</div>
        <div>Cyclists: ${Math.round(
          properties.cyclists_per_lsoa_multi_6_cyclists_per_lsoa_multi6 || 0
        )}</div>
        <div>Accidents: ${
          properties.cyclists_per_lsoa_multi_6_accident_count || 0
        }</div>
        <div>Rate: ${
          properties.allacciden
            ? (properties.allacciden * 100).toFixed(1) + "%"
            : "None"
        }</div>
      </div>
    `;

    roadPopup.setLngLat(e.lngLat).setHTML(html).addTo(map);
  });

  // same mouse hover for accident-rate-only-none
  map.on("mousemove", "accident-rate-only-none", (e) => {
    if (
      !document
        .querySelector('[data-option-id="option1"]')
        .classList.contains("selected")
    )
      return;

    const feature = e.features[0];
    if (!feature || !feature.properties) return;

    const currentFeatureId =
      feature.properties.LSOA11CD ||
      feature.id ||
      JSON.stringify(feature.properties);
    if (currentFeatureId === lastFeatureId) return;

    lastFeatureId = currentFeatureId;
    map.getCanvas().style.cursor = "pointer";

    const properties = feature.properties;
    const html = `
      <div style="font-family: 'Mulish', sans-serif; color: var(--purple-dark);">
        <div style="font-weight: bold;">${properties.LSOA11NM || "None"}</div>
        <div>Cyclists: ${Math.round(
          properties.cyclists_per_lsoa_multi_6_cyclists_per_lsoa_multi6 || 0
        )}</div>
        <div>Accidents: ${
          properties.cyclists_per_lsoa_multi_6_accident_count || 0
        }</div>
        <div>Rate: None</div>
      </div>
    `;

    roadPopup.setLngLat(e.lngLat).setHTML(html).addTo(map);
  });

  // reset tracking when mouseleave
  map.on("mouseleave", "accident-rate", () => {
    map.getCanvas().style.cursor = "";
    roadPopup.remove();
    lastFeatureId = null;
  });

  map.on("mouseleave", "accident-rate-only-none", () => {
    map.getCanvas().style.cursor = "";
    roadPopup.remove();
    lastFeatureId = null;
  });

  // reset tracking when map moves
  map.on("movestart", () => {
    roadPopup.remove();
    lastFeatureId = null;
  });

  // Handle hover for road risk level layer
  map.on("mousemove", "road-accident-rates-cycle-only", (e) => {
    if (
      !document
        .querySelector('[data-option-id="option2"]')
        .classList.contains("selected")
    )
      return;

    map.getCanvas().style.cursor = "pointer";

    const properties = e.features[0].properties;

    // Extract information with null handling
    const name = properties.name ?? "None";
    const length =
      properties.length_m != null
        ? properties.length_m.toFixed(1) + "m"
        : "None";
    const accidents =
      properties.accident_count != null ? properties.accident_count : "None";

    const html = `
      <div style="font-family: 'Mulish', sans-serif; color: var(--purple-dark);">
        <div style="font-weight: bold; margin-bottom: 3px;">${name}</div>
        <div style="font-size: 13px;">Length: ${length}</div>
        <div style="font-size: 13px;">Accidents: ${accidents}</div>
      </div>
    `;

    roadPopup.setLngLat(e.lngLat).setHTML(html).addTo(map);
  });

  // Remove popup when mouse leaves the road
  map.on("mouseleave", "road-accident-rates-cycle-only", () => {
    map.getCanvas().style.cursor = "";
    roadPopup.remove();
  });

  // Remove popup when map is moved
  map.on("move", () => {
    roadPopup.remove();
  });

  // Add navigation controls
  map.addControl(new mapboxgl.NavigationControl());
});

// Handle hover for accident location layers
["point_fatal", "point_serious", "point_slight"].forEach((layerId) => {
  map.on("mousemove", layerId, (e) => {
    if (
      !document
        .querySelector('[data-option-id="option3"]')
        .classList.contains("selected")
    )
      return;

    map.getCanvas().style.cursor = "pointer";
    const properties = e.features[0].properties;

    // Convert severity code to text
    const severityCode = parseInt(properties.casualty_severity, 10);
    let severityText = "None";

    if (severityCode === 1) severityText = "Fatal";
    else if (severityCode === 2) severityText = "Serious";
    else if (severityCode === 3) severityText = "Slight";

    const html = `
      <div style="font-family: 'Mulish', sans-serif; color: var(--purple-dark);">
        <div style="font-weight: bold; margin-bottom: 3px;">Accident Details</div>
        <div style="font-size: 13px;">Severity: ${severityText}</div>
      </div>
    `;

    roadPopup.setLngLat(e.lngLat).setHTML(html).addTo(map);
  });

  // Remove popup when mouse leaves the point
  map.on("mouseleave", layerId, () => {
    map.getCanvas().style.cursor = "";
    roadPopup.remove();
  });
});

// Set up panel option click events
document.querySelectorAll(".panel-option").forEach((option) => {
  option.addEventListener("click", function () {
    const optionId = this.getAttribute("data-option-id");
    const legend = document.getElementById(`${optionId}-legend`);
    const isSelected = this.classList.toggle("selected");

    // Toggle legend visibility
    legend.classList.toggle("active", isSelected);

    // Toggle chart
    toggleChart(optionId);

    // Toggle map layers
    const group = layerGroups[optionId];
    if (group) {
      group.layers.forEach((layerId) => {
        if (isSelected) {
          map.setLayoutProperty(layerId, "visibility", "visible");
          animateLayerOpacity(layerId, group.type, group.defaultOpacity);
        } else {
          animateLayerOpacity(layerId, group.type, 0, () => {
            map.setLayoutProperty(layerId, "visibility", "none");
          });
        }
      });
    }
  });
});

// Set default selected option on page load
document.addEventListener("DOMContentLoaded", () => {
  const setDefaultOption = () => {
    const defaultOption = document.querySelector('[data-option-id="option1"]');
    defaultOption.classList.add("selected");
    document.getElementById("option1-legend").classList.add("active");
    toggleChart("option1");
  };

  // Set default option based on map load state
  if (map.loaded()) {
    setDefaultOption();
  } else {
    map.once("load", setDefaultOption);
  }
});

// Handle window resize
window.addEventListener("resize", () => {
  // Rearrange charts
  arrangeCharts();

  // Re-render active charts
  Object.keys(activeCharts).forEach((optionId) => {
    const chartContent = document.querySelector(
      `#${optionId}-chart .chart-content`
    );
    if (chartContent) {
      if (optionId === "option1") {
        renderOption1Chart(chartContent);
      } else if (optionId === "option2") {
        renderOption2Chart(chartContent);
      } else if (optionId === "option3") {
        renderOption3Chart(chartContent);
      }
    }
  });
});
