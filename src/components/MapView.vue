<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const mapContainer = ref(null)
let map = null

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
  map.on('load', () => {
    map.addSource('divisions', {
      type: 'geojson',
      data: '/data/philadelphia-divisions.geojson'
    })

    map.addLayer({
      id: 'divisions-layer',
      type: 'line',  // Changed to line type for better visibility
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
    }, 'divisions-layer')  // Insert below the line layer

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
        map.setFilter('divisions-hover', ['==', ['get', 'division'], e.features[0].properties.division])
      }
    })

    map.on('mouseleave', 'divisions-layer', () => {
      map.setFilter('divisions-hover', ['==', ['get', 'division'], ''])
    })
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
