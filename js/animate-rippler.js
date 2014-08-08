(function(){
    var raf = require("../lib/raf.js");
    
    function Ripple(canvas, options){
        this.canvas = canvas;
        this.waves = [];
        this.cAF = null;
    };

    Ripple.DEFAULTS = {
        onComplete:  noop,
        initialOpacity: 0.6,
        opacityDecayVelocity: 1.7,
        backgroundFill: true,
        pixelDensity:1
    };

    Ripple.prototype = {
        // when the wave start 
        createAt: function(startAt){
            var canvas = this.adjustBounds(this.canvas);
            var wave = createWave(canvas);

            var width = canvas.width / this.pixelDensity;
            var height = canvas.height / this.pixelDensity;

            // Auto center ripple if startAt is not defined...
            startAt = startAt || { x: Math.round(width / 2), y: Math.round(height / 2) };

            wave.isMouseDown = true;
            wave.mouseDownStart = now();
            wave.mouseUpStart = 0.0;
            wave.tDown = 0.0;
            wave.tUp = 0.0;
            wave.startPosition = startAt;
            wave.containerSize = Math.max(width, height);
            wave.maxRadius = distanceFromPointToFurthestCorner(wave.startPosition, {w: width, h: height}) * 0.75;

            if ($(this.canvas).hasClass("recenteringTouch")) {
                wave.endPosition = {x: width / 2, y: height / 2};
                wave.slideDistance = dist(wave.startPosition, wave.endPosition);
            }

            this.waves.push(wave);
            this.cancelled = false;

            this.animate();
        },
         /**
         *
         */
        draw : function (done) {
          this.onComplete = done;

          for (var i = 0; i < this.waves.length; i++) {
            // Declare the next wave that has mouse down to be mouse'ed up.
            var wave = this.waves[i];
            if (wave.isMouseDown) {
              wave.isMouseDown = false
              wave.mouseDownStart = 0;
              wave.tUp = 0.0;
              wave.mouseUpStart = now();
              break;
            }
          }
          this.animate();
        },
        /**
         *
         */
        cancel : function () {
          this.cancelled = true;
          return this;
        },

         /**
         *  Stop or start rendering waves for the next animation frame
         */
        animate : function (active) {
          if (active == undefined) active = true;

          if (active === false) {
            if (this.cAF == undefined) {
              this._loop = null;
              this.cAF();

              // Notify listeners [via callback] of animation completion
              this.onComplete();
            }
          } else {
            if (!this._loop) {
              this._loop = $.proxy(this, function () {
                var ctx = this.canvas.getContext('2d');
                ctx.scale(this.pixelDensity, this.pixelDensity);

                this.onAnimateFrame(ctx);
              });
            }
            // ѭ�������˳���
            this.cAF = window.requestAnimationFrame(this._loop);
          }
        },

         /**
         * the animate for wave
         */
        onAnimateFrame : function (ctx) {
          // Clear the canvas
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

          var deleteTheseWaves = [];
          // wave animation values
          var anim = {
            initialOpacity: this.initialOpacity,
            opacityDecayVelocity: this.opacityDecayVelocity,
            height: ctx.canvas.height,
            width: ctx.canvas.width
          };

          for (var i = 0; i < this.waves.length; i++) {
            var wave = this.waves[i];

            if ( !this.cancelled ) {

              if (wave.mouseDownStart > 0) {
                wave.tDown =  now() - wave.mouseDownStart;
              }
              if (wave.mouseUpStart > 0) {
                wave.tUp = now() - wave.mouseUpStart;
              }

              // Obtain the instantaneous size and alpha of the ripple.
              // Determine whether there is any more rendering to be done.

              var radius = waveRadiusFn(wave.tDown, wave.tUp, anim);
              var maximumWave = waveAtMaximum(wave, radius, anim);
              var waveDissipated = waveDidFinish(wave, radius, anim);
              var shouldKeepWave = !waveDissipated || !maximumWave;

              if (!shouldKeepWave) {

                deleteTheseWaves.push(wave);

              } else {


                drawWave( wave, $.extend( anim, {
                  radius : radius,
                  backgroundFill : this.backgroundFill,
                  ctx : ctx
                }));

              }
            }
          }

          if ( this.cancelled ) {
            // Clear all waves...
            deleteTheseWaves = deleteTheseWaves.concat( this.waves );
          }
          for (var i = 0; i < deleteTheseWaves.length; ++i) {
            removeWave( deleteTheseWaves[i], this.waves );
          }

          if (!this.waves.length) {
            // If there is nothing to draw, clear any drawn waves now because
            // we're not going to get another requestAnimationFrame any more.
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            // stop animations
            this.animate(false);

          } else if (!waveDissipated && !maximumWave) {
            this.animate();
          }

          return this;
        },

        adjustBounds : function (canvas) {
          // Default to parent container to define bounds
          var self = this,
            src = canvas.parentNode.getBoundingClientRect(),  // read-only
            bounds = { width: src.width, height: src.height };

          var styleArr = "width height".split(" ");

          styleArr.forEach(function (style) {
            var value = (self[style] != "auto") ? self[style] : undefined;

            // Allow CSS to explicitly define bounds (instead of parent container
            if (value == undefined) {
              bounds[style] = sanitizePosition(value);
              canvas.setAttribute(style, bounds[style] * self.pixelDensity + "px");
            }

          });

          canvas.setAttribute('width', bounds.width * this.pixelDensity + "px");
          canvas.setAttribute('height', bounds.height * this.pixelDensity + "px");

          function sanitizePosition(style) {
            var val = style.replace('px', '');
            return val;
          }

          return canvas;
        }
    
    };

    function noop(){ };

    
    /**
     *
     */
    function waveRadiusFn(touchDownMs, touchUpMs, anim) {
      // Convert from ms to s.
      var waveMaxRadius = 150;
      var touchDown = touchDownMs / 1000;
      var touchUp = touchUpMs / 1000;
      var totalElapsed = touchDown + touchUp;
      var ww = anim.width, hh = anim.height;
      // use diagonal size of container to avoid floating point math sadness
      var waveRadius = Math.min(Math.sqrt(ww * ww + hh * hh), waveMaxRadius) * 1.1 + 5;
      var duration = 1.1 - .2 * (waveRadius / waveMaxRadius);
      var tt = (totalElapsed / duration);

      var size = waveRadius * (1 - Math.pow(80, -tt));
      return Math.abs(size);
    }

      /**
     *
     */
    function waveOpacityFn(td, tu, anim) {
      // Convert from ms to s.
      var touchDown = td / 1000;
      var touchUp = tu / 1000;

      return (tu <= 0) ? anim.initialOpacity : Math.max(0, anim.initialOpacity - touchUp * anim.opacityDecayVelocity);
    }

    /**
     *
     */
    function waveOuterOpacityFn(td, tu, anim) {
      // Convert from ms to s.
      var touchDown = td / 1000;
      var touchUp = tu / 1000;

      // Linear increase in background opacity, capped at the opacity
      // of the wavefront (waveOpacity).
      var outerOpacity = touchDown * 0.3;
      var waveOpacity = waveOpacityFn(td, tu, anim);
      return Math.max(0, Math.min(outerOpacity, waveOpacity));
    }


    /**
     * Determines whether the wave should be completely removed.
     */
    function waveDidFinish(wave, radius, anim) {
      var waveMaxRadius = 150;
      var waveOpacity = waveOpacityFn(wave.tDown, wave.tUp, anim);
      // If the wave opacity is 0 and the radius exceeds the bounds
      // of the element, then this is finished.
      if (waveOpacity < 0.01 && radius >= Math.min(wave.maxRadius, waveMaxRadius)) {
        return true;
      }
      return false;
    };

    /**
     *
     */
    function waveAtMaximum(wave, radius, anim) {
      var waveMaxRadius = 150;
      var waveOpacity = waveOpacityFn(wave.tDown, wave.tUp, anim);
      if (waveOpacity >= anim.initialOpacity && radius >= Math.min(wave.maxRadius, waveMaxRadius)) {
        return true;
      }
      return false;
    }

     /**
     *
     */
    function createWave(elem) {
      var elementStyle = window.getComputedStyle(elem);

      var wave = {
        waveColor: elementStyle.color,
        maxRadius: 0,
        isMouseDown: false,
        mouseDownStart: 0.0,
        mouseUpStart: 0.0,
        tDown: 0,
        tUp: 0
      };
      return wave;
    };

     /**
     *
     */
    function removeWave(wave, buffer) {
      if (buffer && buffer.length) {
        var pos = buffer.indexOf(wave);
        buffer.splice(pos, 1);
      }
    }

    function drawWave ( wave, anim ) {

      // Calculate waveColor and alphas; if we do a background
      // fill fade too, work out the correct color.

      anim.waveColor = cssColorWithAlpha(
        wave.waveColor,
        waveOpacityFn(wave.tDown, wave.tUp, anim)
      );

      if ( anim.backgroundFill ) {
        anim.backgroundFill = cssColorWithAlpha(
          wave.waveColor,
          waveOuterOpacityFn(wave.tDown, wave.tUp, anim)
        );
      }

      // Position of the ripple.
      var x = wave.startPosition.x;
      var y = wave.startPosition.y;

      // Ripple gravitational pull to the center of the canvas.
      if ( wave.endPosition ) {

        // This translates from the origin to the center of the view  based on the max dimension of
        var translateFraction = Math.min(1, anim.radius / wave.containerSize * 2 / Math.sqrt(2));

        x += translateFraction * (wave.endPosition.x - wave.startPosition.x);
        y += translateFraction * (wave.endPosition.y - wave.startPosition.y);
      }

      // Draw the ripple.
      renderRipple(anim.ctx, x, y, anim.radius, anim.waveColor, anim.backgroundFill);

      // Render the ripple on the target canvas 2-D context
      function renderRipple(ctx, x, y, radius, innerColor, outerColor) {
        if (outerColor) {
          ctx.fillStyle = outerColor || 'rgba(252, 252, 158, 1.0)';
          ctx.fillRect(0,0,ctx.canvas.width, ctx.canvas.height);
        }
        ctx.beginPath();

        ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = innerColor || 'rgba(252, 252, 158, 1.0)';
        ctx.fill();

        ctx.closePath();
      }
    }

     /**
     *
     */
    function cssColorWithAlpha(cssColor, alpha) {
      var parts = cssColor ? cssColor.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/) : null;
      if (typeof alpha == 'undefined') {
        alpha = 1;
      }
      if (!parts) {
        return 'rgba(255, 255, 255, ' + alpha + ')';
      }
      return 'rgba(' + parts[1] + ', ' + parts[2] + ', ' + parts[3] + ', ' + alpha + ')';
    }

    /**
     * ��������������֮��ľ���
     */
    function dist(p1, p2) {
      return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    /**
     * ������㵽��Զ���ľ���
     */
    function distanceFromPointToFurthestCorner(point, size) {
      var tl_d = dist(point, {x: 0, y: 0});
      var tr_d = dist(point, {x: size.w, y: 0});
      var bl_d = dist(point, {x: 0, y: size.h});
      var br_d = dist(point, {x: size.w, y: size.h});
      return Math.max(tl_d, tr_d, bl_d, br_d);
    }


    //export
    module.exports = Ripple;
});
