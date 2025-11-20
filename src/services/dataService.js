// Data service for loading and querying static ballot data
let ballotsData = null;
let divisionStatsData = null;
let isLoading = false;
let loadPromise = null;

// Load the static JSON data files
async function loadData() {
  if (ballotsData && divisionStatsData) {
    return { ballots: ballotsData, stats: divisionStatsData };
  }

  if (isLoading) {
    return loadPromise;
  }

  isLoading = true;
  loadPromise = (async () => {
    try {
      const [ballotsResponse, statsResponse] = await Promise.all([
        fetch('https://codeforphilly.github.io/ballotcure/data/phila_ballots.json'),
        fetch('https://codeforphilly.github.io/ballotcure/data/division_stats.json')
      ]);

      if (!ballotsResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to load data files');
      }

      ballotsData = await ballotsResponse.json();
      divisionStatsData = await statsResponse.json();

      console.log(`Loaded ${ballotsData.length} ballot records and ${divisionStatsData.length} division stats`);

      return { ballots: ballotsData, stats: divisionStatsData };
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    } finally {
      isLoading = false;
    }
  })();

  return loadPromise;
}

// Search ballots by name (case-insensitive partial match)
export async function searchByName(query, limit = 100) {
  await loadData();

  if (!query || query.length < 3) {
    return [];
  }

  const searchTerm = query.toLowerCase();
  const matches = ballotsData.filter(ballot =>
    ballot.name.toLowerCase().includes(searchTerm)
  );

  return matches.slice(0, limit);
}

// Get ballots by division
export async function getByDivision(division, limit = 100) {
  await loadData();

  const matches = ballotsData.filter(ballot =>
    ballot.division === division
  );

  return matches.slice(0, limit);
}

// Get division statistics
export async function getDivisionStats() {
  await loadData();

  // Convert array to object for easier lookup
  return divisionStatsData.reduce((acc, item) => {
    acc[item.division] = item.count != null ? Number(item.count) : 0;
    return acc;
  }, {});
}

// Preload data (call this early in app initialization)
export async function preloadData() {
  return loadData();
}
