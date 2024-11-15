<script setup>
import { divisionWithHyphen } from './map/divisionUtils'
import { ref, computed, watch } from 'vue'

const props = defineProps({
  results: {
    type: Object,
    default: () => ({ matches: [], divisions: [], searchTerm: '' })
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  isLocationLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:expanded'])

const isExpanded = ref(false)

const sortedResults = computed(() => {
  return [...props.results.matches].sort((a, b) => a.name.localeCompare(b.name))
})

const hasResults = computed(() => props.results.matches.length > 0)

// Compute the results title based on the type of search
const resultsTitle = computed(() => {
  if (props.isLocationLoading) {
    return 'Getting your location...'
  }

  if (props.isLoading) {
    return 'Loading results...'
  }

  if (!hasResults.value) {
    return 'No Results'
  }

  // If there's a search term, it's a text-based search
  if (props.results.searchTerm) {
    return `Search Results for "${props.results.searchTerm}": ${props.results.matches.length} Results`
  }

  // If there's exactly one division, it's from a map click
  if (props.results.divisions.length === 1) {
    return `Division ${divisionWithHyphen(props.results.divisions[0])}: ${props.results.matches.length} Results`
  }

  // Default case
  return `${props.results.matches.length} Results`
})

// Watch for changes in results to auto-expand/collapse
watch(() => props.results.matches.length, (newCount) => {
  // Auto-expand if there are any results
  if (newCount > 0) {
    isExpanded.value = true
    emit('update:expanded', true)
  } else {
    isExpanded.value = false
    emit('update:expanded', false)
  }
}, { immediate: true })

const toggleExpand = () => {
  // Only allow toggling if there are results and not loading
  if (hasResults.value && !props.isLoading && !props.isLocationLoading) {
    isExpanded.value = !isExpanded.value
    emit('update:expanded', isExpanded.value)
  }
}
</script>

<template>
  <div class="search-results" :class="{ expanded: isExpanded }">
    <div class="results-header" @click="toggleExpand">
      <div class="header-content">
        <span class="result-count">{{ resultsTitle }}</span>
        <div v-if="isLoading || isLocationLoading" class="loading-spinner"></div>
        <button v-else-if="hasResults" class="expand-button">
          {{ isExpanded ? '▼' : '▲' }}
        </button>
      </div>
    </div>

    <div v-if="isExpanded" class="results-content">
      <div class="cure-instructions">
        See <a href="/help.pdf" target="_blank">help.pdf</a> for instructions on how to cure a ballot! Submit <a href="/form.pdf" target="_blank">form.pdf</a> via email or in-person. Call the Board of Elections with any questions: <a href="tel:2156863469">(215) 686-3469</a>
      </div>
      <div class="results-list">
        <div v-for="result in sortedResults" :key="result.name + result.division" class="result-card">
          <div class="result-name">{{ result.name }}</div>
          <div class="result-details">
            <div class="detail-row">
              <span class="label">Division:</span>
              <span class="value">{{ result.division }}</span>
            </div>
            <div class="detail-row">
              <span class="label">ID:</span>
              <span class="value">{{ result.id_number }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Birth Year:</span>
              <span class="value">{{ result.birth_year }}</span>
            </div>
            <div class="detail-row">
              <span class="label">ZIP:</span>
              <span class="value">{{ result.zip }}</span>
            </div>
            <div class="detail-row status">
              <span class="label">Status:</span>
              <span class="value">{{ result.ballot_status_reason }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-results {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  border-radius: 12px 12px 0 0;
  transition: transform 0.3s ease;
  max-height: 40vh;
  display: flex;
  flex-direction: column;
  transform: translateY(0);
}

.search-results:not(.expanded) {
  transform: translateY(calc(100% - 52px));
}

.results-header {
  padding: 15px;
  border-bottom: 1px solid #eee;
  user-select: none;
  min-height: 52px;
  box-sizing: border-box;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.cure-instructions {
  background-color: #fff3cd;
  color: #856404;
  padding: 10px 15px;
  font-size: 14px;
  border-bottom: 1px solid #ffeeba;
  text-align: center;
  margin-bottom: 10px;
}

.cure-instructions a {
  color: #533f03;
  font-weight: bold;
  text-decoration: underline;
}

.cure-instructions a:hover {
  color: #533f03;
  text-decoration: none;
}

.result-count {
  font-weight: 600;
  color: #333;
}

.expand-button {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #666;
  padding: 8px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.results-content {
  overflow-y: auto;
  padding: 10px;
  flex: 1;
  -webkit-overflow-scrolling: touch;
}

.results-list {
  display: grid;
  gap: 10px;
  padding: 10px;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.result-card {
  background: #f8f9fa;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 12px;
  transition: transform 0.2s ease;
}

.result-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.result-name {
  font-weight: 600;
  margin-bottom: 12px;
  color: #2c3e50;
  font-size: 16px;
}

.result-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid #eee;
}

.detail-row:last-child {
  border-bottom: none;
}

.label {
  color: #666;
  font-size: 14px;
}

.value {
  color: #2c3e50;
  font-size: 14px;
  font-weight: 500;
}

.status .value {
  color: #e63946;
  font-weight: 600;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Mobile Optimizations */
@media (max-width: 768px) {
  .results-list {
    grid-template-columns: 1fr;
  }

  .search-results {
    max-height: 50vh;
  }

  .result-card {
    padding: 10px;
  }

  .search-results:not(.expanded) {
    transform: translateY(calc(100% - 52px));
  }
}
</style>
