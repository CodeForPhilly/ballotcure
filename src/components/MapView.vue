<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import maplibregl from 'maplibre-gl'
import { createClient } from '@supabase/supabase-js'
import 'maplibre-gl/dist/maplibre-gl.css'

const mapContainer = ref(null)
let map = null
const ZOOM_THRESHOLD = 13

// Store highlighted divisions in reactive state
const highlightedDivisions = ref([])

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false
    }
  }
)

// Store division stats
const divisionStats = ref({})

// Define props for search results
const props = defineProps({
  searchResults: {
    type: Object,
    default: () => ({ matches: [], divisions: [] })
  },
  isResultsExpanded: {
    type: Boolean,
    default: false
  }
})

// Convert division format to remove hyphen (e.g., "01-02" -> "0102")
// Idempotent: running multiple times produces same result
function divisionWithoutHyphen(division) {
  // If no hyphen present, assume it's already in correct format
  if (!division.includes('-')) {
    return division
  }
  const [ward, div] = division.split('-')
  return ward + div
}

// Format division with hyphen (e.g., "0102" -> "01-02")
// Idempotent: running multiple times produces same result
function divisionWithHyphen(divisionNum) {
  // If already contains hyphen, return as is
  if (divisionNum.includes('-')) {
    return divisionNum
  }
  // Ensure the division number is padded to 4 digits
  const paddedNum = divisionNum.padStart(4, '0')
  return `${paddedNum.substr(0, 2)}-${paddedNum.substr(2, 2)}`
}

// Create a debounced version of a function
function debounce(fn, delay = 300) {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), delay)
  }
}

// Base fitMapToFeatures implementation
async function baseFitMapToFeatures() {
  if (!map || !highlightedDivisions.value.length) return

  console.log('Fitting map to divisions:', highlightedDivisions.value)

  // Wait for DOM updates to complete
  await nextTick()

  // Get the source data directly instead of using querySourceFeatures
  const source = map.getSource('divisions')
  if (!source || !source._data) return

  const allFeatures = source._data.features
  const features = allFeatures.filter(feature =>
    highlightedDivisions.value.includes(feature.properties.DIVISION_NUM)
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

  // Get the search results bar height after DOM updates
  const searchResults = document.querySelector('.search-results')
  const searchResultsHeight = searchResults ? searchResults.offsetHeight : 0

  console.log('Search results height:', searchResultsHeight)

  // Calculate padding based on search results height
  // Add extra padding on the bottom to account for the search results bar
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

// Create debounced version of fitMapToFeatures
const fitMapToFeatures = debounce(baseFitMapToFeatures, 300)

// Highlight matched divisions
function highlightMatchedDivisions(divisions) {
  if (!map) {
    console.log('Map not initialized yet')
    return
  }

  console.log('Highlighting divisions:', divisions)

  // Reset all divisions to default style
  map.setPaintProperty('divisions-fill', 'fill-color', '#627BC1')
  map.setPaintProperty('divisions-fill', 'fill-opacity', 0.2)
  // Reset text styling to defaults
  map.setPaintProperty('divisions-labels', 'text-color', '#ffffff')
  map.setPaintProperty('divisions-labels', 'text-halo-color', '#ff474c')
  map.setPaintProperty('divisions-labels', 'text-halo-width', 2)

  if (divisions && divisions.length > 0) {
    // Convert division format and create filter
    const convertedDivisions = divisions.map(divisionWithoutHyphen)
    console.log('Converted divisions:', convertedDivisions)

    // Store highlighted divisions
    highlightedDivisions.value = convertedDivisions

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

    // Fit map to matched divisions
    fitMapToFeatures()
  }
}

// Watch for search results changes
watch(() => props.searchResults, (newResults) => {
  console.log('Search results updated:', newResults)
  if (newResults && newResults.divisions) {
    highlightMatchedDivisions(newResults.divisions)
  } else {
    highlightMatchedDivisions([])
  }
}, { deep: true })

// Watch for changes in results expanded state
watch(() => props.isResultsExpanded, () => {
  if (highlightedDivisions.value.length > 0) {
    fitMapToFeatures()
  }
})

// Fetch division stats from Supabase
async function fetchDivisionStats() {
  try {
    console.log('Fetching division stats...')
    const { data, error } = await supabase
      .from('phila_ballots_stats')
      .select('division, count')

    if (error) {
      console.error('Error fetching division stats:', error.message, error.details)
      return
    }

    if (!data) {
      console.error('No data received from Supabase')
      return
    }

    console.log('Received division stats:', data)

    // Convert array to object for easier lookup
    divisionStats.value = data.reduce((acc, item) => {
      acc[item.division] = item.count
      return acc
    }, {})

    // Update the source data with count information
    updateSourceWithCounts()
  } catch (err) {
    console.error('Error in fetchDivisionStats:', err)
  }
}

// Update the source data with count information
function updateSourceWithCounts() {
  if (!map) return

  const source = map.getSource('divisions')
  if (!source) return

  const data = source._data
  if (!data || !data.features) return

  // Add count property to each feature
  const updatedFeatures = data.features.map(feature => {
    const division = divisionWithHyphen(feature.properties.DIVISION_NUM)
    const count = divisionStats.value[division]
    return {
      ...feature,
      properties: {
        ...feature.properties,
        count: count || 0
      }
    }
  })

  // Update the source with new data
  map.getSource('divisions').setData({
    type: 'FeatureCollection',
    features: updatedFeatures
  })
}

onMounted(() => {
  map = new maplibregl.Map({
    container: mapContainer.value,
    style: 'https://api.maptiler.com/maps/openstreetmap/style.json?key=XYHvSt2RxwZPOxjSj98n',
    center: [-75.1652, 39.9526], // Philadelphia coordinates
    zoom: 12
  })

  // Add navigation controls
  map.addControl(new maplibregl.NavigationControl())

  // Add GeoJSON data after map loads
  map.on('load', async () => {
    try {
      const response = await fetch('/data/philadelphia-divisions.geojson')
      const geojsonData = await response.json()

      map.addSource('divisions', {
        type: 'geojson',
        data: geojsonData
      })

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

      // Add labels layer with default styling
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

      // Add hover effect
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

      // Add hover interaction
      map.on('mousemove', 'divisions-layer', (e) => {
        if (e.features.length > 0) {
          const division = divisionWithHyphen(e.features[0].properties.DIVISION_NUM)
          map.setFilter('divisions-hover', ['==', ['get', 'division'], division])
        }
      })

      map.on('mouseleave', 'divisions-layer', () => {
        map.setFilter('divisions-hover', ['==', ['get', 'division'], ''])
      })

      // Fetch and display division stats
      await fetchDivisionStats()
    } catch (err) {
      console.error('Error loading map data:', err)
    }
  })
})

onUnmounted(() => {
  if (map) {
    map.remove()
  }
})
</script>

<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}
</style>
