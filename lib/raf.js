// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
(function() {

    var lastTime = 0,
        frame = window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                function(callback){

                //  make a timeStamp to callback,otherwise the arguments(now) will be undefined in ios4,5
                var currTime = new Date().getTime(),
                    timeToCall = Math.max(0, 16 - (currTime - lastTime)),
                    timeOutId = setTimeout(function() {
                        callback(currTime + timeToCall);
                    }, timeToCall);

                lastTime = currTime + timeToCall;
                return timeOutId;
    };

    window.requestAnimationFrame = window.requestAnimationFrame || frame;

    window.cancelAnimationFrame = window.cancelAnimationFrame || 
                                  function(id) {
                                      clearTimeout(id);
                                  };

}());
