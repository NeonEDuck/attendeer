function getRandomRolor() {
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += Math.floor(Math.random() * 10);
    }
    return color;
}

document.querySelectorAll('.course-preview').forEach(e => {

    e.style.backgroundColor=getRandomRolor();
    
})

