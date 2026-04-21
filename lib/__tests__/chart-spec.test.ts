import { describe, it, expect } from 'vitest';
import { buildChartSpecTool, parseRowsFromChunks, ChartSpec } from '../chart-spec';

describe('buildChartSpecTool', () => {
  const columns = ['foo', 'bar', 'baz'];
  const tool = buildChartSpecTool(columns);

  it('accepts valid columns and chart type', async () => {
    const params = { x_column: 'foo', y_column: 'bar', chart_type: 'bar' };
    expect(tool.validate(params)).toEqual(params);
    const result = await tool.run(params);
    expect(result.spec).toEqual({ x: 'foo', y: 'bar', type: 'bar' });
  });

  it('rejects unknown chart type', () => {
    expect(() => tool.validate({ x_column: 'foo', y_column: 'bar', chart_type: 'unknown' } as any)).toThrow();
  });

  it('rejects x_column not in columns', () => {
    expect(() => tool.validate({ x_column: 'nope', y_column: 'bar', chart_type: 'bar' })).toThrow();
  });

  it('rejects y_column not in columns', () => {
    expect(() => tool.validate({ x_column: 'foo', y_column: 'nope', chart_type: 'bar' })).toThrow();
  });

  it('throws if columns is empty', () => {
    const emptyTool = buildChartSpecTool([]);
    expect(() => emptyTool.validate({ x_column: 'foo', y_column: 'bar', chart_type: 'bar' })).toThrow();
  });
});

describe('parseRowsFromChunks', () => {
  const columns = ['foo', 'bar', 'baz'];
  const makeChunk = (rows: Record<string, unknown>[]) => {
    const header = columns.join(',');
    const body = rows.map(r => columns.map(c => r[c] ?? '').join(',')).join('\n');
    return { text: `${header}\n${body}` };
  };

  it('parses rows from a single chunk', () => {
    const rows = [
      { foo: 1, bar: 2, baz: 3 },
      { foo: 4, bar: 5, baz: 6 },
    ];
    const parsed = parseRowsFromChunks([makeChunk(rows)]);
    expect(parsed).toEqual([
      { foo: 1, bar: 2, baz: 3 },
      { foo: 4, bar: 5, baz: 6 },
    ]);
  });

  it('parses rows from multiple chunks and caps at 200', () => {
    const rows1 = Array.from({ length: 150 }, (_, i) => ({ foo: i, bar: i + 1, baz: i + 2 }));
    const rows2 = Array.from({ length: 100 }, (_, i) => ({ foo: i + 150, bar: i + 151, baz: i + 152 }));
    const parsed = parseRowsFromChunks([makeChunk(rows1), makeChunk(rows2)]);
    expect(parsed.length).toBe(200);
    expect(parsed[0]).toEqual({ foo: 0, bar: 1, baz: 2 });
    expect(parsed[199]).toEqual({ foo: 199, bar: 200, baz: 201 });
  });

  it('returns empty array if no chunks', () => {
    expect(parseRowsFromChunks([])).toEqual([]);
  });
});

// Type test for ChartSpec
it('ChartSpec type matches schema', () => {
  const valid: ChartSpec = { x_column: 'foo', y_column: 'bar', chart_type: 'bar' };
  expect(valid).toBeDefined();
});
