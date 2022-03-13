import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    entry: {
        index: './src/js/index.js',
        login: './src/js/login.js',
        meeting: './src/js/meeting.js',
    },
    output: {
        path: path.join(__dirname, 'public/js'),
        filename: '[name].js'
    },
    mode: 'development'
}