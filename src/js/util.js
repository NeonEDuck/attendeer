export const LOWER_CASE = 'abcdefghjiklnmopqrstuvwxyz';
export const MINUTE = 60 * 1000;

export function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

export function getRandom(x){
    return Math.floor(Math.random() * x);
};

export function randomLowerCaseString(length) {
    let randomString = '';
    for (let i = 0; i < length; i++) {
        randomString += LOWER_CASE.charAt(getRandom(LOWER_CASE.length));
    }
    return randomString;
}

export function generateCallId() {
    return randomLowerCaseString(3) + '-' + randomLowerCaseString(3);
}

export function replaceAll(str, find, replace) {
    return str.replace(find, replace);
}

export function setIntervalImmediately(callback, ms) {
    callback();
    return setInterval(callback, ms);
}