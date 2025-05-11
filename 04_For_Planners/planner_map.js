// Map initialisation with precise center
mapboxgl.accessToken = 'pk.eyJ1IjoiYWlsYWdyYW50MjMiLCJhIjoiY202ODRuZmFjMDl4OTJtcjNvNnY1anoydiJ9.IwkY6zSc0skaG5Rrsb_Bog';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/ailagrant23/cmadpu5ig00ql01qog2hg6gwb',
    center: [-0.12574, 51.50853], // Exact coordinates from reference
    zoom: 9.5
});

// Create a popup for hovering over roads
const roadPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    maxWidth: '220px',
    offset: 10
});

// Add custom CSS for the popup styling
const style = document.createElement('style');
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

// Global animation duration control
const ANIMATION_DURATION = 200;

// Accident data for the line chart
const accidentData = [
  { year: 2018, fatal: 12, serious: 770, slight: 3973, total: 4755 },
  { year: 2019, fatal: 5, serious: 773, slight: 3852, total: 4630 },
  { year: 2020, fatal: 6, serious: 864, slight: 3921, total: 4791 },
  { year: 2021, fatal: 10, serious: 989, slight: 4284, total: 5283 },
  { year: 2022, fatal: 7, serious: 1021, slight: 4065, total: 5093 },
  { year: 2023, fatal: 8, serious: 931, slight: 3858, total: 4797 }
];

// Road risk data for option2 chart
const roadRiskData = [
    { id: "86547", name: "Lambeth Bridge", length_m: 284.0, accident_count: 48 },
    { id: "34301", name: "Clapham High Street", length_m: 71.5, accident_count: 48 },
    { id: "34302", name: "Clapham High Street", length_m: 82.3, accident_count: 45 },
    { id: "72440", name: "London Bridge", length_m: 523.5, accident_count: 44 },
    { id: "12027", name: "Millbank", length_m: 254.2, accident_count: 43 },
    { id: "1692", name: "Royal College Street", length_m: 124.4, accident_count: 41 },
    { id: "86573", name: "Baynes Street", length_m: 170.8, accident_count: 39 },
    { id: "74141", name: "Clapham High Street", length_m: 34.1, accident_count: 39 },
    { id: "24", name: "Outer Circle", length_m: 669.4, accident_count: 39 },
    { id: "80703", name: "Beaufort Street", length_m: 303.8, accident_count: 38 }
  ];

// Accident severity distribution data for option3 chart
const accidentSeverityData = [
    { type: "fatal", percentage: 0.2, color: "rgba(222, 244, 78, 0.81)" },
    { type: "serious", percentage: 18.2, color: "rgba(148, 219, 6, 0.81)" },
    { type: "slight", percentage: 81.6, color: "rgba(51, 182, 12, 0.81)" }
  ];

// Layer groups configuration
const layerGroups = {
    option1: {
        layers: ['accident-rate'],
        type: 'fill',
        defaultOpacity: 0.72
    },
    option2: {
        layers: ['road-accident-rates-cycle-only'],
        type: 'line',
        defaultOpacity: 0.8
    },
    option3: {
        layers: ['point_fatal', 'point_serious', 'point_slight'],
        type: 'circle',
        defaultOpacity: 0.8
    }
};

