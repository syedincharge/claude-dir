'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { add, subtract, multiply, divide, modulo, run } = require('../src/calculator.js');

test('add sums its operands', () => {
  assert.equal(add(2, 3), 5);
  assert.equal(add(-4, 1.5), -2.5);
});

test('subtract takes the second operand from the first', () => {
  assert.equal(subtract(10, 4), 6);
  assert.equal(subtract(0, 7), -7);
});

test('multiply multiplies its operands', () => {
  assert.equal(multiply(6, 7), 42);
  assert.equal(multiply(-3, 2), -6);
});

test('divide divides its operands', () => {
  assert.equal(divide(9, 3), 3);
  assert.equal(divide(1, 8), 0.125);
});

test('divide rejects a zero divisor', () => {
  assert.throws(() => divide(1, 0), RangeError);
});

test('modulo returns the remainder', () => {
  assert.equal(modulo(10, 3), 1);
  assert.equal(modulo(-7, 4), -3);
  assert.equal(modulo(9, 3), 0);
});

test('modulo rejects a zero divisor', () => {
  assert.throws(() => modulo(1, 0), RangeError);
});

test('operations throw TypeError for non-numeric input', () => {
  for (const operation of [add, subtract, multiply, divide, modulo]) {
    assert.throws(() => operation('2', 3), TypeError);
    assert.throws(() => operation(2, null), TypeError);
    assert.throws(() => operation(undefined, undefined), TypeError);
  }
});

test('operations throw TypeError for NaN and Infinity', () => {
  assert.throws(() => add(Number.NaN, 1), TypeError);
  assert.throws(() => multiply(1, Number.POSITIVE_INFINITY), TypeError);
});

test('run performs the operation named in its arguments', () => {
  assert.equal(run(['add', '2', '3']), 5);
  assert.equal(run(['divide', '9', '-3']), -3);
  assert.equal(run(['modulo', '10', '3']), 1);
});

test('run rejects an unknown operation', () => {
  assert.throws(() => run(['power', '4', '2']), TypeError);
  assert.throws(() => run([]), TypeError);
});

test('run requires exactly two operands', () => {
  assert.throws(() => run(['add', '1']), TypeError);
  assert.throws(() => run(['add', '1', '2', '3']), TypeError);
});

test('run rejects operands that are not numbers', () => {
  assert.throws(() => run(['add', 'two', '3']), TypeError);
});

test('run rejects blank operands instead of coercing them to zero', () => {
  assert.throws(() => run(['add', '', '3']), TypeError);
  assert.throws(() => run(['add', '2', '   ']), TypeError);
  assert.throws(() => run(['add', '', '']), TypeError);
});
