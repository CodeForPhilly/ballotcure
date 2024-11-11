<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { initializeMap, addDivisionLayers, loadDivisionData } from './map/mapConfig'
import { highlightMatchedDivisions, fitMapToFeatures } from './map/divisionHighlighting'
import { fetchDivisionStats, updateSourceWithCounts } from './map/divisionStats'
import { debounce, divisionWithHyphen, findDivisionByCoordinates } from './map/divisionUtils'
import { createClient } from '@supabase/supabase-js'
import maplibregl from 'maplibre-gl'

const mapContainer = ref(null)
let map = null
let userMarker = null

// Loading states
const isLoadingMap = ref(true)
const isLoadingLocation = ref(false)
const isLoadingDivision = ref(false)

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

// Create a custom marker element
function createMarkerElement() {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.width = '50px';
  wrapper.style.height = '50px';

  // Create center dot
  const dot = document.createElement('div');
  dot.style.position = 'absolute';
  dot.style.left = '50%';
  dot.style.top = '50%';
  dot.style.transform = 'translate(-50%, -50%)';
  dot.style.width = '12px';
  dot.style.height = '12px';
  dot.style.backgroundColor = '#3388ff';
  dot.style.borderRadius = '50%';
  dot.style.border = '2px solid white';
  dot.style.boxShadow = '0 0 4px rgba(0,0,0,0.4)';
  wrapper.appendChild(dot);

  // Create three pulse rings
  for (let i = 0; i < 3; i++) {
    const ring = document.createElement('div');
    ring.style.position = 'absolute';
    ring.style.left = '50%';
    ring.style.top = '50%';
    ring.style.transform = 'translate(-50%, -50%)';
    ring.style.width = '12px';
    ring.style.height = '12px';
    ring.style.borderRadius = '50%';
    ring.style.border = '2px solid #3388ff';
    ring.style.opacity = '0';
    ring.style.animation = `pulse${i + 1} 2s infinite`;
    wrapper.appendChild(ring);
  }

  // Add keyframes for each ring
  if (!document.getElementById('marker-pulse-keyframes')) {
    const style = document.createElement('style');
    style.id = 'marker-pulse-keyframes';
    style.textContent = `
      @keyframes pulse1 {
        0% { width: 12px; height: 12px; opacity: 0.6; }
        100% { width: 40px; height: 40px; opacity: 0; }
      }
      @keyframes pulse2 {
        0% { width: 12px; height: 12px; opacity: 0; }
        33% { width: 12px; height: 12px; opacity: 0.6; }
        100% { width: 40px; height: 40px; opacity: 0; }
      }
      @keyframes pulse3 {
        0% { width: 12px; height: 12px; opacity: 0; }
        66% { width: 12px; height: 12px; opacity: 0.6; }
        100% { width: 40px; height: 40px; opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  return wrapper;
}

// Function to get user's location
async function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lng: position.coords.longitude,
          lat: position.coords.latitude
        });
      },
      (error) => {
        console.log('Geolocation error:', error.message);
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  });
}

// Function to select and load division data
async function selectDivision(division, location = null) {
  console.log('Selecting division:', division);
  isLoadingDivision.value = true;

  try {
    const { data, error } = await supabase
      .from('phila_ballots')
      .select('name, division, id_number, birth_year, zip, ballot_status_reason')
      .eq('division', divisionWithHyphen(division))
      .limit(100);

    if (error) {
      console.error('Supabase search error:', error);
      return;
    }

    console.log('Search results:', data);

    // Update search results which will automatically update the panel
    emit('update:searchResults', {
      matches: data,
      divisions: [division]
    });

    // If location is provided, add/update the marker
    if (location) {
      if (userMarker) {
        userMarker.remove();
      }
      const markerEl = createMarkerElement();
      userMarker = new maplibregl.Marker({
        element: markerEl,
        anchor: 'center'
      })
        .setLngLat([location.lng, location.lat])
        .addTo(map);
    }

  } catch (err) {
    console.error('Search error:', err);
  } finally {
    isLoadingDivision.value = false;
  }
}

// Function to highlight user's division
async function highlightUserDivision() {
  isLoadingLocation.value = true;

  try {
    const location = await getUserLocation();

    // Check if coordinates are within Philadelphia bounds (rough estimate)
    const phillyBounds = {
      north: 40.1379,
      south: 39.8688,
      east: -74.9557,
      west: -75.2804
    };

    if (location.lat < phillyBounds.south || location.lat > phillyBounds.north ||
        location.lng < phillyBounds.west || location.lng > phillyBounds.east) {
      console.log('User location is outside Philadelphia');
      return;
    }

    // Find the division containing these coordinates
    const division = findDivisionByCoordinates(map, location);
    if (division) {
      await selectDivision(division, location);
    }
  } catch (error) {
    console.error('Error getting user location:', error);
  } finally {
    isLoadingLocation.value = false;
  }
}

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

      // Wait for the style to be fully loaded before getting user location
      map.once('styledata', async () => {
        // Get and highlight user's division
        await highlightUserDivision()
      });

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
          selectDivision(division)
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
    } finally {
      isLoadingMap.value = false
    }
  })
})

onUnmounted(() => {
  // Remove the keyframes style if it exists
  const keyframesStyle = document.getElementById('marker-pulse-keyframes');
  if (keyframesStyle) {
    keyframesStyle.remove();
  }

  if (userMarker) {
    userMarker.remove()
  }
  if (map) {
    map.remove()
  }
})
</script>

<template>
  <div class="map-container">
    <div ref="mapContainer" class="map"></div>

    <!-- Loading overlays -->
    <div v-if="isLoadingMap" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading map data...</div>
    </div>

    <div v-if="isLoadingLocation" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">Getting your location...</div>
    </div>

    <div v-if="isLoadingDivision" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading division data...</div>
    </div>
  </div>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
  position: relative;
}

.map {
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

.loading-text {
  color: #333;
  font-size: 16px;
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
