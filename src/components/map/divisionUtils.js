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
