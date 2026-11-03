'use strict';

/**
 * Renders a value for use in an error message.
 * @param {unknown} value - The value to describe.
 * @returns {string} A short, human-readable description of the value.
 */
function describe(value) {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return value === null ? 'null' : typeof value;
}

/**
 * Asserts that a value is a finite number.
 * @param {unknown} value - The value to check.
 * @param {string} name - The parameter name, used in the error message.
 * @returns {number} The value, now known to be a finite number.
 * @throws {TypeError} If the value is not a number, or is NaN or Infinity.
 */
function assertFiniteNumber(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number, got ${describe(value)}`);
  }
  return value;
}

/**
 * Adds two numbers.
 * @param {number} a - The first operand.
 * @param {number} b - The second operand.
 * @returns {number} The sum of `a` and `b`.
 * @throws {TypeError} If either operand is not a finite number.
 */
function add(a, b) {
  return assertFiniteNumber(a, 'a') + assertFiniteNumber(b, 'b');
}

/**
 * Subtracts one number from another.
 * @param {number} a - The number to subtract from.
 * @param {number} b - The number to subtract.
 * @returns {number} The difference `a - b`.
 * @throws {TypeError} If either operand is not a finite number.
 */
function subtract(a, b) {
  return assertFiniteNumber(a, 'a') - assertFiniteNumber(b, 'b');
}

/**
 * Multiplies two numbers.
 * @param {number} a - The first factor.
 * @param {number} b - The second factor.
 * @returns {number} The product of `a` and `b`.
 * @throws {TypeError} If either operand is not a finite number.
 */
function multiply(a, b) {
  return assertFiniteNumber(a, 'a') * assertFiniteNumber(b, 'b');
}

/**
 * Divides one number by another.
 * @param {number} a - The dividend.
 * @param {number} b - The divisor.
 * @returns {number} The quotient `a / b`.
 * @throws {TypeError} If either operand is not a finite number.
 * @throws {RangeError} If `b` is zero.
 */
function divide(a, b) {
  assertFiniteNumber(a, 'a');
  assertFiniteNumber(b, 'b');
  if (b === 0) {
    throw new RangeError('b must not be zero');
  }
  return a / b;
}

/**
 * Returns the remainder of dividing one number by another.
 * @param {number} a - The dividend.
 * @param {number} b - The divisor.
 * @returns {number} The remainder `a % b`.
 * @throws {TypeError} If either operand is not a finite number.
 * @throws {RangeError} If `b` is zero.
 */
function modulo(a, b) {
  assertFiniteNumber(a, 'a');
  assertFiniteNumber(b, 'b');
  if (b === 0) {
    throw new RangeError('b must not be zero');
  }
  return a % b;
}

/** @type {Record<string, (a: number, b: number) => number>} */
const OPERATIONS = { add, subtract, multiply, divide, modulo };

/**
 * Parses a command-line argument into a number.
 * @param {string} argument - The raw argument text.
 * @param {string} name - The parameter name, used in the error message.
 * @returns {number} The parsed number.
 * @throws {TypeError} If the argument does not parse to a finite number.
 */
function parseOperand(argument, name) {
  // Number('') and Number(' ') are both 0, so blank input would otherwise
  // compute silently instead of being rejected.
  const text = String(argument ?? '').trim();
  const parsed = text === '' ? Number.NaN : Number(text);
  if (!Number.isFinite(parsed)) {
    throw new TypeError(`${name} must be a finite number, got ${describe(argument)}`);
  }
  return parsed;
}

/**
 * Runs one calculation described by command-line arguments.
 * @param {string[]} argv - Arguments in the form `<operation> <a> <b>`.
 * @returns {number} The result of the calculation.
 * @throws {TypeError} If the operation is unknown, the wrong number of
 *   operands is given, or an operand is not a finite number.
 * @throws {RangeError} If the calculation divides by zero.
 */
function run(argv) {
  const [operation, ...operands] = argv;
  if (!Object.hasOwn(OPERATIONS, operation ?? '')) {
    const known = Object.keys(OPERATIONS).join(', ');
    throw new TypeError(`operation must be one of: ${known}; got ${describe(operation)}`);
  }
  if (operands.length !== 2) {
    throw new TypeError(`${operation} takes exactly 2 operands, got ${operands.length}`);
  }
  return OPERATIONS[operation](parseOperand(operands[0], 'a'), parseOperand(operands[1], 'b'));
}

/** @type {Record<string, unknown>} */
const api = { add, subtract, multiply, divide, modulo, run };

// CommonJS for Node and the test suite; a `calculator` global when the same
// file is loaded by index.html via a plain <script> tag.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else {
  globalThis.calculator = api;
}

if (typeof require !== 'undefined' && require.main === module) {
  try {
    console.log(run(process.argv.slice(2)));
  } catch (error) {
    console.error(`${error.name}: ${error.message}`);
    console.error('usage: node src/calculator.js <add|subtract|multiply|divide|modulo> <a> <b>');
    process.exitCode = 1;
  }
}
