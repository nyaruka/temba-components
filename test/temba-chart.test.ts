import { expect } from '@open-wc/testing';
import { RapidChartData, TembaChart } from '../src/chart/TembaChart';
import { getComponent } from './utils.test';

const sampleData: RapidChartData = {
  labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
  datasets: [
    {
      label: 'General',
      data: [65, 59, 80, 81, 56, 55, 40]
    },
    {
      label: 'Support',
      data: [28, 48, 40, 19, 86, 27, 90]
    },
    {
      label: 'VIPs',
      data: [58, 28, 10, 1, 0, 19, 20]
    }
  ]
};

const TAG = 'temba-chart';
const getChart = async (attrs: any = {}) => {
  const picker = (await getComponent(TAG, attrs, '', 400)) as TembaChart;
  return picker;
};

describe('temba-chart', () => {
  it('calculates others', async () => {
    const chart: TembaChart = await getChart();

    chart.data = sampleData;
    await chart.updateComplete;

    // if we haven't set any splits, everything should be summed as "All"
    expect(chart.datasets[0].data).to.deep.equal([
      151, 135, 130, 101, 142, 101, 150
    ]);

    // add a split
    chart.splits = ['General'];
    await chart.updateComplete;

    // now we should get an "Others" dataset
    expect(chart.datasets[1].data).to.deep.equal([86, 76, 50, 20, 86, 46, 110]);

    // add another split
    chart.splits = ['General', 'Support'];
    await chart.updateComplete;

    // now others should be everything but general and support
    expect(chart.datasets[2].data).to.deep.equal([58, 28, 10, 1, 0, 19, 20]);
  });

  it('formats durations correctly', async () => {
    const chart: TembaChart = await getChart();

    // Test the formatDuration method directly
    expect(chart.formatDuration(68787)).to.equal('19h 6m');
    expect(chart.formatDuration(958000)).to.equal('11d 2h');
    expect(chart.formatDuration(0)).to.equal('0s');
    expect(chart.formatDuration(60)).to.equal('1m');
    expect(chart.formatDuration(3600)).to.equal('1h');
    expect(chart.formatDuration(3661)).to.equal('1h 1m');
    expect(chart.formatDuration(90061)).to.equal('1d 1h');
  });

  it('enables duration formatting when durationFormat is true', async () => {
    const chart: TembaChart = await getChart();

    // Initially durationFormat should be false
    expect(chart.durationFormat).to.be.false;

    // Set durationFormat to true
    chart.durationFormat = true;
    expect(chart.durationFormat).to.be.true;
  });

  it('formats duration edge cases correctly', async () => {
    const chart: TembaChart = await getChart();

    // Test edge cases for duration formatting
    expect(chart.formatDuration(1)).to.equal('1s');
    expect(chart.formatDuration(59)).to.equal('59s');
    expect(chart.formatDuration(61)).to.equal('1m 1s');
    expect(chart.formatDuration(3661)).to.equal('1h 1m');
    expect(chart.formatDuration(86461)).to.equal('1d 1m');
    
    // Test larger durations with years and months
    expect(chart.formatDuration(31536000)).to.equal('1y'); // 1 year
    expect(chart.formatDuration(2592000)).to.equal('1mo'); // 1 month
    expect(chart.formatDuration(31622400)).to.equal('1y 1d'); // 1 year + 1 day
    expect(chart.formatDuration(34128061)).to.equal('1y 1mo'); // 1 year + 1 month + small extra
  });

  it('recreates chart when durationFormat changes', async () => {
    const chart: TembaChart = await getChart();
    chart.data = sampleData;
    await chart.updateComplete;
    
    // Initially no chart should exist
    expect(chart.chart).to.be.undefined;
    
    // Trigger chart creation
    chart.calculateSplits();
    chart.updateChart();
    
    // Now chart should exist
    expect(chart.chart).to.not.be.undefined;
    const originalChart = chart.chart;
    
    // Change durationFormat - this should destroy and recreate the chart
    chart.durationFormat = true;
    await chart.updateComplete;
    
    // Chart should be recreated (different instance)
    expect(chart.chart).to.not.equal(originalChart);
  });

  it('configures chart options correctly with duration formatting', async () => {
    const chart: TembaChart = await getChart();
    chart.data = sampleData;
    chart.durationFormat = true;
    await chart.updateComplete;
    
    // Ensure datasets are calculated
    chart.calculateSplits();
    chart.updateChart();
    
    // Check that chart exists and has expected configuration
    expect(chart.chart).to.not.be.undefined;
    expect(chart.chart.options).to.not.be.undefined;
    
    // Check that y-axis has tick callback for duration formatting
    expect(chart.chart.options.scales?.y?.ticks?.callback).to.be.a('function');
    
    // Check that tooltip has custom callback for duration formatting
    expect(chart.chart.options.plugins?.tooltip?.callbacks?.label).to.be.a('function');
  });

  it('handles chart update when duration formatting is enabled', async () => {
    const chart: TembaChart = await getChart();
    chart.data = sampleData;
    chart.durationFormat = true;
    await chart.updateComplete;
    
    // Test the updateChart method with duration formatting enabled
    chart.calculateSplits();
    expect(chart.datasets.length).to.be.greaterThan(0);
    
    // Call updateChart and verify it doesn't throw
    chart.updateChart();
    expect(chart.chart).to.not.be.undefined;
    
    // Test updating existing chart
    const originalChart = chart.chart;
    chart.data = {
      labels: ['Aug', 'Sep'],
      datasets: [
        { label: 'New Data', data: [100, 200] }
      ]
    };
    chart.calculateSplits();
    chart.updateChart();
    
    // Chart should be the same instance but updated
    expect(chart.chart).to.equal(originalChart);
  });

  it('handles calculateSplits with duration formatting', async () => {
    const chart: TembaChart = await getChart();
    chart.durationFormat = true;
    chart.data = sampleData;
    await chart.updateComplete;
    
    // Test calculateSplits method
    chart.calculateSplits();
    
    // Should have datasets calculated
    expect(chart.datasets).to.not.be.undefined;
    expect(chart.datasets.length).to.be.greaterThan(0);
    
    // First dataset should be "All Counts" since no splits are defined
    expect(chart.datasets[0].label).to.equal('All Counts');
    expect(chart.datasets[0].data).to.deep.equal([151, 135, 130, 101, 142, 101, 150]);
  });

  it('preserves existing functionality when durationFormat is false', async () => {
    const chart: TembaChart = await getChart();
    chart.data = sampleData;
    chart.durationFormat = false; // Explicitly set to false
    await chart.updateComplete;
    
    chart.calculateSplits();
    chart.updateChart();
    
    // Chart should exist but without duration formatting options
    expect(chart.chart).to.not.be.undefined;
    
    // Y-axis should not have duration formatting callback
    const yAxisOptions = chart.chart.options.scales?.y;
    expect(yAxisOptions?.ticks?.callback).to.be.undefined;
    
    // Tooltip should not have custom duration formatting
    const tooltipOptions = chart.chart.options.plugins?.tooltip;
    expect(tooltipOptions?.callbacks?.label).to.be.undefined;
  });

  it('handles empty or invalid data gracefully', async () => {
    const chart: TembaChart = await getChart();
    chart.durationFormat = true;
    
    // Test with empty data
    chart.data = { labels: [], datasets: [] };
    chart.calculateSplits();
    expect(chart.datasets).to.deep.equal([]);
    
    // updateChart should handle empty datasets gracefully
    chart.updateChart();
    
    // Test with null data
    chart.data = null as any;
    chart.calculateSplits();
    
    // Should not throw and datasets should remain empty
    expect(chart.datasets).to.deep.equal([]);
  });

  it('handles splits configuration with duration formatting', async () => {
    const chart: TembaChart = await getChart();
    chart.data = sampleData;
    chart.durationFormat = true;
    chart.splits = ['General', 'Support'];
    await chart.updateComplete;
    
    // Should have 3 datasets: General, Support, and Other
    expect(chart.datasets.length).to.equal(3);
    expect(chart.datasets[0].label).to.equal('General');
    expect(chart.datasets[1].label).to.equal('Support');
    expect(chart.datasets[2].label).to.equal('Other');
  });

  it('updates chart data when splits change with duration formatting', async () => {
    const chart: TembaChart = await getChart();
    chart.data = sampleData;
    chart.durationFormat = true;
    await chart.updateComplete;
    
    // Initially no splits
    chart.calculateSplits();
    chart.updateChart();
    expect(chart.datasets.length).to.equal(1);
    expect(chart.datasets[0].label).to.equal('All Counts');
    
    // Add splits
    chart.splits = ['General'];
    chart.calculateSplits();
    expect(chart.datasets.length).to.equal(2);
    expect(chart.datasets[0].label).to.equal('General');
    expect(chart.datasets[1].label).to.equal('Other');
  });

  it('handles duration formatting with various numeric inputs', async () => {
    const chart: TembaChart = await getChart();
    
    // Test with decimal seconds (should be floored)
    expect(chart.formatDuration(61.7)).to.equal('1m 1s');
    expect(chart.formatDuration(3661.9)).to.equal('1h 1m');
    
    // Test with very large values
    expect(chart.formatDuration(99999999)).to.equal('3y 2mo');
  });

  it('maintains chart configuration when switching duration format', async () => {
    const chart: TembaChart = await getChart();
    chart.data = sampleData;
    await chart.updateComplete;
    
    // Start without duration formatting
    chart.durationFormat = false;
    chart.calculateSplits();
    chart.updateChart();
    const firstChart = chart.chart;
    
    // Switch to duration formatting
    chart.durationFormat = true;
    await chart.updateComplete;
    
    // Chart should be recreated
    expect(chart.chart).to.not.equal(firstChart);
    expect(chart.chart).to.not.be.undefined;
    
    // Data should be preserved
    expect(chart.chart.data.labels).to.deep.equal(sampleData.labels);
    expect(chart.chart.data.datasets.length).to.be.greaterThan(0);
  });

  it('updateChart when chart already exists', async () => {
    const chart: TembaChart = await getChart();
    chart.data = sampleData;
    chart.durationFormat = true;
    await chart.updateComplete;
    
    // Create initial chart
    chart.calculateSplits();
    chart.updateChart();
    const originalChart = chart.chart;
    
    // Update with new data (should update existing chart, not recreate)
    chart.data = {
      labels: ['New1', 'New2'],
      datasets: [{ label: 'NewData', data: [10, 20] }]
    };
    chart.calculateSplits();
    chart.updateChart();
    
    // Should be same chart instance but with updated data
    expect(chart.chart).to.equal(originalChart);
    expect(chart.chart.data.labels).to.deep.equal(['New1', 'New2']);
  });

  it('configures tooltip and y-axis callbacks correctly', async () => {
    const chart: TembaChart = await getChart();
    chart.data = sampleData;
    chart.durationFormat = true;
    await chart.updateComplete;
    
    chart.calculateSplits();
    chart.updateChart();
    
    // Test y-axis tick callback
    const yAxisCallback = chart.chart.options.scales?.y?.ticks?.callback;
    expect(yAxisCallback).to.be.a('function');
    
    if (yAxisCallback) {
      expect(yAxisCallback(3661)).to.equal('1h 1m');
      expect(yAxisCallback(60)).to.equal('1m');
    }
    
    // Test tooltip label callback
    const tooltipCallback = chart.chart.options.plugins?.tooltip?.callbacks?.label;
    expect(tooltipCallback).to.be.a('function');
    
    if (tooltipCallback) {
      const mockContext = {
        dataset: { label: 'Test Dataset' },
        parsed: { y: 3661 }
      };
      expect(tooltipCallback(mockContext)).to.equal('Test Dataset: 1h 1m');
    }
  });

  it('handles formatDuration with zero and negative edge cases', async () => {
    const chart: TembaChart = await getChart();
    
    // Test zero and negative values
    expect(chart.formatDuration(0)).to.equal('0s');
    expect(chart.formatDuration(-1)).to.equal('0s');
    expect(chart.formatDuration(-100)).to.equal('0s');
    
    // Test decimal values (should be floored)
    expect(chart.formatDuration(1.9)).to.equal('1s');
    expect(chart.formatDuration(61.7)).to.equal('1m 1s');
  });
});
