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
    expect((chart as any).formatDuration(68787)).to.equal('19h 6m');
    expect((chart as any).formatDuration(958000)).to.equal('11d 2h');
    expect((chart as any).formatDuration(0)).to.equal('0s');
    expect((chart as any).formatDuration(60)).to.equal('1m');
    expect((chart as any).formatDuration(3600)).to.equal('1h');
    expect((chart as any).formatDuration(3661)).to.equal('1h 1m');
    expect((chart as any).formatDuration(90061)).to.equal('1d 1h');
  });

  it('enables duration formatting when durationFormat is true', async () => {
    const chart: TembaChart = await getChart();

    // Initially durationFormat should be false
    expect(chart.durationFormat).to.be.false;

    // Set durationFormat to true
    chart.durationFormat = true;
    expect(chart.durationFormat).to.be.true;
  });
});
