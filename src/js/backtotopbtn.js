const backToButton = document.querySelector("#back-to-top-tab");

window.addEventListener("scroll", scrollFunction);

function scrollFunction(){
    console.log(window.scrollY)
    if (window.scrollY > 100){
        if(!backToButton.classList.contains("btnEntrance")){
            backToButton.classList.remove("btnExit");
            backToButton.classList.add("btnEntrance");
            backToButton.style.display = "block"
        }
    }
    else{
        if(backToButton.classList.contains("btnEntrance")){
            backToButton.classList.remove("btnEntrance");
            backToButton.classList.add("btnExit");
            setTimeout(function() {
                backToButton.style.display = "none";
            }, 250);
        }
    }
}

backToButton.addEventListener("click", backToTop);

function backToTop(){
    window.scroll(0, 0);

}