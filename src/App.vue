<script setup>
import { ref } from 'vue'
import CountdownBar from './components/CountdownBar.vue'
import SearchBox from './components/SearchBox.vue'
import MapView from './components/MapView.vue'
import SearchResults from './components/SearchResults.vue'

const searchResults = ref({ matches: [], divisions: [] })
const isResultsExpanded = ref(false)

function handleSearch(results) {
  searchResults.value = results
}

function handleExpandedChange(expanded) {
  isResultsExpanded.value = expanded
}

function handleMapSearch(results) {
  searchResults.value = results
  isResultsExpanded.value = true
}
</script>

<template>
  <div class="app">
    <CountdownBar />
    <SearchBox @search="handleSearch" />
    <div class="map-wrapper">
      <MapView
        :searchResults="searchResults"
        :isResultsExpanded="isResultsExpanded"
        @update:searchResults="handleMapSearch"
      />
      <SearchResults
        :results="searchResults"
        @update:expanded="handleExpandedChange"
      />
    </div>
  </div>
</template>

<style>
/* Reset default margins and ensure full viewport coverage */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

#app {
  width: 100vw;
  height: 100vh;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.map-wrapper {
  flex: 1;
  min-height: 0; /* Important for proper flexbox behavior */
  width: 100%;
  position: relative;
}
</style>
