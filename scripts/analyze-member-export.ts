import * as fs from 'fs';
import * as path from 'path';

const csvPath = '/Users/jimmyfuentes/Desktop/export_plus_active_20260206_123817.csv';

// Simple CSV parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n');
  const header = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};
      header.forEach((h, idx) => row[h] = values[idx] || '');
      rows.push(row);
    }
  }
  return rows;
}

const csv = fs.readFileSync(csvPath, 'utf-8');
const members = parseCSV(csv);
console.log('Total members:', members.length);

// Get date distribution
const dates = members.map(m => m['Approved At']).filter(d => d);
const parsed = dates.map(d => new Date(d)).filter(d => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
console.log('Earliest join date:', parsed[0]?.toISOString().split('T')[0]);
console.log('Latest join date:', parsed[parsed.length - 1]?.toISOString().split('T')[0]);

// Count by month
const byMonth: Record<string, number> = {};
parsed.forEach(d => {
  const month = d.toISOString().slice(0, 7);
  byMonth[month] = (byMonth[month] || 0) + 1;
});
console.log('\nJoins by month:');
Object.entries(byMonth).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`));

// Attribution sources
const sources: Record<string, number> = {};
members.forEach(m => {
  const src = m['Attribution Source'] || m['Attribution'] || 'unknown';
  sources[src] = (sources[src] || 0) + 1;
});
console.log('\nAttribution Sources:');
Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

// ACE Scores
const ace: Record<string, number> = {};
members.forEach(m => {
  const score = m['ACE Score'] || 'none';
  ace[score] = (ace[score] || 0) + 1;
});
console.log('\nACE Score Distribution:');
Object.entries(ace).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

// Levels
const levels: Record<string, number> = {};
members.forEach(m => {
  const lvl = m['Level'] || 'unknown';
  levels[lvl] = (levels[lvl] || 0) + 1;
});
console.log('\nLevel Distribution:');
Object.entries(levels).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).forEach(([k, v]) => console.log(`  Level ${k}: ${v}`));

// Points stats
const points = members.map(m => parseInt(m['Points']) || 0);
console.log('\nPoints Statistics:');
console.log(`  Min: ${Math.min(...points)}`);
console.log(`  Max: ${Math.max(...points)}`);
console.log(`  Avg: ${Math.round(points.reduce((a, b) => a + b, 0) / points.length)}`);

// Roles
const roles: Record<string, number> = {};
members.forEach(m => {
  const role = m['Role'] || 'unknown';
  roles[role] = (roles[role] || 0) + 1;
});
console.log('\nRole Distribution:');
Object.entries(roles).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
