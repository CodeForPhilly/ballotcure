<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const hoursLeft = ref(0)
const minutesLeft = ref(0)
const percentComplete = ref(0)

const startDate = new Date('2024-11-11T00:00:00')
const endDate = new Date('2024-11-13T00:00:00')
const totalDuration = endDate - startDate

function updateCountdown() {
  const now = new Date()
  const timeLeft = endDate - now

  if (timeLeft <= 0) {
    hoursLeft.value = 0
    minutesLeft.value = 0
    percentComplete.value = 100
    return
  }

  hoursLeft.value = Math.floor(timeLeft / (1000 * 60 * 60))
  minutesLeft.value = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
  percentComplete.value = Math.min(100, Math.max(0, (timeLeft / totalDuration) * 100))
}

let interval
onMounted(() => {
  updateCountdown()
  interval = setInterval(updateCountdown, 60000) // Update every minute
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>

<template>
  <div class="countdown-bar">
    <div class="progress-bar">
      <div class="progress" :style="{ width: percentComplete + '%' }"></div>
    </div>
    <div class="time-left">
      {{ hoursLeft }}h {{ minutesLeft }}m remaining to cure ballots
    </div>
  </div>
</template>

<style scoped>
.countdown-bar {
  width: 100%;
  position: relative;
  height: 40px;
  background: #ff474c;
}

.progress-bar {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  direction: rtl;
}

.progress {
  height: 100%;
  background: #4CAF50;
  transition: width 0.5s ease-in-out;
}

.time-left {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #000;
  font-weight: bold;
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.8);
}
</style>
