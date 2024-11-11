<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import maplibregl from 'maplibre-gl'
import { createClient } from '@supabase/supabase-js'
import 'maplibre-gl/dist/maplibre-gl.css'

const mapContainer = ref(null)
let map = null

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

    console.log('Received data:', data)

    // Convert array to object for easier lookup
    divisionStats.value = data.reduce((acc, item) => {
      acc[item.division] = item.count
      return acc
    }, {})

    // Wait a bit to ensure the map source is fully loaded
    setTimeout(() => {
      addDivisionLabels()
    }, 1000)
  } catch (err) {
    console.error('Error in fetchDivisionStats:', err)
  }
}

// Format division with - split
function formatDivisionNum(divisionNum) {
  return `${divisionNum.substr(0, 2)}-${divisionNum.substr(2, 2)}`;
}

// Add text labels for counts
function addDivisionLabels() {
  // Remove existing labels if any
  const existingLabels = document.getElementsByClassName('division-label')
  while (existingLabels.length > 0) {
    existingLabels[0].remove()
  }

  // Get all division features
  const source = map.getSource('divisions')
  if (!source) {
    console.error('Divisions source not found')
    return
  }

  const features = map.queryRenderedFeatures(null, { layers: ['divisions-layer'] })
  console.log('Found features:', features.length)

  if (features.length === 0) {
    // Try to get features directly from the source data
    const sourceData = map.getSource('divisions')._data
    if (sourceData && sourceData.features) {
      console.log('Source features:', sourceData.features.length)
      features.push(...sourceData.features)
    }
  }

  features.forEach(feature => {
    const division = formatDivisionNum(feature.properties.DIVISION_NUM)
    console.log('Processing division:', division)
    const count = divisionStats.value[division]

    if (count !== undefined) {
      // Calculate the center of the division polygon
      const coordinates = feature.geometry.coordinates[0]
      const bounds = coordinates.reduce((bounds, coord) => {
        return [
          [Math.min(bounds[0][0], coord[0]), Math.min(bounds[0][1], coord[1])],
          [Math.max(bounds[1][0], coord[0]), Math.max(bounds[1][1], coord[1])]
        ]
      }, [[coordinates[0][0], coordinates[0][1]], [coordinates[0][0], coordinates[0][1]]])

      const center = [
        (bounds[0][0] + bounds[1][0]) / 2,
        (bounds[0][1] + bounds[1][1]) / 2
      ]

      // Create a label element
      const el = document.createElement('div')
      el.className = 'division-label'
      el.textContent = count

      // Add the label to the map
      new maplibregl.Marker({
        element: el,
        anchor: 'center'
      })
        .setLngLat(center)
        .addTo(map)
    }
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
      console.log('Loaded GeoJSON data:', geojsonData.features.length, 'features')
      console.log('Sample feature:', geojsonData.features[0])

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
          const division = formatDivisionNum(e.features[0].properties.DIVISION_NUM)
          console.log('Hovering over division:', division)
          map.setFilter('divisions-hover', ['==', ['get', 'division'], division])
        }
      })

      map.on('mouseleave', 'divisions-layer', () => {
        map.setFilter('divisions-hover', ['==', ['get', 'division'], ''])
      })

      // Fetch and display division stats
      await fetchDivisionStats()

      // Update labels on zoom end
      map.on('zoomend', addDivisionLabels)
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

:global(.division-label) {
  color: black;
  font-size: 12px;
  pointer-events: none;
  white-space: nowrap;
}
</style>
