import { createClient } from '@supabase/supabase-js'
import { divisionWithHyphen } from './divisionUtils'

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

// Fetch division stats from Supabase
export async function fetchDivisionStats() {
    try {
        console.log('Fetching division stats...')
        const { data, error } = await supabase
            .from('phila_ballots_stats')
            .select('division, count')

        if (error) {
            console.error('Error fetching division stats:', error.message, error.details)
            return {}
        }

        if (!data) {
            console.error('No data received from Supabase')
            return {}
        }

        console.log('Received division stats:', data)

        // Convert array to object for easier lookup
        return data.reduce((acc, item) => {
            acc[item.division] = item.count
            return acc
        }, {})
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
        return {
            ...feature,
            properties: {
                ...feature.properties,
                count: count || 0
            }
        }
    })

    // Update the source with new data
    map.getSource('divisions').setData({
        type: 'FeatureCollection',
        features: updatedFeatures
    })
}
