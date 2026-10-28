/**
 * Safely escapes characters with special meaning in regular expressions
 * to prevent ReDoS or syntax errors when building dynamic MongoDB queries.
 *
 * @param {string} str - Raw user input string
 * @returns {string} Escaped string safe for use in RegExp constructor or $regex
 */
function escapeRegex(str) {
  if (typeof str !== "string") {
    return "";
  }
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = escapeRegex;
