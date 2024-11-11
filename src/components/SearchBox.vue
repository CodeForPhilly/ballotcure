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
  }
}
</script>

<template>
  <div class="search-container">
    <input
      type="text"
      v-model="searchQuery"
      placeholder="Search by name (min 3 characters)..."
      class="search-input"
    />
  </div>
</template>

<style scoped>
.search-container {
  width: 100%;
  padding: 10px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.search-input {
  width: 100%;
  padding: 10px 15px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  outline: none;
}

.search-input:focus {
  border-color: #4CAF50;
}
</style>
