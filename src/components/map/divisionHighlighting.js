import { divisionWithoutHyphen } from './divisionUtils'
import maplibregl from 'maplibre-gl'

export function highlightMatchedDivisions(map, divisions) {
    if (!map) {
        console.log('Map not initialized yet')
        return []
    }

    console.log('Highlighting divisions:', divisions)

    // Reset all divisions to default style
    map.setPaintProperty('divisions-fill', 'fill-color', '#627BC1')
    map.setPaintProperty('divisions-fill', 'fill-opacity', 0.2)
    // Reset text styling to defaults
    map.setPaintProperty('divisions-labels', 'text-color', '#ffffff')
    map.setPaintProperty('divisions-labels', 'text-halo-color', '#ff474c')
    map.setPaintProperty('divisions-labels', 'text-halo-width', 2)

    if (!divisions || divisions.length === 0) {
        return []
    }

    // Convert division format and create filter
    const convertedDivisions = divisions.map(divisionWithoutHyphen)
    console.log('Converted divisions:', convertedDivisions)

    // Create a filter for matched divisions
    const matchFilter = ['in',
        ['get', 'DIVISION_NUM'],
        ['literal', convertedDivisions]
    ]

    console.log('Applying match filter:', JSON.stringify(matchFilter))

    // Highlight matched divisions
    map.setPaintProperty('divisions-fill', 'fill-color', [
        'case',
        matchFilter,
        '#ff474c', // Highlight color for matches
        '#627BC1'  // Default color
    ])

    map.setPaintProperty('divisions-fill', 'fill-opacity', [
        'case',
        matchFilter,
        0.5,  // Higher opacity for matches
        0.2   // Default opacity
    ])

    // Update text styling based on highlight state
    map.setPaintProperty('divisions-labels', 'text-color', [
        'case',
        matchFilter,
        '#333333', // Dark text for highlighted divisions
        '#ffffff'  // White text for normal divisions
    ])

    map.setPaintProperty('divisions-labels', 'text-halo-color', [
        'case',
        matchFilter,
        '#ffffff', // White halo for highlighted divisions
        '#ff474c' // Red halo for normal divisions
    ])

    map.setPaintProperty('divisions-labels', 'text-halo-width', [
        'case',
        matchFilter,
        2.5, // Wider halo for highlighted divisions
        2    // Normal halo width for others
    ])

    return convertedDivisions
}

export function fitMapToFeatures(map, highlightedDivisions, searchResultsElement) {
    if (!map || !highlightedDivisions.length) return

    console.log('Fitting map to divisions:', highlightedDivisions)

    // Get the source data directly instead of using querySourceFeatures
    const source = map.getSource('divisions')
    if (!source || !source._data) return

    const allFeatures = source._data.features
    const features = allFeatures.filter(feature =>
        highlightedDivisions.includes(feature.properties.DIVISION_NUM)
    )

    console.log('Found matching features:', features.length)

    if (features.length === 0) return

    // Calculate bounds of all matched features
    const bounds = new maplibregl.LngLatBounds()
    features.forEach(feature => {
        if (feature.geometry.type === 'Polygon') {
            feature.geometry.coordinates[0].forEach(coord => {
                bounds.extend(coord)
            })
        }
    })

    console.log('Bounds:', bounds)

    // Get the search results bar height
    const searchResultsHeight = searchResultsElement ? searchResultsElement.offsetHeight : 0

    console.log('Search results height:', searchResultsHeight)

    // Calculate padding based on search results height
    const padding = {
        top: 50,
        bottom: searchResultsHeight + 50, // Add extra padding for search results
        left: 50,
        right: 50
    }

    // Fit map to bounds with dynamic padding
    map.fitBounds(bounds, {
        padding,
        maxZoom: 16
    })
}