// Animation function for layer opacity transitions
function animateLayerOpacity(layerId, layerType, targetOpacity, onComplete) {
    const startOpacity = map.getPaintProperty(layerId, `${layerType}-opacity`) || 0;
    let startTime = null;

    const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;
        const fraction = Math.min(progress / ANIMATION_DURATION, 1);
        const currentOpacity = startOpacity + (targetOpacity - startOpacity) * fraction;

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

// Calculate chart height and gap
const getChartHeight = () => window.innerHeight * 0.3; // 30% of viewport height
const chartGap = 5; // Gap between stacked charts

// Function to render option1 chart (Accident Trends by Year)
const renderOption1Chart = (container) => {
    // Clear container first
    container.innerHTML = '';
    
    // Set dimensions and margins
    const margin = {top: 25, right: 20, bottom: 68, left: 50};
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;
    
    // Append SVG object
    const svg = d3.select(container)
        .append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Add X axis
    const x = d3.scaleLinear()
        .domain(d3.extent(accidentData, d => d.year))
        .range([0, width]);
    
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")));
    
    // Add Y axis with ticks every 1000 units
    const yMax = d3.max(accidentData, d => d.total);
    const yTickValues = d3.range(0, yMax + 1001, 1000);
    
    const y = d3.scaleLinear()
        .domain([0, yMax]) // Add 10% padding at top
        .range([height, 0]);
    
    // Add Y axis ticks, no vertical line, and shift tick text left by 2.8px
    svg.append("g")
        .call(
            d3.axisLeft(y)
            .tickValues(yTickValues)
            .tickFormat(d3.format("d"))
            .tickSize(0) // Don't show tick marks
        )
        .call(g => g.select(".domain").remove()) // Remove the axis line
        .selectAll("text") // Select all tick text elements
        .attr("transform", "translate(-3.0, 0)"); // Move them 2.8px to the left
    
    // Add horizontal grid lines
    svg.selectAll("grid-line")
        .data(yTickValues)
        .enter()
        .append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", d => y(d))
        .attr("y2", d => y(d))
        .attr("stroke", "#e0e0e0")
        .attr("stroke-width", 1);
    
    // Add X axis label - moved down 1.8px more (total 4.3px from original)
    svg.append("text")
        .attr("transform", `translate(${width/2},${height + margin.bottom - 35})`) // Original was -35, now -30.7
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "var(--purple-dark)")
        .text("Year");
    
    // Add Y axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left) // Left edge
        .attr("x", 1 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "var(--purple-dark)")
        .text("Number of Casualties");
    
    // Define line types with new colors
    const lineTypes = [
        { key: 'fatal', color: 'rgba(244, 120, 101, 0.8)', label: 'Fatal' },
        { key: 'serious', color: 'rgba(105, 225, 215, 0.8)', label: 'Serious' },
        { key: 'slight', color: 'rgba(133, 222, 37, 0.8)', label: 'Slight' },
        { key: 'total', color: 'rgba(124, 111, 237, 0.8)', label: 'Total' }
    ];
    
    // Create tooltip div for hover information
    const tooltip = d3.select(container)
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
    
    // Draw lines - all with consistent thickness
    lineTypes.forEach(lineType => {
        svg.append("path")
            .datum(accidentData)
            .attr("fill", "none")
            .attr("stroke", lineType.color)
            .attr("stroke-width", 2) // Consistent line thickness for all lines
            .attr("d", d3.line()
                .x(d => x(d.year))
                .y(d => y(d[lineType.key]))
            );
            
        // Add circles at data points with tooltips
        svg.selectAll(`.dot-${lineType.key}`)
            .data(accidentData)
            .enter()
            .append("circle")
            .attr("class", `dot-${lineType.key}`)
            .attr("cx", d => x(d.year))
            .attr("cy", d => y(d[lineType.key]))
            .attr("r", 4.2)
            .attr("fill", lineType.color)
            .on("mouseover", function(event, d) {
                tooltip
                    .style("visibility", "visible")
                    .html(`${lineType.label} (${d.year}): ${d[lineType.key]}`)
                    .style("left", (event.pageX - container.getBoundingClientRect().left) + "px")
                    .style("top", (event.pageY - container.getBoundingClientRect().top) + "px");
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("left", (event.pageX - container.getBoundingClientRect().left) + "px")
                    .style("top", (event.pageY - container.getBoundingClientRect().top) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("visibility", "hidden");
            });
    });
    
    // Legend at the bottom of the chart with new order: Total, Slight, Serious, Fatal
    const legendItems = [
        { key: 'total', color: 'rgba(124, 111, 237, 0.8)', label: 'Total' },
        { key: 'slight', color: 'rgba(133, 222, 37, 0.8)', label: 'Slight' },
        { key: 'serious', color: 'rgba(105, 225, 215, 0.8)', label: 'Serious' },
        { key: 'fatal', color: 'rgba(244, 120, 101, 0.8)', label: 'Fatal' }
    ];
    
    // Add more space between legend items
    const legendSpacing = width / 3.2; // Create more space between items
    const legendStartX = 130;
    const legendY = height + 45;
    
    legendItems.forEach((item, i) => {
        // Position each legend item with more space
        const xPos = (i * legendSpacing);
        
        // Add line
        svg.append("line")
            .attr("x1", xPos - 30)
            .attr("x2", xPos - 5)
            .attr("y1", legendY)
            .attr("y2", legendY)
            .attr("stroke", item.color)
            .attr("stroke-width", 2);
            
        // Add circle
        svg.append("circle")
            .attr("cx", xPos - 17.5)
            .attr("cy", legendY)
            .attr("r", 4)
            .attr("fill", item.color);
            
        // Add text label
        svg.append("text")
            .attr("x", xPos)
            .attr("y", legendY)
            .attr("dy", ".35em")
            .style("text-anchor", "start")
            .style("font-size", "10.2px")
            .style("font-weight", "500")
            .style("fill", "var(--purple-dark)")
            .text(item.label);
    });
};

// Function to render option2 chart (Road Risk Level)
const renderOption2Chart = (container) => {
    // Clear container first
    container.innerHTML = '';
    
    // Sort data by accident count (descending) but keep separate entries for roads with the same name
    const sortedData = [...roadRiskData].sort((a, b) => b.accident_count - a.accident_count);
    
    // Create unique keys for y-axis labels (adding ID to make sure Clapham High Street entries remain separate)
    sortedData.forEach(d => {
        d.uniqueKey = d.name + " (ID:" + d.id + ")";
        d.displayName = d.name; // Keep original name for display
    });
    
    // Set dimensions and margins - center y-axis and compress x-axis
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const chartCenterX = containerWidth / 2; // Find center of chart
    const margin = {
        top: 30, // Increased top margin for label
        right: 10,
        bottom: 35, // Increased for x-axis label
        left: chartCenterX - 30 // Position y-axis near center
    };
    
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;
    
    // Append SVG object
    const svg = d3.select(container)
        .append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Add X axis with modified range (30-50 instead of 0-50)
    const x = d3.scaleLinear()
        .domain([30, d3.max(sortedData, d => d.accident_count) * 1.05])
        .range([0, width]);
    
    // Add Y axis with uniqueKey to prevent merging of same-named roads
    // Significantly reduced padding to create more space between bars (3px increase)
    const y = d3.scaleBand()
        .range([0, height])
        .domain(sortedData.map(d => d.uniqueKey)) // Use uniqueKey instead of name
        .padding(0.2); // Reduced from 0.4 to 0.2 to significantly increase space between bars
    
    // Draw X-axis aligned precisely with Y-axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5))
        .attr("color", "var(--purple-dark)");
    
    // Draw Y-axis at exact position with proper alignment
    // Use displayName instead of uniqueKey for the visible labels
    const yAxis = svg.append("g")
        .attr("transform", `translate(0,0)`)
        .call(d3.axisLeft(y).tickFormat((d, i) => sortedData[i].displayName))
        .attr("color", "var(--purple-dark)");
    
    // Add Y axis label at top of axis with two lines
    svg.append("text")
        .attr("x", -37) 
        .attr("y", -21) // Keep same vertical position
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
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 2.5) // Keep same position
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "var(--purple-dark)")
        .text("Accident Count");
    
    // Add the bars - aligned with the y-axis
    svg.selectAll("bars")
        .data(sortedData)
        .enter()
        .append("rect")
        .attr("x", 0) // Start at y-axis
        .attr("y", d => y(d.uniqueKey) + 3) // Use uniqueKey for positioning
        .attr("width", d => x(d.accident_count) - x(30)) // Adjust width to match x-axis starting at 30
        .attr("height", y.bandwidth() / 1.5)
        .attr("fill", "rgba(252, 119, 96, 0.77)");
    
    // Add road length below road names with increased spacing (+2px)
    svg.selectAll(".road-length")
        .data(sortedData)
        .enter()
        .append("text")
        .attr("class", "road-length")
        .attr("x", -5) // Align with the y-axis
        .attr("y", d => y(d.uniqueKey) + y.bandwidth() / 2 + 14.8) // Keep same relative position
        .attr("text-anchor", "end")
        .style("font-size", "11px")
        .style("fill", "var(--purple-dark)")
        .text(d => `(${d.length_m.toFixed(1)}m)`);
    
    // Add accident count numbers
    svg.selectAll(".accident-count")
        .data(sortedData)
        .enter()
        .append("text")
        .attr("class", "accident-count")
        .attr("x", d => x(d.accident_count) - x(30) + 5) // Adjust x position based on new scale
        .attr("y", d => y(d.uniqueKey) + y.bandwidth() / 2 - 1.1) // Keep same relative position
        .attr("dy", ".35em")
        .style("font-size", "11px")
        .style("fill", "var(--purple-dark)")
        .style("z-index", "10") // Ensure text is above the bars
        .text(d => d.accident_count);
};

