export const LOWER_CASE = 'abcdefghjiklnmopqrstuvwxyz';
export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const AlertTypeEnum = {
    'Click': 1,
    'MultipleChoice': 2,
    'EssayQuestion': 3,
    'Vote': 4,
}

export function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}
export function approximatelyEqual(a, b, error) {
    return Math.abs(a - b) < error;
}

export function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

export function getRandom(x){
    return Math.floor(Math.random() * x);
};

export function replaceAll(str, find, replace) {
    return str.replace(find, replace);
}

export function dateToMinutes(date) {
    return date.getHours() * 60 + date.getMinutes();
}

export function numberArrayToUUIDString(arr) {
    if (!arr) {
        return null;
    }
    return arr.map(x => x.toString(16)).join('')
}

export function htmlToElement(html) {
    let template = document.createElement('template');
    template.innerHTML = html;
    return template.content.firstElementChild;
}

const fetchedData = {}

export async function fetchData(path) {
    if (path in fetchedData) {
        return new Promise((res, rej) => {
            return fetchedData[path];
        });
    }
    const response = await fetch(path, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
    })

    return response.json();
}

export async function apiCall(route, data) {
    return fetch(`/api/${route}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data || {})
    });
}

export function setIntervalImmediately(callback, ms) {
    const interval = setInterval(callback, ms);
    callback(interval);
    return interval;
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

const userDict = {};

export async function getUserData(userId) {
    if (!userDict[userId]) {
        const response = await apiCall('getUserInfo', {userId});
        if (response.status === 200) {
            const user = await response.json();
            if (user) {
                userDict[userId] = user;
            }
        }
    }

    return userDict[userId] || {};
}