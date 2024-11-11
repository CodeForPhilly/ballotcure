<script setup>
import CountdownBar from './components/CountdownBar.vue'
import SearchBox from './components/SearchBox.vue'
import MapView from './components/MapView.vue'

function handleSearch(query) {
  console.log('Search query:', query)
  // TODO: Implement search functionality
}
</script>

<template>
  <div class="app">
    <CountdownBar />
    <SearchBox @search="handleSearch" />
    <div class="map-wrapper">
      <MapView />
    </div>
  </div>
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.map-wrapper {
  flex: 1;
  min-height: 0; /* Important for proper flexbox behavior */
}
</style>
