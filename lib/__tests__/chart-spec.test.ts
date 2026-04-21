import { describe, it, expect } from 'vitest';
import { buildChartSpecTool } from '../chart-spec';

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
