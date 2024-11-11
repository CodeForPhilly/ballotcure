import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

export const ZOOM_THRESHOLD = 13
export const PHILLY_CENTER = [-75.1652, 39.9526]
export const DEFAULT_ZOOM = 12

export function initializeMap(container) {
    const map = new maplibregl.Map({
        container,
        style: 'https://api.maptiler.com/maps/openstreetmap/style.json?key=XYHvSt2RxwZPOxjSj98n',
        center: PHILLY_CENTER,
        zoom: DEFAULT_ZOOM
    })

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl())

    return map
}

export function addDivisionLayers(map, geojsonData) {
    map.addSource('divisions', {
        type: 'geojson',
        data: geojsonData
    })

    // Add line layer
    map.addLayer({
        id: 'divisions-layer',
        type: 'line',
        source: 'divisions',
        paint: {
            'line-color': '#627BC1',
            'line-width': 1.5
        }
    })

    // Add fill layer below the line layer
    map.addLayer({
        id: 'divisions-fill',
        type: 'fill',
        source: 'divisions',
        paint: {
            'fill-color': '#627BC1',
            'fill-opacity': 0.2
        }
    }, 'divisions-layer')

    // Add labels layer
    map.addLayer({
        id: 'divisions-labels',
        type: 'symbol',
        source: 'divisions',
        minzoom: ZOOM_THRESHOLD,
        layout: {
            'text-field': ['to-string', ['get', 'count']],
            'text-size': 14,
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'text-anchor': 'center',
            'text-max-width': 8
        },
        paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#ff474c',
            'text-halo-width': 2
        }
    })

    // Add hover effect layer
    map.addLayer({
        id: 'divisions-hover',
        type: 'line',
        source: 'divisions',
        paint: {
            'line-color': '#000000',
            'line-width': 2
        },
        filter: ['==', ['get', 'division'], '']
    })
}

export async function loadDivisionData() {
    const response = await fetch('/data/philadelphia-divisions.geojson')
    return await response.json()
}
