const prefabs = document.querySelectorAll('.prefab');
export const prefab = document.querySelector('#prefab');
for (const p of prefabs) {
    p.remove();
    console.log(p.childNodes)
    for (const child of p.childNodes) {
        prefab.appendChild(child.cloneNode(true));
    }
}
prefab.remove();