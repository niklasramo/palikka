palikka.require(['jQuery', 'docs.scrollspy', 'docs.scrollToElem', 'jQuery.velocity', 'flatdocReady'], function ($, scrollspy, scrollToElem) {

  var
  $header = $('.header'),
  headerHeight = $header.height();

  // Fix broken ids and links.
  $('[id], [href]').each(function () {

    var
    $item = $(this),
    id = $item.attr('id'),
    link = $item.attr('href');

    if (id && id.indexOf('-') === 0) {
      $item.attr('id', id.replace('-', ''));
    }

    if (link && link.indexOf('#-') === 0) {
      $item.attr('href', link.replace('#-', '#'));
    }

  });

  // Bind id anchors.
  $('body [href]').each(function () {

    var
    $item = $(this),
    href = $item.attr('href') || '',
    $target;

    if (href && href.indexOf('#') === 0) {

      $target = $(href);

      if ($target.length) {

        $item.on('click', function (e) {

          e.preventDefault();

          scrollToElem($target, $header.css('position') === 'fixed' ? -headerHeight : 0);

          if (window.history.pushState) {
            window.history.pushState({href: href}, '', href);
          }

        });

      }

    }

  });

  // Scrollspy init.
  scrollspy.init({
    targets: $('.content h2, .content h3'),
    anchors: $('.menu [href]'),
    offset: -headerHeight
  });

});

palikka.define('docs.scrollspy', ['jQuery', 'jQuery.velocity', 'docReady'],  function ($) {

  var
  m = {},
  $win = $(window),
  $doc = $(document);

  m.activeClass = 'scrollspy-active';

  m.instance = {
    active: false,
    activeIndex: null,
    activeClass: m.activeClass,
    scrollCache: [],
    offset: 0,
    $targets: $(),
    $anchors: $()
  };

  palikka.eventize(m);

  m.init = function (opts) {

    var
    opts = opts || {},
    $targets = opts.targets instanceof $ ? opts.targets : $(),
    $anchors = opts.anchors instanceof $ ? opts.anchors : $(),
    targetCount = $targets.length,
    anchorCount = $anchors.length;

    if (!targetCount || !anchorCount) {
      return m;
    }

    // Setup instance.
    m.instance.active = true;
    m.instance.activeIndex = null;
    m.instance.activeClass = typeof opts.activeClass === 'string' ? opts.activeClass : m.activeClass;
    m.instance.scrollCache.length = 0;
    m.instance.offset = parseInt(opts.offset) || 0;
    m.instance.$targets = $();
    m.instance.$anchors = $();

    $targets
    .each(function (i) {

      var
      $target = $(this),
      $anchor = $anchors.filter('[href="#' + $target.attr('id') + '"]').first(),
      scrollData;

      // Skip this iteration if $target or $anchor is missing.
      if (!$target.length || !$anchor.length) {
        return true;
      }

      // Create scroll data.
      scrollData = {
        $target: $target,
        $anchor: $anchor,
        top: $target.offset().top + m.instance.offset
      };

      // Add $target, $anchor and scrollCache data to instance data.
      m.instance.$targets = m.instance.$targets.add($target);
      m.instance.$anchors = m.instance.$anchors.add($anchor);
      m.instance.scrollCache.push(scrollData);

      // Add previous scroll cache item's bottom data.
      if (i > 0) {
        m.instance.scrollCache[(i - 1)].bottom = scrollData.top - 1;
      }

      // Add last target's bottom data.
      if ((i + 1) === targetCount) {
        scrollData.bottom = $doc.height();
      }

    });

    $win
    .off('resize.scrollspy')
    .on('resize.scrollspy', function () {

      m.refresh().update();

    })
    .off('scroll.scrollspy')
    .on('scroll.scrollspy', m.update);

    return m.update().emit('init', [m.instance]);

  };

  m.refresh = function () {

    if (!m.instance.active) {
      return m;
    }

    var cacheLength = m.instance.scrollCache.length;

    $.each(m.instance.scrollCache, function (i, scrollData) {

      // Get top offset.
      scrollData.top = scrollData.$target.offset().top + m.instance.offset;

      // Add previous scroll cache item's bottom data.
      if (i > 0) {
        m.instance.scrollCache[(i - 1)].bottom = scrollData.top - 1;
      }

      // Add last target's bottom data.
      if ((i + 1) === cacheLength) {
        scrollData.bottom = $doc.height();
      }

    });

    // Reset active index.
    m.instance.activeIndex = null;

    return m.emit('refresh', [m.instance]);

  };

  m.update = function () {

    if (!m.instance.active) {
      return m;
    }

    var
    scrollTop = $win.scrollTop(),
    currentIndex = m.instance.scrollCache.length - 1,
    currentItem,
    activeItem;

    // Find current index.
    $.each(m.instance.scrollCache, function (i, scrollData) {
      if (scrollData.top <= scrollTop && scrollData.bottom >= scrollTop) {
        currentIndex = i;
        return false;
      }
    });

    // Update class if needed.
    if (currentIndex !== m.instance.activeIndex) {
      currentItem = m.instance.scrollCache[currentIndex];
      currentItem.$target.add(currentItem.$anchor).addClass(m.instance.activeClass);
      if (m.instance.activeIndex !== null) {
        activeItem = m.instance.scrollCache[m.instance.activeIndex];
        activeItem.$target.add(activeItem.$anchor).removeClass(m.instance.activeClass);
      }
      m.instance.activeIndex = currentIndex;
      m.emit('change', [m.instance]);
    }

    return m.emit('update', [m.instance]);

  };

  return m;

});

palikka.define('docs.scrollToElem', ['jQuery', 'jQuery.velocity', 'docReady'],  function ($) {

  return function ($elem, offset) {

    if ($elem.length) {

      $elem.velocity('scroll', {
        duration: 750,
        offset: offset,
        easing: 'ease-in-out',
        mobileHA: false
      });

    }

  };

});