// Function to render option3 chart (Accident Locations)
const renderOption3Chart = (container) => {
    // Clear container first
    container.innerHTML = '';
    
    // Set dimensions and margins
    const margin = {top: 15, right: 10, bottom: 10, left: 50};
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;
    
    // The width of the column
    const columnWidth = width * 0.3 * 1.2; 
    
    // Define left shift value
    const leftShift = 6;
    
    // Append SVG object
    const svg = d3.select(container)
        .append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Updated severity data with new colors and rearranged order
    const updatedSeverityData = [
        { type: "slight", percentage: 81.6, color: "rgba(133, 222, 37, 0.77)" },
        { type: "serious", percentage: 18.2, color: "rgba(130, 130, 233, 0.77)" },
        { type: "fatal", percentage: 0.2, color: "rgba(244, 120, 101, 0.77)" }
    ];
    
    // Calculate starting positions for each segment in the stack
    let cumulative = 0;
    const accidentData = updatedSeverityData.map(d => {
        const item = {...d};
        item.start = cumulative;
        cumulative += item.percentage;
        return item;
    });
    
    // Create the stacked column, starting from the bottom
    // Shifted 6px to the left
    svg.selectAll("rect")
        .data(accidentData)
        .enter()
        .append("rect")
        .attr("x", width / 2 - columnWidth / 2 - leftShift) // Shifted left
        .attr("y", d => height * (1 - d.start / 100 - d.percentage / 100))
        .attr("width", columnWidth)
        .attr("height", d => height * (d.percentage / 100))
        .attr("fill", d => d.color);
    
    // Add labels to the right of each segment with consistent styling
    // Shifted 6px to the left
    svg.selectAll(".segment-label")
        .data(accidentData)
        .enter()
        .append("text")
        .attr("class", "segment-label")
        .attr("x", width / 2.25 + columnWidth / 2 + 20 - leftShift) // Shifted left
        .attr("y", d => height * (1 - d.start / 100 - d.percentage / 2 / 100))
        .attr("text-anchor", "start")
        .attr("dominant-baseline", "middle")
        .style("font-size", "12px")
        .style("fill", "var(--purple-dark)")
        .style("font-weight", "normal")
        .text(d => `${d.type} ${d.percentage}%`);
    
    // Add Y axis label
    // Moved 6px to the left
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left) // Reduced by 6px (from 15 to 9)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "var(--purple-dark)")
        .text("Percentage");
    
    // Add the Y axis showing percentage
    svg.append("g")
        .call(d3.axisLeft(d3.scaleLinear()
            .domain([0, 100])
            .range([height, 0]))
            .ticks(5)
            .tickFormat(d => `${d}%`));
};

