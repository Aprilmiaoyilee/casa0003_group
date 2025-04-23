import './style.css'
import { BASEMAP } from '@deck.gl/carto';
import { Map } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

//Initialise Maplibre BaseMap
const map = new Map({
  container: 'map',
  style: BASEMAP.POSITRON,
  interactive: true,
  center:[-0.12262486445294093,51.50756471490389],
  zoom: 10
})