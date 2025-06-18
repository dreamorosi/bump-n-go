import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { loggerFactory } from '../src/logger.js';

afterEach(() => {
	vi.clearAllMocks();
});

it('returns logger with debug, info, error, and warn methods', () => {
	// Act
	const logger = loggerFactory(false);

	// Assess
	expect(logger).toHaveProperty('debug');
	expect(logger).toHaveProperty('info');
	expect(logger).toHaveProperty('error');
	expect(logger).toHaveProperty('warn');
	expect(typeof logger.debug).toBe('function');
	expect(typeof logger.info).toBe('function');
	expect(typeof logger.error).toBe('function');
	expect(typeof logger.warn).toBe('function');
});

it('logs debug messages when verbose is true', () => {
	// Prepare
	const logger = loggerFactory(true);

	// Act
	logger.debug('debug message');

	// Assess
	expect(console.debug).toHaveBeenCalledWith('debug message');
});

it('does not log debug messages when verbose is false', () => {
	// Prepare
	const logger = loggerFactory(false);

	// Act
	logger.debug('debug message');

	// Assess
	expect(console.debug).not.toHaveBeenCalled();
});

it('always logs info messages regardless of verbose setting', () => {
	// Prepare
	const verboseLogger = loggerFactory(true);
	const quietLogger = loggerFactory(false);

	// Act
	verboseLogger.info('verbose info');
	quietLogger.info('quiet info');

	// Assess
	expect(console.info).toHaveBeenCalledWith('verbose info');
	expect(console.info).toHaveBeenCalledWith('quiet info');
	expect(console.info).toHaveBeenCalledTimes(2);
});

it('always logs error messages using console.error', () => {
	// Prepare
	const logger = loggerFactory(false);

	// Act
	logger.error('error message');

	// Assess
	expect(console.error).toHaveBeenCalledWith('error message');
});

it('always logs warn messages using console.warn', () => {
	// Prepare
	const logger = loggerFactory(false);

	// Act
	logger.warn('warning message');

	// Assess
	expect(console.warn).toHaveBeenCalledWith('warning message');
});

it('handles multiple debug calls with verbose true', () => {
	// Prepare
	const logger = loggerFactory(true);

	// Act
	logger.debug('first debug');
	logger.debug('second debug');

	// Assess
	expect(console.debug).toHaveBeenCalledWith('first debug');
	expect(console.debug).toHaveBeenCalledWith('second debug');
	expect(console.debug).toHaveBeenCalledTimes(2);
});

it('handles multiple debug calls with verbose false', () => {
	// Prepare
	const logger = loggerFactory(false);

	// Act
	logger.debug('first debug');
	logger.debug('second debug');

	// Assess
	expect(console.debug).not.toHaveBeenCalled();
});

it('handles mixed log levels correctly', () => {
	// Prepare
	const logger = loggerFactory(true);

	// Act
	logger.debug('debug msg');
	logger.info('info msg');
	logger.warn('warn msg');
	logger.error('error msg');

	// Assess
	expect(console.debug).toHaveBeenCalledWith('debug msg');
	expect(console.info).toHaveBeenCalledWith('info msg');
	expect(console.warn).toHaveBeenCalledWith('warn msg');
	expect(console.error).toHaveBeenCalledWith('error msg');
});
