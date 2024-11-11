// Convert division format to remove hyphen (e.g., "01-02" -> "0102")
// Idempotent: running multiple times produces same result
export function divisionWithoutHyphen(division) {
    // If no hyphen present, assume it's already in correct format
    if (!division.includes('-')) {
        return division
    }
    const [ward, div] = division.split('-')
    return ward + div
}

// Format division with hyphen (e.g., "0102" -> "01-02")
// Idempotent: running multiple times produces same result
export function divisionWithHyphen(divisionNum) {
    // If already contains hyphen, return as is
    if (divisionNum.includes('-')) {
        return divisionNum
    }
    // Ensure the division number is padded to 4 digits
    const paddedNum = divisionNum.padStart(4, '0')
    return `${paddedNum.substr(0, 2)}-${paddedNum.substr(2, 2)}`
}

// Create a debounced version of a function
export function debounce(fn, delay = 300) {
    let timeoutId
    return function (...args) {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => fn.apply(this, args), delay)
    }
}

// Find division that contains the given coordinates
export function findDivisionByCoordinates(map, lngLat) {
    if (!map || !map.getSource('divisions') || !map.getSource('divisions')._data) {
        return null;
    }

    const point = [lngLat.lng, lngLat.lat];
    const features = map.getSource('divisions')._data.features;

    // Find the first division polygon that contains the point
    const containingFeature = features.find(feature => {
        if (feature.geometry.type !== 'Polygon') return false;
        return pointInPolygon(point, feature.geometry.coordinates[0]);
    });

    return containingFeature ? containingFeature.properties.DIVISION_NUM : null;
}

// Helper function to check if a point is inside a polygon
function pointInPolygon(point, polygon) {
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];

        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

        if (intersect) inside = !inside;
    }

    return inside;
}
