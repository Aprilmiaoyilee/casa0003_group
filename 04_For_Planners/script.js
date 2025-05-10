// Map initialisation with precise center
mapboxgl.accessToken = 'pk.eyJ1IjoiYWlsYWdyYW50MjMiLCJhIjoiY202ODRuZmFjMDl4OTJtcjNvNnY1anoydiJ9.IwkY6zSc0skaG5Rrsb_Bog';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/ailagrant23/cmadpu5ig00ql01qog2hg6gwb',
    center: [-0.12574, 51.50853], // Exact coordinates from reference
    zoom: 9.5
});

// Global animation duration control
const ANIMATION_DURATION = 200;

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
const getChartHeight = () => window.innerHeight * 0.30; // 30% of viewport height
const chartGap = 5; // Gap between stacked charts

// Create chart element
const createChartElement = (optionId, title) => {
    const chart = document.createElement('div');
    chart.className = 'chart-container';
    chart.id = `${optionId}-chart`;

    chart.innerHTML = `
        <div class="chart-title">Graph name</div>
        <div class="chart-content">
        </div>
    `;

    return chart;
};

// Arrange all visible charts in the stack
const arrangeCharts = () => {
    const chartElements = document.querySelectorAll('.chart-container');
    const chartHeight = getChartHeight();

    chartElements.forEach((chart, index) => {
        chart.style.display = 'block';
        chart.style.top = `${index * (chartHeight + chartGap)}px`;
    });
};

// Toggle chart visibility
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
        chartStack.prepend(newChart); // Add to the top of the stack
        activeCharts[optionId] = true;

        // Short delay to allow DOM update before animation
        setTimeout(() => {
            newChart.style.display = 'block';
            arrangeCharts();
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

// Handle window resize to adjust chart positions
window.addEventListener('resize', arrangeCharts);