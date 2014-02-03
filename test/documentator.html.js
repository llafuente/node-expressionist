jQuery(function () {
  var prev,
    threshold = Math.max(50, window.innerHeight * 0.2);

  var headings = jQuery('h1').map(function (i, el) {
    return {
      top: jQuery(el).offset().top,
      id: el.id
    };
  });

  function closest() {
    var h;
    var top = jQuery(window).scrollTop();
    var i = headings.length;
    while (i--) {
      h = headings[i];
      if (top + threshold >= h.top) {
        return h;
      }
    }
  }

  jQuery(document).scroll(function () {
    var h = closest();
    if (!h) {
      return;
    }

    if (prev) {
      prev.removeClass('active');
      prev.parent().parent().removeClass('active');
    }

    var a = jQuery('a[href="#' + h.id + '"]');
    a.addClass('active');

    prev = a;
  });
});