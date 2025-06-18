const loggerFactory = (verbose: boolean) => ({
	debug: (message: string) => {
		if (verbose) {
			console.debug(message);
		}
	},
	info: (message: string) => {
		console.info(message);
	},
	error: (message: string) => {
		console.error(message);
	},
	warn: (message: string) => {
		console.warn(message);
	},
});

export { loggerFactory };
