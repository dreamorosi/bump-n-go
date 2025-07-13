import { afterEach, expect, it, vi } from 'vitest';
import { configureLogger, logger } from '../src/logger.js';

afterEach(() => {
	vi.clearAllMocks();
	// Reset logger to non-verbose mode after each test
	configureLogger(false);
});

it('has debug, info, error, and warn methods', () => {
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

it('logs debug messages when verbose is configured', () => {
	// Prepare
	configureLogger(true);

	// Act
	logger.debug('debug message');

	// Assess
	expect(console.debug).toHaveBeenCalledWith('debug message');
});

it('does not log debug messages when verbose is not configured', () => {
	// Prepare
	configureLogger(false);

	// Act
	logger.debug('debug message');

	// Assess
	expect(console.debug).not.toHaveBeenCalled();
});

it('always logs info messages regardless of verbose setting', () => {
	// Prepare & Act
	configureLogger(true);
	logger.info('verbose info');

	configureLogger(false);
	logger.info('quiet info');

	// Assess
	expect(console.info).toHaveBeenCalledWith('verbose info');
	expect(console.info).toHaveBeenCalledWith('quiet info');
	expect(console.info).toHaveBeenCalledTimes(2);
});

it('always logs error messages using console.error', () => {
	// Act
	logger.error('error message');

	// Assess
	expect(console.error).toHaveBeenCalledWith('error message');
});

it('always logs warn messages using console.warn', () => {
	// Act
	logger.warn('warning message');

	// Assess
	expect(console.warn).toHaveBeenCalledWith('warning message');
});

it('handles multiple debug calls with verbose configured', () => {
	// Prepare
	configureLogger(true);

	// Act
	logger.debug('first debug');
	logger.debug('second debug');

	// Assess
	expect(console.debug).toHaveBeenCalledWith('first debug');
	expect(console.debug).toHaveBeenCalledWith('second debug');
	expect(console.debug).toHaveBeenCalledTimes(2);
});

it('handles multiple debug calls without verbose configured', () => {
	// Prepare
	configureLogger(false);

	// Act
	logger.debug('first debug');
	logger.debug('second debug');

	// Assess
	expect(console.debug).not.toHaveBeenCalled();
});

it('handles mixed log levels correctly', () => {
	// Prepare
	configureLogger(true);

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

it('can reconfigure verbosity during runtime', () => {
	// Prepare
	configureLogger(false);
	logger.debug('should not log');

	// Act
	configureLogger(true);
	logger.debug('should log');

	// Assess
	expect(console.debug).toHaveBeenCalledTimes(1);
	expect(console.debug).toHaveBeenCalledWith('should log');
});
