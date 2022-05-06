const lowerCase = 'abcdefghjiklnmopqrstuvwxyz';

export function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

export function generateCallId() {
    let randomId = '';

    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 3; j++) {
            randomId += lowerCase.charAt(Math.floor(Math.random() * lowerCase.length));
        }
        randomId += '-';
    }

    return randomId.substring(0, 7);
}