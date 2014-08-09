(function(){
    var $ripple = require("./animate-rippler.js");
    var $raf = require("../lib/raf.js");
   
    function MaterialEffects($ripple, $raf){
       
      return {
        inkRipple: animateInkRipple
      };

      /**
       * Use the canvas animator to render the ripple effect(s).
       */
      function animateInkRipple (canvas, options) {
          return new $ripple(canvas, options);
      }
      
    };

    function MaterialRippleDirective(){
        return {
            compile: compileWithCanvas
        };
  /**
   * Use Javascript and Canvas to render ripple effects
   *
   * Note: attribute start="" has two (2) options: `center` || `pointer`; which
   * defines the start of the ripple center.
   *
   * @param element
   * @returns {Function}
   */
  function compileWithCanvas( element, attrs ) {
    var RIGHT_BUTTON = 2;
    var options  = calculateOptions(element, attrs);
    var tag =
      '<canvas ' +
        'class="material-ink-ripple {{classList}}"' +
        'style="top:{{top}}; left:{{left}}" >' +
      '</canvas>';

    element.replaceWith(
      angular.element( $interpolate(tag)(options) )
    );

    return function linkCanvas( scope, element ){

      var ripple, watchMouse,
          parent = element.parent(),
          makeRipple = $throttle({
            start : function() {
              ripple = ripple || MaterialEffects.inkRipple( element[0], options );
              watchMouse = watchMouse || buildMouseWatcher(parent, makeRipple);

              // Ripples start with left mouseDowns (or taps)
              parent.on('mousedown', makeRipple);
            },
            throttle : function(e, done) {
              if ( effectAllowed() )
              {
                switch(e.type)
                {
                  case 'mousedown' :
                    // If not right- or ctrl-click...
                    if (!e.ctrlKey && (e.button !== RIGHT_BUTTON))
                    {
                      watchMouse(true);
                      ripple.createAt( options.forceToCenter ? null : localToCanvas(e) );
                    }
                    break;

                  default:
                    watchMouse(false);

                    // Draw of each wave/ripple in the ink only occurs
                    // on mouseup/mouseleave

                    ripple.draw( done );
                    break;
                }
              } else {
                done();
              }
            },
            end : function() {
              watchMouse(false);
            }
          })();

          
        
    };

});
