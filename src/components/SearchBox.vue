<script setup>
import { ref } from 'vue'

const searchQuery = ref('')
const emit = defineEmits(['search'])

function handleSearch() {
  emit('search', searchQuery.value)
}
</script>

<template>
  <div class="search-container">
    <input
      type="text"
      v-model="searchQuery"
      placeholder="Search..."
      @keyup.enter="handleSearch"
      class="search-input"
    />
    <button @click="handleSearch" class="search-button">
      Search
    </button>
  </div>
</template>

<style scoped>
.search-container {
  width: 100%;
  padding: 10px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  gap: 10px;
}

.search-input {
  flex: 1;
  padding: 10px 15px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  outline: none;
}

.search-input:focus {
  border-color: #4CAF50;
}

.search-button {
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.search-button:hover {
  background: #45a049;
}
</style>
