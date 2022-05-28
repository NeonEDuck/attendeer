const lowerCase = 'abcdefghjiklnmopqrstuvwxyz';

export function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

export function randomLowerCaseString(length) {
    let randomString = '';
    for (let i = 0; i < length; i++) {
        randomString += lowerCase.charAt(Math.floor(Math.random() * lowerCase.length));
    }
    return randomString;
}

export function generateCallId() {
    return randomLowerCaseString(3) + '-' + randomLowerCaseString(3);
}

export function replaceAll(str, find, replace) {
    return str.replace(find, replace);
}

export function debounce(cb, delay=1000) {
    let timeout;

    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            cb(...args);
        }, delay);
    }
}