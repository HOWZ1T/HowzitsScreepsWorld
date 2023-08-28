/**
 * Returns the value of the given key in the given dictionary, or the default value if the key is not present.
 *
 * @param dictionary - The dictionary to look up the key in.
 * @param key - The key to look up in the dictionary.
 * @param defaultValue - The value to return if the key is not present in the dictionary. (Defaults to undefined.)
 *
 * @returns The value of the given key in the given dictionary, or the default value if the key is not present.
 */
module.exports.safe_get = function safe_get(dictionary: any, key: string, defaultValue: any = undefined): Creep | (undefined | any) {
    if (dictionary[key] === undefined) return defaultValue
    return dictionary[key]
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 *
 * @param min - The minimum value of the random integer.
 * @param max - The maximum value of the random integer.
 *
 * @return A random integer between min (inclusive) and max (inclusive).
 */
module.exports.randi = function randi(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min)
}