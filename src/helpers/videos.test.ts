import { parseRelativeTime } from './videos';

describe('parseRelativeTime', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-01-15T12:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should handle zero logic and empty inputs correctly', () => {
    const anchor = new Date('2023-01-15T12:00:00.000Z');

    expect(parseRelativeTime('')).toEqual(anchor);
    expect(parseRelativeTime('   ')).toEqual(anchor);
    expect(parseRelativeTime('0 seconds ago')).toEqual(anchor);
    expect(parseRelativeTime('0 days')).toEqual(anchor);
    expect(parseRelativeTime('0 weeks')).toEqual(anchor);
    expect(parseRelativeTime('0 months')).toEqual(anchor);
    expect(parseRelativeTime('0 years')).toEqual(anchor);
  });

  it('should handle keyword mappings', () => {
    const anchor = new Date('2023-01-15T12:00:00.000Z');

    expect(parseRelativeTime('today')).toEqual(anchor);
    expect(parseRelativeTime('just now')).toEqual(anchor);
    expect(parseRelativeTime('now')).toEqual(anchor);

    const yesterday = new Date(anchor);
    yesterday.setDate(yesterday.getDate() - 1);
    expect(parseRelativeTime('yesterday')).toEqual(yesterday);
  });

  it('should handle seconds', () => {
    const expected = new Date('2023-01-15T12:00:00.000Z');
    expected.setSeconds(expected.getSeconds() - 30);

    expect(parseRelativeTime('30 seconds ago')).toEqual(expected);
    expect(parseRelativeTime('30 sec')).toEqual(expected);
    expect(parseRelativeTime('30 secs')).toEqual(expected);
    expect(parseRelativeTime('30 s')).toEqual(expected);
  });

  it('should handle minutes', () => {
    const expected = new Date('2023-01-15T12:00:00.000Z');
    expected.setMinutes(expected.getMinutes() - 15);

    expect(parseRelativeTime('15 minutes ago')).toEqual(expected);
    expect(parseRelativeTime('15 min')).toEqual(expected);
    expect(parseRelativeTime('15 mins')).toEqual(expected);
    expect(parseRelativeTime('15 m')).toEqual(expected);
  });

  it('should handle hours', () => {
    const expected = new Date('2023-01-15T12:00:00.000Z');
    expected.setHours(expected.getHours() - 5);

    expect(parseRelativeTime('5 hours ago')).toEqual(expected);
    expect(parseRelativeTime('5 hr')).toEqual(expected);
    expect(parseRelativeTime('5 hrs')).toEqual(expected);
    expect(parseRelativeTime('5 h')).toEqual(expected);
  });

  it('should handle days', () => {
    const expected = new Date('2023-01-15T12:00:00.000Z');
    expected.setDate(expected.getDate() - 3);

    expect(parseRelativeTime('3 days ago')).toEqual(expected);
    expect(parseRelativeTime('3 day')).toEqual(expected);
  });

  it('should handle weeks', () => {
    const expected = new Date('2023-01-15T12:00:00.000Z');
    expected.setDate(expected.getDate() - 14);

    expect(parseRelativeTime('2 weeks ago')).toEqual(expected);
    expect(parseRelativeTime('2 week')).toEqual(expected);
  });

  it('should handle months', () => {
    const expected = new Date('2023-01-15T12:00:00.000Z');
    expected.setMonth(expected.getMonth() - 2);

    expect(parseRelativeTime('2 months ago')).toEqual(expected);
    expect(parseRelativeTime('2 month')).toEqual(expected);
  });

  it('should handle years', () => {
    const expected = new Date('2023-01-15T12:00:00.000Z');
    expected.setFullYear(expected.getFullYear() - 1);

    expect(parseRelativeTime('1 year ago')).toEqual(expected);
    expect(parseRelativeTime('1 years')).toEqual(expected);
  });

  it('should handle unknown formats', () => {
    const anchor = new Date('2023-01-15T12:00:00.000Z');

    expect(parseRelativeTime('xyz')).toEqual(anchor);
    expect(parseRelativeTime('5 blablas')).toEqual(anchor);
  });
});
