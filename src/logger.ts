/**
 * Logger configuration state
 */
let isVerbose = false;

/**
 * Configures the global logger settings.
 *
 * @param verbose - enables debug logging when true
 */
const configureLogger = (verbose: boolean): void => {
	isVerbose = verbose;
};

/**
 * Shared logger instance for the application.
 *
 * Provides consistent logging across all modules with configurable verbosity.
 * Use {@link configureLogger | `configureLogger`} to set the verbosity level.
 */
const logger = {
	/**
	 * Logs debug messages when verbose mode is enabled.
	 *
	 * @param message - the debug message to log
	 */
	debug: (message: string): void => {
		if (isVerbose) {
			console.debug(message);
		}
	},
	/**
	 * Logs informational messages.
	 *
	 * @param message - the info message to log
	 */
	info: (message: string): void => {
		console.info(message);
	},
	/**
	 * Logs error messages.
	 *
	 * @param message - the error message to log
	 */
	error: (message: string): void => {
		console.error(message);
	},
	/**
	 * Logs warning messages.
	 *
	 * @param message - the warning message to log
	 */
	warn: (message: string): void => {
		console.warn(message);
	},
};

export { configureLogger, logger };
