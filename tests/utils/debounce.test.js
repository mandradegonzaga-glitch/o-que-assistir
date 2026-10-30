import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { debounce } from '../../src/utils/debounce.js';

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('function is not called immediately', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);
    debounced();
    expect(fn).not.toHaveBeenCalled();
  });

  it('function is called once after wait ms', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);
    debounced();
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('multiple rapid calls result in only one invocation', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);
    debounced();
    debounced();
    debounced();
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('each call resets the timer', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);
    debounced();
    jest.advanceTimersByTime(50);
    debounced();
    jest.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes arguments to the original function', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);
    debounced('hello', 42);
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('hello', 42);
  });
});
