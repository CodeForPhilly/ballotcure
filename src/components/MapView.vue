<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import maplibregl from 'maplibre-gl'
import { createClient } from '@supabase/supabase-js'
import 'maplibre-gl/dist/maplibre-gl.css'

const mapContainer = ref(null)
let map = null
const ZOOM_THRESHOLD = 13

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

    // Update the source data with count information
    updateSourceWithCounts()
  } catch (err) {
    console.error('Error in fetchDivisionStats:', err)
  }
}

// Format division with - split
function formatDivisionNum(divisionNum) {
  // Ensure the division number is padded to 4 digits
  const paddedNum = divisionNum.padStart(4, '0')
  return `${paddedNum.substr(0, 2)}-${paddedNum.substr(2, 2)}`
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
    const division = formatDivisionNum(feature.properties.DIVISION_NUM)
    const count = divisionStats.value[division]
    console.log(`Division ${division}: count = ${count}`) // Debug log
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
