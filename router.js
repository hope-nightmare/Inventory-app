"use strict";

var route = { screen:'home' };
var stack = [];

function nav(r){
  stack.push(route);
  route = r;
  // Используем хеши — WebView воспринимает их как системную историю, и жест "Назад" начинает работать
  window.location.hash = 'step' + stack.length;
  render();
  window.scrollTo(0,0);
}

function back(){
  if(stack.length){
    history.back(); // Вызовет hashchange
  }
}

window.addEventListener('hashchange', function(){
  var expected = stack.length ? '#step' + stack.length : '';
  if(window.location.hash !== expected && stack.length > 0){
    route = stack.pop();
    render();
    window.scrollTo(0,0);
  }
});