const createChartElement = (optionId, title) => {
    const chart = document.createElement('div');
    chart.className = 'chart-container';
    chart.id = `${optionId}-chart`;
    
    // Chart heights are now defined in CSS
    chart.style.paddingTop = '10px';
    chart.style.paddingBottom = '17px';

    // Update chart title based on optionId
    let chartTitle = "Graph name";
    let chartSubtitle = "";
    if (optionId === 'option1') {
        chartTitle = "Annual casualty numbers";
        chartSubtitle = "(2018-2023)";
    } else if (optionId === 'option2') {
        chartTitle = "Top 10 Roads by casualty count";
        // No subtitle for option2
    } else if (optionId === 'option3') {
        chartTitle = "Accident Severity Distribution";
    }

    chart.innerHTML = `
        <div class="chart-title">
            ${chartTitle}
            ${chartSubtitle ? `<div style="font-size: 0.9em; margin-top: 3px;">${chartSubtitle}</div>` : ''}
        </div>
        <div class="chart-content">
        </div>
    `;

    return chart;
};

// Updated arrangeCharts function for the new scrollable layout
const arrangeCharts = () => {
    const chartStack = document.getElementById('charts-stack');
    const chartElements = document.querySelectorAll('.chart-container');
    
    // Clear the chart stack first
    while (chartStack.firstChild) {
        chartStack.removeChild(chartStack.firstChild);
    }
    
    // Sort charts by priority
    const chartsSorted = [];
    
    chartElements.forEach(chart => {
        let priority = 999; 
        
        if (chart.id === 'option1-chart') priority = 1; 
        else if (chart.id === 'option2-chart') priority = 2; 
        else if (chart.id === 'option3-chart') priority = 3; 
        
        chartsSorted.push({ element: chart, priority: priority });
    });
    
    chartsSorted.sort((a, b) => a.priority - b.priority);
    
    // Add charts back to the stack in order
    chartsSorted.forEach(chart => {
        chart.element.style.display = 'block';
        chartStack.appendChild(chart.element);
    });
};

