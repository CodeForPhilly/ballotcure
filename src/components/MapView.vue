<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { initializeMap, addDivisionLayers, loadDivisionData } from './map/mapConfig'
import { highlightMatchedDivisions, fitMapToFeatures } from './map/divisionHighlighting'
import { fetchDivisionStats, updateSourceWithCounts } from './map/divisionStats'
import { debounce } from './map/divisionUtils'

const mapContainer = ref(null)
let map = null

// Store highlighted divisions in reactive state
const highlightedDivisions = ref([])

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

// Create debounced version of fitMapToFeatures
const debouncedFitMapToFeatures = debounce((map, divisions, element) => {
  fitMapToFeatures(map, divisions, element)
}, 300)

// Watch for search results changes
watch(() => props.searchResults, (newResults) => {
  console.log('Search results updated:', newResults)
  if (newResults && newResults.divisions) {
    const highlighted = highlightMatchedDivisions(map, newResults.divisions)
    highlightedDivisions.value = highlighted

    // Get the search results element
    const searchResults = document.querySelector('.search-results')
    if (highlighted.length > 0) {
      debouncedFitMapToFeatures(map, highlighted, searchResults)
    }
  } else {
    highlightMatchedDivisions(map, [])
    highlightedDivisions.value = []
  }
}, { deep: true })

// Watch for changes in results expanded state
watch(() => props.isResultsExpanded, async () => {
  if (highlightedDivisions.value.length > 0) {
    await nextTick()
    const searchResults = document.querySelector('.search-results')
    debouncedFitMapToFeatures(map, highlightedDivisions.value, searchResults)
  }
})

onMounted(async () => {
  // Initialize map
  map = initializeMap(mapContainer.value)

  // Add GeoJSON data after map loads
  map.on('load', async () => {
    try {
      // Load division data
      const geojsonData = await loadDivisionData()

      // Add map layers
      addDivisionLayers(map, geojsonData)

      // Fetch and update division stats
      divisionStats.value = await fetchDivisionStats()
      updateSourceWithCounts(map, divisionStats.value)

      // Add hover interaction
      map.on('mousemove', 'divisions-layer', (e) => {
        if (e.features.length > 0) {
          const division = e.features[0].properties.DIVISION_NUM
          map.setFilter('divisions-hover', ['==', ['get', 'DIVISION_NUM'], division])
        }
      })

      map.on('mouseleave', 'divisions-layer', () => {
        map.setFilter('divisions-hover', ['==', ['get', 'DIVISION_NUM'], ''])
      })
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
