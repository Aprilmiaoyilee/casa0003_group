// src/main.js
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

import maplibregl from 'maplibre-gl';
import {MapboxOverlay} from '@deck.gl/mapbox';
import {GeoJsonLayer} from '@deck.gl/layers';

// ➡️ these now point at http://localhost:5173/⟨filename⟩
const cycleNetURL = '/cycle_network_intersected_27700.geojson';
const cycleParkingURL = '/cycle_parking_27700.geojson';
const glaBoundaryURL = '/4326_GLA_Boundary.geojson';

function makeCycleNetLayer(beforeId) {
    return new GeoJsonLayer({
        id: 'cycle-network',
        data: cycleNetURL,
        stroked: true,
        filled: false,
        // ❗️ Give your lines an actual width
        lineWidthMinPixels: 2,
        getLineColor: [0, 128, 255],
        beforeId
    });
}

function makeCycleParkingLayer(beforeId) {
    return new GeoJsonLayer({
        id: 'cycle-parking',
        data: cycleParkingURL,
        stroked: false,
        filled: true,
        // ❗️ Give your points an actual radius
        getPointRadius: () => 6,
        pointRadiusMinPixels: 6,
        getFillColor: [200, 0, 80, 180],
        beforeId
    });
}

function makeGlaBoundaryLayer(beforeId) {
    return new GeoJsonLayer({
        id: 'gla-boundary',
        data: glaBoundaryURL,
        stroked: false,
        filled: true,
        getFillColor: [0, 0, 0, 50],
        beforeId
    });
}


const map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [-0.1276, 51.5074],
    zoom: 10
});

const deckOverlay = new MapboxOverlay({layers: []});
map.addControl(deckOverlay);

map.on('load', () => {
    const firstSymbolId = map.getStyle().layers.find(l => l.type === 'symbol').id;
    console.log('firstSymbolId:', firstSymbolId);

    const DATASETS = [
        {id: 'cycle-network', name: 'Cycle Network', make: () => makeCycleNetLayer(firstSymbolId)},
        {id: 'cycle-parking', name: 'Cycle Parking', make: () => makeCycleParkingLayer(firstSymbolId)},
        {id: 'gla-boundary', name: 'GLA Boundary', make: () => makeGlaBoundaryLayer(firstSymbolId)}
    ];

    const list = document.getElementById('dataset-list');

    function updateDeckLayers() {
        const activeLayers = DATASETS
            .filter(ds => {
                const checked = document.getElementById(ds.id).checked;
                console.log(`  ▶ ${ds.id} checked?`, checked);
                return checked;
            })
            .map(ds => ds.make());

        console.log('→ calling deckOverlay.setProps with layers:', activeLayers.map(l => l.id));
        deckOverlay.setProps({layers: activeLayers});
    }

    DATASETS.forEach(ds => {
        const li = document.createElement('li');
        li.className = 'dataset-toggle';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = ds.id;

        const label = document.createElement('label');
        label.htmlFor = ds.id;
        label.textContent = ds.name;

        cb.addEventListener('change', () => {
            console.log(`✚ toggled ${ds.id}`);
            updateDeckLayers();
        });

        li.append(cb, label);
        list.appendChild(li);
    });

    // optional: turn on by default
    document.querySelectorAll('#dataset-list input').forEach(i => i.checked = true);
    updateDeckLayers();
});
