<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { initializeMap, addDivisionLayers, loadDivisionData } from './map/mapConfig'
import { highlightMatchedDivisions, fitMapToFeatures } from './map/divisionHighlighting'
import { fetchDivisionStats, updateSourceWithCounts } from './map/divisionStats'
import { debounce, divisionWithHyphen } from './map/divisionUtils'
import { createClient } from '@supabase/supabase-js'

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

// Store highlighted divisions in reactive state
const highlightedDivisions = ref([])

// Store division stats
const divisionStats = ref({})

// Define props and emits
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

const emit = defineEmits(['update:searchResults'])

// Create debounced version of fitMapToFeatures
const debouncedFitMapToFeatures = debounce((map, divisions, element) => {
  fitMapToFeatures(map, divisions, element)
}, 300)

// Function to handle division clicks
async function handleDivisionClick(division) {
  console.log('Division clicked:', division)
  try {
    const { data, error } = await supabase
      .from('phila_ballots')
      .select('name, division, id_number, birth_year, zip, ballot_status_reason')
      .eq('division', divisionWithHyphen(division))
      .limit(100)

    if (error) {
      console.error('Supabase search error:', error)
      return
    }

    console.log('Search results:', data)

    // Update search results which will automatically update the panel
    emit('update:searchResults', {
      matches: data,
      divisions: [division]
    })

  } catch (err) {
    console.error('Search error:', err)
  }
}

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
      map.on('mousemove', 'divisions-fill', (e) => {
        if (e.features.length > 0) {
          const division = e.features[0].properties.DIVISION_NUM
          map.setFilter('divisions-hover', ['==', ['get', 'DIVISION_NUM'], division])
        }
      })

      map.on('mouseleave', 'divisions-fill', () => {
        map.setFilter('divisions-hover', ['==', ['get', 'DIVISION_NUM'], ''])
      })

      // Add click interaction
      map.on('click', 'divisions-fill', (e) => {
        if (e.features.length > 0) {
          const division = e.features[0].properties.DIVISION_NUM
          handleDivisionClick(division)
        }
      })

      // Set cursor to pointer when hovering over divisions
      map.on('mouseenter', 'divisions-fill', () => {
        map.getCanvas().style.cursor = 'pointer'
      })

      map.on('mouseleave', 'divisions-fill', () => {
        map.getCanvas().style.cursor = ''
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
