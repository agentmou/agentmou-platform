import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClinicCostOfInaction } from './clinic-cost-of-inaction';

describe('ClinicCostOfInaction', () => {
  it('renders the benchmark metrics without exposing editorial notes', () => {
    const html = renderToStaticMarkup(<ClinicCostOfInaction />);

    expect(html).toContain('23%');
    expect(html).toContain('15%');
    expect(html).toContain('EUR400+');
    expect(html).not.toContain('Benchmark comercial editable');
    expect(html).not.toContain('Referencia editorial');
    expect(html).not.toContain('mantener configurable');
  });
});
