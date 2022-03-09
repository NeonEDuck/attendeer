import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    entry: {
        'navbar': './src/navbar.js',
        'index': './src/index.js',
        'meeting': './src/meeting.js',
    },
    output: {
        path: path.join(__dirname, 'public/js'),
        filename: '[name].js'
    },
    mode: 'development'
}