// Updated toggleChart function
const toggleChart = (optionId) => {
    const chartStack = document.getElementById('charts-stack');
    const existingChart = document.getElementById(`${optionId}-chart`);

    if (existingChart) {
        existingChart.classList.add('closing');
        setTimeout(() => {
            existingChart.remove();
            delete activeCharts[optionId];
            arrangeCharts();
        }, ANIMATION_DURATION * 0.5); // Use global time control
    } else {
        // Create and add chart if it doesn't exist
        const optionElement = document.querySelector(`[data-option-id="${optionId}"]`);
        const title = optionElement.querySelector('.panel-option-title').textContent;

        const newChart = createChartElement(optionId, title);
        chartStack.appendChild(newChart); // Add to the chart stack
        activeCharts[optionId] = true;

        // Short delay to allow DOM update before animation
        setTimeout(() => {
            newChart.style.display = 'block';
            arrangeCharts();

            // Render the appropriate chart
            if (optionId === 'option1') {
                renderOption1Chart(newChart.querySelector('.chart-content'));
            } else if (optionId === 'option2') {
                renderOption2Chart(newChart.querySelector('.chart-content'));
            } else if (optionId === 'option3') {
                renderOption3Chart(newChart.querySelector('.chart-content'));
            }
            // Add rendering for other options here if needed
        }, 10);
    }
};

