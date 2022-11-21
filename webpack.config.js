import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import TerserPlugin from 'terser-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEBUG = process.env.DEBUG?.toLowerCase() === 'true';
const MINJS = process.env.MINJS?.toLowerCase() === 'true';

export default {
    devtool: DEBUG ? 'source-map' : false,
    entry: {
        base: './src/js/base.js',
        index: './src/js/index.js',
        meeting: './src/js/meeting.js',
        classroom: './src/js/classroom.js',
    },
    output: {
        path: path.join(__dirname, 'public/js'),
        filename: '[name].js'
    },
    optimization: {
        nodeEnv: DEBUG ? 'development' : 'production',
        minimize: MINJS,
        minimizer: [new TerserPlugin()],
    },
    mode: DEBUG ? 'development' : 'production',
}