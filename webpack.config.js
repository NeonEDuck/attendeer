import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import TerserPlugin from 'terser-webpack-plugin';
import CompressionPlugin from 'compression-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEBUG = process.env.DEBUG?.toLowerCase() === 'true';
const MINJS = process.env.MINJS?.toLowerCase() === 'true';

export default {
    devtool: DEBUG ? 'source-map' : false,
    entry: {
        index: './src/js/index.js',
        meeting: './src/js/meeting.js',
        overview: './src/js/overview.js',
        login: './src/js/login.js',
    },
    output: {
        path: path.join(__dirname, 'public/js'),
        filename: '[name].js'
    },
    optimization: {
        nodeEnv: DEBUG ? 'development' : 'production',
        minimize: MINJS,
        minimizer: [new TerserPlugin({
            // include: /\.min\.js$/
        })],
    },
    plugins: [new CompressionPlugin()],
    mode: DEBUG ? 'development' : 'production',
}