// Small, dependency-free validation helpers shared across routes.
// Messages follow the same plain style as the auth dictionary.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmail(value) {
  return typeof value === "string" && EMAIL_RE.test(value.trim());
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isArrayOfShapes(value, shapeKeys) {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      item &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      shapeKeys.every((k) => typeof item[k] === "string" && item[k].trim().length > 0),
  );
}

function isDomain(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !/\s/.test(value) &&
    value.includes(".")
  );
}

module.exports = { isEmail, nonEmpty, isArrayOfShapes, isDomain };