// Map initialization and layer configuration when map is loaded
map.on('load', () => {
    // Immediately hide all layers except option1 to prevent flashing
    // First, hide layers for option2 and option3
    ['option2', 'option3'].forEach(optionId => {
        const group = layerGroups[optionId];
        if (group) {
            group.layers.forEach(layerId => {
                // Set visibility to 'none' first to prevent flashing
                map.setLayoutProperty(layerId, 'visibility', 'none');
                // Set opacity to 0
                map.setPaintProperty(layerId, `${group.type}-opacity`, 0);
            });
        }
    });
    
    // Set zoom level limits for road accident layer
    map.setLayerZoomRange('road-accident-rates-cycle-only', 9, 20); // 20 is maximum zoom level
    
    // Now initialize option1 layers (the default selection)
    const defaultGroup = layerGroups['option1'];
    if (defaultGroup) {
        defaultGroup.layers.forEach(layerId => {
            map.setLayoutProperty(layerId, 'visibility', 'visible');
            map.setPaintProperty(layerId, `${defaultGroup.type}-opacity`, defaultGroup.defaultOpacity);
        });
    }

    // Add zoom event listener
    map.on('zoom', () => {
        const currentZoom = map.getZoom();
        const isRoadsActive = document.querySelector('[data-option-id="option2"]').classList.contains('selected');

        // When zoom level is between 9-12 and layer is selected
        if (currentZoom >= 9 && currentZoom < 12 && isRoadsActive) {
            map.setLayoutProperty('road-accident-rates-cycle-only', 'visibility', 'visible');
            map.setPaintProperty('road-accident-rates-cycle-only', 'line-opacity', 0.8); // Progressive opacity
        }
    });

    // Add hover functionality for road risk level layer
    map.on('mouseenter', 'road-accident-rates-cycle-only', (e) => {
        // Only show hover if the road risk option is selected
        if (!document.querySelector('[data-option-id="option2"]').classList.contains('selected')) return;
        
        // Change the cursor style
        map.getCanvas().style.cursor = 'pointer';
        
        // Get the feature properties
        const feature = e.features[0];
        const properties = feature.properties;
        
        // Extract the needed information, handling null values
        const name = properties.name || 'None';
        const length = properties.length_m ? properties.length_m.toFixed(1) + 'm' : 'None';
        const accidents = properties.accident_count || 'None';
        
        // Create HTML content for the popup
        const html = `
            <div style="font-family: 'Mulish', sans-serif; color: var(--purple-dark);">
                <div style="font-weight: bold; margin-bottom: 3px;">${name}</div>
                <div style="font-size: 13px; margin-bottom: 2px;">Length: ${length}</div>
                <div style="font-size: 13px;">Accidents: ${accidents}</div>
            </div>
        `;
        
        // Set popup content and location
        roadPopup
            .setLngLat(e.lngLat)
            .setHTML(html)
            .addTo(map);
    });

    // Remove popup when mouse leaves the road
    map.on('mouseleave', 'road-accident-rates-cycle-only', () => {
        map.getCanvas().style.cursor = '';
        roadPopup.remove();
    });
    
    // Also remove popup when map is moved
    map.on('move', () => {
        roadPopup.remove();
    });

    map.addControl(new mapboxgl.NavigationControl());
});

// Initialize panel options click events
document.querySelectorAll('.panel-option').forEach(option => {
    option.addEventListener('click', function () {
        const optionId = this.getAttribute('data-option-id');
        const legend = document.getElementById(`${optionId}-legend`);
        const isSelected = this.classList.toggle('selected');

        // Control Legend
        legend.classList.toggle('active', isSelected);

        // Control chart
        toggleChart(optionId);

        // Control map layers
        const group = layerGroups[optionId];
        if (group) {
            group.layers.forEach(layerId => {
                if (isSelected) {
                    map.setLayoutProperty(layerId, 'visibility', 'visible');
                    animateLayerOpacity(layerId, group.type, group.defaultOpacity);
                } else {
                    animateLayerOpacity(layerId, group.type, 0, () => {
                        map.setLayoutProperty(layerId, 'visibility', 'none');
                    });
                }
            });
        }
        if (optionId === 'option2') {
            const currentZoom = map.getZoom();
            if (currentZoom < 9) {
                alert('zoom level should > 9');
                this.classList.remove('selected');
                legend.classList.remove('active');
            }
        }
    });
});

// Initialize default selected state
document.addEventListener('DOMContentLoaded', () => {
    // Ensure this executes after map has loaded
    const setDefaultOption = () => {
        const defaultOption = document.querySelector('[data-option-id="option1"]');
        defaultOption.classList.add('selected');
        document.getElementById('option1-legend').classList.add('active');
        toggleChart('option1');
    };
    
    // If map is already loaded, set default option now
    if (map.loaded()) {
        setDefaultOption();
    } else {
        // Otherwise wait for the map to finish loading
        map.once('load', setDefaultOption);
    }
});

// Handle window resize to adjust chart positions and redraw charts
window.addEventListener('resize', () => {
    arrangeCharts();
    
    // Re-render charts when window is resized
    Object.keys(activeCharts).forEach(optionId => {
        const chartContent = document.querySelector(`#${optionId}-chart .chart-content`);
        if (chartContent) {
            if (optionId === 'option1') {
                renderOption1Chart(chartContent);
            } else if (optionId === 'option2') {
                renderOption2Chart(chartContent);
            } else if (optionId === 'option3') {
                renderOption3Chart(chartContent);
            }
            // Add rendering for other options here if needed
        }
    });
});