/*!
 * popo.js v1.0.0
 * A JavaScript library for positioning elements
 * http://github.com/niklasramo/popo.js
 * Copyright (c) 2012 Niklas Rämö
 * Released under the MIT license
 */

(function (window, undefined) {
  'use strict';

  var lib = 'popo',
    toFloat = window.parseFloat,
    math = window.Math,
    abs = math.abs,
    win, doc, docElem, body;

  /**
  * Check the type of an object.
  * @param {object} obj
  * @param {string} type
  */
  function fn_typeof(obj, type) {

    obj = ({}).toString.call(obj).split(' ')[1].replace(']', '').toLowerCase();
    return type ? obj === type : obj;

  }

  /**
  * Trim whitespace from a string.
  * @param {string} str
  */
  function fn_trim(str) {

    return fn_typeof(str, 'string') ? (str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '')) : str;

  }

  /**
  * Merge an array of objects into a new object (shallow merge).
  * @param {array} array 
  */
  function fn_merge(array) {

    var obj = {},
      len = array.length,
      i, prop;

    for (i = 0; i < len; i++) {
      for (prop in array[i]) {
        if (array[i].hasOwnProperty(prop)) {
          obj[prop] = array[i][prop];
        }
      }
    }

    return obj;

  }

  /**
  * Check if the element is the window object.
  * @param {element} el
  */
  function fn_isWin(el) {

    return el.self === win.self;

  }

  /**
  * Returns the computed value of an element's style property.
  * @param {element} el
  * @param {string} prop
  */
  function fn_getStyle(el, prop) {

    return win.getComputedStyle ? (
      win.getComputedStyle(el, null).getPropertyValue(prop)
    ) : el.currentStyle ? (
      el.currentStyle[prop]
    ) : (
      null
    );

  }

  /**
  * Returns an element's offset parent.
  * @param {element} el
  */
  function fn_getOffsetParent(el) {

    var offsetParent = el.offsetParent,
      pos = 'style' in el && fn_getStyle(el, 'position');

    if (pos === 'fixed') {
      offsetParent = win;
    } else if (pos === 'absolute') {
      offsetParent = el === body ? docElem : offsetParent || doc;
      while ('style' in offsetParent && fn_getStyle(offsetParent, 'position') === 'static') {
        offsetParent = offsetParent === body ? docElem : offsetParent.offsetParent || doc;
      }
    }

    return offsetParent;

  }

  /**
  * Returns the width of an element (with paddings, borders and scrollbar). If the element
  * in question is window, document or documentElement the scrollbar width is excluded.
  * @param {element} el
  * @param {object} gbcr
  */
  function fn_getWidth(el, gbcr) {

    return fn_isWin(el) ? (
      docElem.clientWidth
    ) : el === doc || el === docElem ? (
      math.max(docElem.scrollWidth, body.scrollWidth)
    ) : (
      gbcr = el.getBoundingClientRect && el.getBoundingClientRect(),
      gbcr && 'width' in gbcr ? gbcr.width : el.offsetWidth
    );

  }

  /**
  * Returns the height of an element (with paddings, borders and scrollbar). If the element
  * in question is window, document or documentElement the scrollbar width is excluded.
  * @param {element} el
  * @param {object} gbcr
  */
  function fn_getHeight(el, gbcr) {

    return fn_isWin(el) ? (
      docElem.clientHeight
    ) : el === doc || el === docElem ? (
      math.max(docElem.scrollHeight, body.scrollHeight)
    ) : (
      gbcr = el.getBoundingClientRect && el.getBoundingClientRect(),
      gbcr && 'height' in gbcr ? gbcr.height : el.offsetHeight
    );

  }

  /**
  * Returns the left and top offset of an element. Works like a charm for all elements except the 
  * documentElement, which outputs inconsistent data depending on the browser. Processes the
  * documentElement as the document object to counter the inconsitencies. Might break if
  * documentElement is positioned or has border, padding or margin.
  * @param {element} el
  * @param {boolean} includeBorders
  */
  function fn_getOffset(el, includeBorders) {

    var offsetLeft = 0,
      offsetTop = 0,
      viewportScrollLeft = win.pageXOffset || docElem.scrollLeft || body.scrollLeft || 0,
      viewportScrollTop = win.pageYOffset || docElem.scrollTop || body.scrollTop || 0,
      offsetParent = el,
      gbcr;

    if (fn_isWin(el)) {

      offsetLeft = viewportScrollLeft;
      offsetTop = viewportScrollTop;

    } else if (el !== doc && el !== docElem) {

      gbcr = el.getBoundingClientRect && el.getBoundingClientRect();

      if (gbcr && 'left' in gbcr && 'top' in gbcr) {

        // gbcr based solution (borrowed from jQuery).
        offsetLeft += gbcr.left + viewportScrollLeft - /* IE7 Fix*/ (docElem.clientLeft || 0);
        offsetTop += gbcr.top + viewportScrollTop - /* IE7 Fix*/ (docElem.clientTop || 0);

      } else {

        // gbcr fallback (borrowed from http://www.quirksmode.org/js/findpos.html).
        while (offsetParent) {
          offsetLeft += fn_isWin(offsetParent) ? viewportScrollLeft : offsetParent.offsetLeft || 0;
          offsetTop += fn_isWin(offsetParent) ? viewportScrollTop : offsetParent.offsetTop || 0;
          offsetParent = fn_getOffsetParent(offsetParent);
        }

      }

      if (includeBorders) {
        offsetLeft += el.clientLeft || 0;
        offsetTop += el.clientTop || 0;
      }

    }

    return {
      left: offsetLeft,
      top: offsetTop
    };

  }

  /**
  * Returns the element's left and top offset in a neutral state (where left/right/top/bottom
  * CSS properties are not affecting the element's position).
  * @param {element} el
  */
  function fn_getNeutralOffset(el) {

    var offset = fn_getOffset(el, 1),
        dir = [[fn_getStyle(el, 'left'), fn_getStyle(el, 'right')], [fn_getStyle(el, 'top'), fn_getStyle(el, 'bottom')]],
        fix = [0, 0],
        prop, val1, val2, i;

    for (i = 0; i < 2; i++) {

      val1 = dir[i][0];
      val2 = dir[i][1];

      // Jump to the next pair if both values are auto.
      if (val1 === 'auto' && val2 === 'auto') {
        continue;
      }

      // If left/top is "auto", let's check how much right/bottom values are affecting the position.
      // Otherwise we only need to check how much left/top values are affecting the position.
      if (val1 === 'auto') {
        fix[i] = -parseFloat(val2.indexOf('px') > -1 ? val2 : el.style[i === 0 ? 'pixelRight' : 'pixelBottom']);
      } else {
        fix[i] = parseFloat(val1.indexOf('px') > -1 ? val1 : el.style[i === 0 ? 'pixelLeft' : 'pixelTop']);
      }

    }

    // Adjust offset.
    offset.left -= fix[0];
    offset.top -= fix[1];

    return offset;

  }

  /**
  * Merges default options with the instance options and also sanitizes the new options.
  * @param {element} el
  * @param {object} options
  */
  function fn_getSanitizedOptions(el, options) {

    var defaultOptions = window[lib].defaults,
      prop, ret, array, len;

    // Merge options with default options.
    options = fn_merge(fn_typeof(options, 'object') ? [defaultOptions, options] : [defaultOptions]);

    for (prop in options) {

      // Handle functions and whitespace.
      options[prop] = fn_trim(fn_typeof(options[prop], 'function') && prop !== 'collision' ? options[prop](el) : options[prop]);

      // Special handling for position.
      if (prop === 'position') {
        options[prop] = options[prop].split(' ');
      }

      // Special handling for offset.
      if (prop === 'offset') {
        ret = fn_typeof(options[prop], 'string') ? options[prop].split(' ') : [];
        options.offsetX = toFloat(ret[0]) || 0;
        options.offsetY = ret.length > 1 ? toFloat(ret[1]) || 0 : options.offsetX;
      }

      // Special handling for collision.
      if (prop === 'collision') {
        ret = fn_typeof(options[prop], 'function') ? options[prop] : null;
        if (fn_typeof(options[prop], 'string') && options[prop].length > 0) {
          array = options[prop].split(' ');
          len = array.length;
          if (len > 0 && len < 5) {
            ret = {
              left: array[0],
              top: len > 1 ? array[1] : array[0],
              right: len > 2 ? array[2] : array[0],
              bottom: len > 3 ? array[3] : len < 2 ? array[0] : array[1]
            };
          }
        }
        options[prop] = ret;
      }

    }

    return options;

  }

  /**
  * Returns the horizontal or vertical base position of the target element.
  * @param {string} pos - The position in the format "targetXbaseX" or "targetYbaseY".
  * @param {number} baseOffset - Base element's left/top offset.
  * @param {number} targetParentOffset - Target element's offset parent's left/top offset.
  * @param {number} extraOffset - Additional left/top offset from options.
  * @param {number} baseSize - Base element's width/height.
  * @param {number} targetSize - Target element's width/height.
  */
  function fn_getBasePosition(pos, baseOffset, targetParentOffset, extraOffset, baseSize, targetSize) {

    var positions = {},
      startingPoint = baseOffset + extraOffset - targetParentOffset;

    positions.leftleft = positions.toptop = startingPoint;
    positions.leftcenter = positions.topcenter = startingPoint + (baseSize / 2);
    positions.leftright = positions.topbottom = startingPoint + baseSize;
    positions.centerleft = positions.centertop = startingPoint - (targetSize / 2);
    positions.centercenter = startingPoint + (baseSize / 2) - (targetSize / 2);
    positions.centerright = positions.centerbottom = startingPoint + baseSize - (targetSize / 2);
    positions.rightleft = positions.bottomtop = startingPoint - targetSize;
    positions.rightcenter = positions.bottomcenter = startingPoint - targetSize + (baseSize / 2);
    positions.rightright = positions.bottombottom = startingPoint - targetSize + baseSize;

    return positions[pos];

  }

  /**
  * Calculates the distance in pixels that the target element needs to be moved in order
  * to be aligned correctly if the target element overlaps with the container element.
  * @param {object} collision
  * @param {object} targetOverlap
  * @param {boolean} vertical 
  */
  function fn_collision(collision, targetOverlap, vertical) {

    var ret = 0,
      push = 'push',
      forcePush = 'push+',
      side1 = vertical ? 'top' : 'left',
      side2 = vertical ? 'bottom' : 'right',
      side1Collision = collision[side1],
      side2Collision = collision[side2],
      side1Overlap = targetOverlap[side1],
      side2Overlap = targetOverlap[side2],
      sizeDifference = side1Overlap + side2Overlap;

    // If pushing is needed from both sides.
    if ((side1Collision === push || side1Collision === forcePush) && (side2Collision === push || side2Collision === forcePush) && (side1Overlap < 0 || side2Overlap < 0)) {

      // Do push correction from opposite sides with equal force.
      if (side1Overlap < side2Overlap) {
        ret -= sizeDifference < 0 ? side1Overlap + abs(sizeDifference / 2) : side1Overlap;
      }
      if (side2Overlap < side1Overlap) {
        ret += sizeDifference < 0 ? side2Overlap + abs(sizeDifference / 2) : side2Overlap;
      }

      // Update overlap data.
      side1Overlap += ret;
      side2Overlap -= ret;

      // Check if left/top side forced push correction is needed.
      if (side1Collision === forcePush && side2Collision != forcePush && side1Overlap < 0) {
        ret -= side1Overlap;
      }

      // Check if right/top side forced push correction is needed.
      if (side2Collision === forcePush && side1Collision != forcePush && side2Overlap < 0) {
        ret += side2Overlap;
      }

    // Check if pushing is needed from left or top side only.
    } else if ((side1Collision === forcePush || side1Collision === push) && side1Overlap < 0) {
      ret -= side1Overlap;

    // Check if pushing is needed from right or bottom side only.
    } else if ((side2Collision === forcePush || side2Collision === push) && side2Overlap < 0) {
      ret += side2Overlap;
    }

    return ret;

  }

  /**
  * The primary function for controlling the logic and flow of the positioning process.
  * @param {element} el
  * @param {string} method
  * @param {object} options
  */
  function fn_position(el, method, options) {

    // Cache target element's window, document, documentElement and body.
    doc = el.ownerDocument;
    win = doc.defaultView || doc.parentWindow;
    docElem = doc.documentElement;
    body = doc.body;

    // Sanitize options.
    options = fn_getSanitizedOptions(el, fn_typeof(method, 'string') ? options : method);

    // Cache collision option for better minification.
    var collision = options.collision,

      // Get target's data.
      targetWidth = fn_getWidth(el),
      targetHeight = fn_getHeight(el),
      targetParentOffset = fn_getStyle(el, 'position') === 'relative' ? fn_getNeutralOffset(el) : fn_getOffset(fn_getOffsetParent(el), 1),

      // Get base element and predefine base data variables.
      baseElement = options.base,
      baseWidth,
      baseHeight,
      baseOffset,

      // Get container element and predefine container data variables.
      containerElement = options.container,
      containerWidth,
      containerHeight,
      containerOffset,

      // Target's current offset and position will be calculated only if 
      // collision callback function is called.
      targetOffset,
      targetPosition,

      // Placeholder for target's overlap data.
      targetOverlap,

      // Placeholder for target's final position.
      targetPositionNew;

    // Calculate base element's dimensions and offset.
    // If base is an array we assume it's a coordinate.
    fn_typeof(baseElement, 'array') ? (
      baseWidth = baseHeight = 0,
      baseOffset = fn_getOffset(baseElement[2] || win),
      baseOffset.left += baseElement[0],
      baseOffset.top += baseElement[1]
    ) : (
      baseWidth = fn_getWidth(baseElement),
      baseHeight = fn_getHeight(baseElement),
      baseOffset = fn_getOffset(baseElement)
    );

    // Calculate target element's new position.
    targetPositionNew = {
      left: fn_getBasePosition(options.position[0] + options.position[2], baseOffset.left, targetParentOffset.left, options.offsetX, baseWidth, targetWidth),
      top: fn_getBasePosition(options.position[1] + options.position[3], baseOffset.top, targetParentOffset.top, options.offsetY, baseHeight, targetHeight)
    };

    // If container is defined, let's do some extra calculations
    // and possible collision corrections.
    if (containerElement) {

      // Calculate container element's dimensions and offset.
      // If container is an array we assume it's a coordinate.
      fn_typeof(containerElement, 'array') ? (
        containerWidth = containerHeight = 0,
        containerOffset = fn_getOffset(containerElement[2] || win),
        containerOffset.left += containerElement[0],
        containerOffset.top += containerElement[1]
      ) : (
        containerWidth = fn_getWidth(containerElement),
        containerHeight = fn_getHeight(containerElement),
        containerOffset = fn_getOffset(containerElement)
      );

      // Calculate how much target element's sides overlap
      // with the container element's sides.
      targetOverlap = {
        left: targetPositionNew.left + targetParentOffset.left - containerOffset.left,
        right: (containerOffset.left + containerWidth) - (targetPositionNew.left + targetParentOffset.left + targetWidth),
        top: targetPositionNew.top + targetParentOffset.top - containerOffset.top,
        bottom: (containerOffset.top + containerHeight) - (targetPositionNew.top + targetParentOffset.top + targetHeight)
      };

      // If collision is a callback function.
      if (fn_typeof(collision, 'function')) {

        // Get target's current offset.
        targetOffset = fn_getOffset(el);

        // Calculate target's current position.
        targetPosition = {
          left: targetOffset.left > targetParentOffset.left ? abs(targetOffset.left - targetParentOffset.left) : -abs(targetOffset.left - targetParentOffset.left),
          top: targetOffset.top > targetParentOffset.top ? abs(targetOffset.top - targetParentOffset.top) : -abs(targetOffset.top - targetParentOffset.top)
        };

        // Call collision callback function.
        collision(targetPositionNew, targetOverlap, {
          target: {
            element: el,
            width: targetWidth,
            height: targetHeight,
            offset: targetOffset,
            position: targetPosition
          },
          base: {
            element: baseElement,
            width: baseWidth,
            height: baseHeight,
            offset: baseOffset
          },
          container: {
            element: containerElement,
            width: containerWidth,
            height: containerHeight,
            offset: containerOffset
          }
        });

      // If a predefined collision method is used.
      } else if (collision) {

        targetPositionNew.left += fn_collision(collision, targetOverlap);
        targetPositionNew.top += fn_collision(collision, targetOverlap, 1);

      }

    }

    // Set or return the final values.
    if (method === 'get') {
      return targetPositionNew;
    } else {
      el.style.left = targetPositionNew.left + 'px';
      el.style.top = targetPositionNew.top + 'px';
      return el;
    }

  }

  // Make the library public and define default options.
  window[lib] = fn_position;
  window[lib].defaults = {
    base: function (el) {
      return el.ownerDocument.defaultView || el.ownerDocument.parentWindow;
    },
    container: null,
    position: 'center center center center',
    offset: '0',
    collision: 'none'
  };

})(self);