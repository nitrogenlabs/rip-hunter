#!/usr/bin/env node

/**
 * Performance benchmark for rip-hunter
 */

// Mock fetch for benchmarking
global.fetch = () => Promise.resolve({
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(''),
  headers: new Headers()
});

import { queryString, removeSpaces, toGql } from './src/index.js';

console.log('🚀 rip-hunter Performance Benchmark\n');

// Benchmark toGql function
console.log('📊 toGql Performance Test:');
const testObject = {
  name: 'Rip Hunter',
  age: 42,
  skills: ['time travel', 'combat'],
  metadata: {
    universe: 'DC',
    team: 'Legion of Super-Heroes'
  },
  nullValue: null,
  undefinedValue: undefined
};

const iterations = 100000;
const startTime = performance.now();

for (let i = 0; i < iterations; i++) {
  toGql(testObject);
}

const endTime = performance.now();
const duration = endTime - startTime;
const opsPerSecond = Math.round(iterations / (duration / 1000));

console.log(`  ✅ ${iterations.toLocaleString()} iterations in ${duration.toFixed(2)}ms`);
console.log(`  📈 ${opsPerSecond.toLocaleString()} operations/second\n`);

// Benchmark queryString function
console.log('📊 queryString Performance Test:');
const testParams = {
  userId: 123,
  name: 'Rip Hunter',
  skills: ['time travel', 'combat'],
  metadata: { universe: 'DC' }
};

const startTime2 = performance.now();

for (let i = 0; i < iterations; i++) {
  queryString(testParams);
}

const endTime2 = performance.now();
const duration2 = endTime2 - startTime2;
const opsPerSecond2 = Math.round(iterations / (duration2 / 1000));

console.log(`  ✅ ${iterations.toLocaleString()} iterations in ${duration2.toFixed(2)}ms`);
console.log(`  📈 ${opsPerSecond2.toLocaleString()} operations/second\n`);

// Benchmark removeSpaces function
console.log('📊 removeSpaces Performance Test:');
const testString = 'query { user { id name email } }';

const startTime3 = performance.now();

for (let i = 0; i < iterations; i++) {
  removeSpaces(testString);
}

const endTime3 = performance.now();
const duration3 = endTime3 - startTime3;
const opsPerSecond3 = Math.round(iterations / (duration3 / 1000));

console.log(`  ✅ ${iterations.toLocaleString()} iterations in ${duration3.toFixed(2)}ms`);
console.log(`  📈 ${opsPerSecond3.toLocaleString()} operations/second\n`);

console.log('🎉 Benchmark completed!');