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

function getColorScale(minCount, maxCount) {
    // Define base colors from light to dark green
    const colors = [
        '#e5f5e0',  // Very light green
        '#c7e9c0',
        '#a1d99b',
        '#74c476',
        '#41ab5d',
        '#238b45',
        '#006d2c'   // Dark green
    ]

    const stops = []

    // Add special case for zero/null values
    stops.push([0, '#f5f5f5'])  // Light gray for zero values

    // Handle case where all values are 0 or min equals max
    if (minCount === maxCount) {
        stops.push([maxCount, colors[colors.length - 1]])
        return stops
    }

    // Calculate logarithmic steps between min and max
    const nonZeroMin = Math.max(0.1, minCount)  // Avoid log(0)
    const logMin = Math.log(nonZeroMin)
    const logMax = Math.log(maxCount)
    const step = (logMax - logMin) / (colors.length - 1)

    // Add intermediate color stops
    for (let i = 0; i < colors.length; i++) {
        const logValue = logMin + (step * i)
        const value = Math.round(Math.exp(logValue) * 100) / 100  // Round to 2 decimal places
        stops.push([value, colors[i]])
    }

    return stops
}

export function addDivisionLayers(map, geojsonData) {
    map.addSource('divisions', {
        type: 'geojson',
        data: geojsonData
    })

    // Add fill layer first (below the line layer)
    map.addLayer({
        id: 'divisions-fill',
        type: 'fill',
        source: 'divisions',
        paint: {
            'fill-color': [
                'case',
                ['any',
                    ['==', ['typeof', ['get', 'count']], 'null'],
                    ['==', ['to-number', ['get', 'count']], 0]
                ],
                '#f5f5f5',  // Light gray for zero/null values
                ['interpolate', ['linear'], ['to-number', ['get', 'count']], 0, '#e5f5e0', 1, '#006d2c']
            ],
            'fill-opacity': 0.8
        }
    })

    // Add line layer
    map.addLayer({
        id: 'divisions-layer',
        type: 'line',
        source: 'divisions',
        paint: {
            'line-color': '#627BC1',
            'line-width': 1
        }
    })

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
            'text-color': [
                'case',
                ['any',
                    ['==', ['typeof', ['get', 'count']], 'null'],
                    ['<=', ['to-number', ['get', 'count']], 0]
                ],
                '#666666',  // Dark gray for zero/null values
                '#ffffff'   // White for non-zero values
            ],
            'text-halo-color': '#000000',
            'text-halo-width': 1
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

export function updateFillColors(map, divisionStats) {
    if (!map || !divisionStats) return

    // Calculate min and max counts from valid numbers only
    const counts = Object.values(divisionStats)
        .filter(count => count != null && !isNaN(count) && count > 0)
        .map(count => Number(count))

    if (counts.length === 0) return

    const minCount = Math.min(...counts)
    const maxCount = Math.max(...counts)

    // Generate color stops based on the actual data range
    const colorStops = getColorScale(minCount, maxCount)

    // Update the fill layer's paint property with comprehensive null/zero handling
    map.setPaintProperty('divisions-fill', 'fill-color', [
        'case',
        ['any',
            ['==', ['typeof', ['get', 'count']], 'null'],
            ['==', ['to-number', ['get', 'count']], 0]
        ],
        '#f5f5f5',  // Light gray for zero/null values
        [
            'interpolate',
            ['linear'],
            ['to-number', ['get', 'count']],
            ...colorStops.flat()
        ]
    ])
}

export async function loadDivisionData() {
    const response = await fetch('/data/philadelphia-divisions.geojson')
    return await response.json()
}
