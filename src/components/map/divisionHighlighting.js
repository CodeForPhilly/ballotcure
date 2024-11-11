import { divisionWithoutHyphen } from './divisionUtils'
import maplibregl from 'maplibre-gl'

export function highlightMatchedDivisions(map, divisions) {
    if (!map) {
        console.log('Map not initialized yet')
        return []
    }

    console.log('Highlighting divisions:', divisions)

    // Reset text styling to defaults
    map.setPaintProperty('divisions-labels', 'text-color', [
        'case',
        ['any',
            ['==', ['typeof', ['get', 'count']], 'null'],
            ['<=', ['to-number', ['get', 'count']], 0]
        ],
        '#666666',  // Dark gray for zero/null values
        '#ffffff'   // White for non-zero values
    ])
    map.setPaintProperty('divisions-labels', 'text-halo-color', '#000000')
    map.setPaintProperty('divisions-labels', 'text-halo-width', 1)

    // Reset line styling
    map.setPaintProperty('divisions-layer', 'line-color', '#627BC1')
    map.setPaintProperty('divisions-layer', 'line-width', 1)

    if (!divisions || divisions.length === 0) {
        // Clear highlight effects
        map.setPaintProperty('divisions-highlight', 'fill-opacity', 0)
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

    // Update highlight overlay for matched divisions
    map.setPaintProperty('divisions-highlight', 'fill-opacity', [
        'case',
        matchFilter,
        0.4,  // Semi-transparent highlight for matches
        0     // Invisible for non-matches
    ])

    // Add a bright border for highlighted divisions
    map.setPaintProperty('divisions-layer', 'line-color', [
        'case',
        matchFilter,
        '#ff474c',  // Highlight color for matches
        '#627BC1'   // Default color
    ])

    map.setPaintProperty('divisions-layer', 'line-width', [
        'case',
        matchFilter,
        2.5,  // Thicker line for matches
        1     // Default line width
    ])

    // Update text styling based on highlight state
    map.setPaintProperty('divisions-labels', 'text-color', [
        'case',
        matchFilter,
        '#000000', // Black text for highlighted divisions
        [
            'case',
            ['any',
                ['==', ['typeof', ['get', 'count']], 'null'],
                ['<=', ['to-number', ['get', 'count']], 0]
            ],
            '#666666',  // Dark gray for zero/null values
            '#ffffff'   // White for non-zero values
        ]
    ])

    map.setPaintProperty('divisions-labels', 'text-halo-color', [
        'case',
        matchFilter,
        '#ffffff', // White halo for highlighted divisions
        '#000000'  // Black halo for normal divisions
    ])

    map.setPaintProperty('divisions-labels', 'text-halo-width', [
        'case',
        matchFilter,
        2.5, // Wider halo for highlighted divisions
        1    // Normal halo width for others
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
