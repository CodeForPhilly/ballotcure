<script setup>
import { ref, watch } from 'vue'
import { createClient } from '@supabase/supabase-js'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const searchQuery = ref(props.modelValue)
const isLoading = ref(false)  // Only used for initial loading
const isSearching = ref(false) // Used for search in progress
const emit = defineEmits(['search', 'update:modelValue'])

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

// Debounce function to limit API calls
let debounceTimeout
function debounce(func, wait) {
  return (...args) => {
    clearTimeout(debounceTimeout)
    debounceTimeout = setTimeout(() => func(...args), wait)
  }
}

// Watch for external value changes
watch(() => props.modelValue, (newValue) => {
  if (newValue !== searchQuery.value) {
    searchQuery.value = newValue
  }
})

// Watch for internal value changes
watch(searchQuery, (newValue) => {
  emit('update:modelValue', newValue)
})

// Watch for search query changes with debounce
const debouncedSearch = debounce(async (query) => {
  console.log('Search query changed:', query)

  if (query.length >= 3) {
    await handleSearch()
  } else if (query.length === 0) {
    // Don't clear results if the query was cleared externally
    console.log('Query cleared')
  } else {
    console.log('Query too short, clearing results')
    emit('search', { matches: [], divisions: [], searchTerm: '' })
  }
}, 300)

watch(searchQuery, debouncedSearch)

async function handleSearch() {
  if (searchQuery.value.length < 3) return

  console.log('Executing search for:', searchQuery.value)
  isSearching.value = true

  try {
    const { data, error } = await supabase
      .from('phila_ballots')
      .select('name, division, id_number, birth_year, zip, ballot_status_reason')
      .ilike('name', `%${searchQuery.value}%`)
      .limit(100)

    if (error) {
      console.error('Supabase search error:', error)
      return
    }

    console.log('Search results:', data)

    // Extract unique divisions from matches
    const divisions = [...new Set(data.map(item => `${item.division}`))]
    console.log('Unique divisions:', divisions)

    emit('search', {
      matches: data,
      divisions: divisions,
      searchTerm: searchQuery.value
    })
  } catch (err) {
    console.error('Search error:', err)
  } finally {
    isSearching.value = false
  }
}
</script>

<template>
  <div class="search-container">
    <div class="search-wrapper">
      <input
        type="text"
        v-model="searchQuery"
        placeholder="Search by name (min 3 characters)..."
        class="search-input"
        :disabled="isLoading"
      />
      <div v-if="isLoading || isSearching" class="loading-spinner"></div>
    </div>
  </div>
</template>

<style scoped>
.search-container {
  width: 100%;
  padding: 10px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.search-wrapper {
  position: relative;
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 10px 15px;
  padding-right: 40px; /* Space for spinner */
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  outline: none;
}

.search-input:focus {
  border-color: #4CAF50;
}

.search-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.loading-spinner {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: translateY(-50%) rotate(0deg); }
  100% { transform: translateY(-50%) rotate(360deg); }
}
</style>
