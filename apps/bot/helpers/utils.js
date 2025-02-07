/**
 *
 */
function flattenObject(ob, prefix = "") {
    let result = {};
    for (const key in ob) {
        if (Object.prototype.hasOwnProperty.call(ob, key)) {
            const newKey = prefix ? `${prefix}.${key}` : key;

            if (typeof ob[key] === "object" && ob[key] !== null && !Array.isArray(ob[key])) {
                Object.assign(result, flattenObject(ob[key], newKey));
            } else {
                result[newKey] = ob[key];
            }
        }
    }

    return result;
}

module.exports = {
    flattenObject,
};
