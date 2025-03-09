// config-overrides.js
module.exports = function override(config, env) {
    // Add options.js entry point
    config.entry = {
        main: './src/index.js',
        options: './src/options-index.js',
    };

    // Configure output filenames
    config.output.filename = 'static/js/[name].js';

    // Disable chunk splitting
    config.optimization.splitChunks = {
        cacheGroups: {
            default: false,
        },
    };
    config.optimization.runtimeChunk = false;

    return config;
};