import { getDivisionStats } from '../../services/dataService'
import { divisionWithHyphen } from './divisionUtils'
import { updateFillColors } from './mapConfig'

// Fetch division stats from static data
export async function fetchDivisionStats() {
  try {
    console.log('Fetching division stats...')
    const stats = await getDivisionStats()
    console.log('Received division stats:', stats)
    return stats
  } catch (err) {
    console.error('Error in fetchDivisionStats:', err)
    return {}
  }
}

// Update the source data with count information
export function updateSourceWithCounts(map, divisionStats) {
  if (!map) return

  const source = map.getSource('divisions')
  if (!source) return

  const data = source._data
  if (!data || !data.features) return

  // Add count property to each feature
  const updatedFeatures = data.features.map(feature => {
    const division = divisionWithHyphen(feature.properties.DIVISION_NUM)
    const count = divisionStats[division]
    // Ensure count is a number, default to 0 if null/undefined
    const safeCount = count != null ? Number(count) : 0
    return {
      ...feature,
      properties: {
        ...feature.properties,
        count: safeCount
      }
    }
  })

  // Update the source with new data
  map.getSource('divisions').setData({
    type: 'FeatureCollection',
    features: updatedFeatures
  })

  // Update the fill colors based on the new counts
  updateFillColors(map, divisionStats)
}
