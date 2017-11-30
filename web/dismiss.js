// standalone include file to allow html elements with class='dismissOnClick' to be dismissed with a click anywhere

$(document).ready(function() { // this runs in addition to other $(document).ready() calls elsewhere
  $('body')
    .on('click', function() { // for any click event that bubbles up to the document body..
      $('.dismissOnClick:visible').trigger('dismiss'); // send a custom 'dismiss' event to any visible element which has class='dismissOnClick'
    })
    .on('dismiss', '.dismissOnClick', function() { // delegated handler for custom dismiss event in any element which has class='dismissOnClick'..
      if ($(this).hasClass('dismissFast')) {
        $(this).hide();
        $(this).trigger('dismissed');
      }
      $(this).slideToggle(function() { // ..make the element disappear, using whatever animation you want..
        $(this).trigger('dismissed'); // ..then when the animation is finished, send the element a custom 'dismissed' event
      });
    })
    .on('dismissed', '.removeOnDismiss', function() { // delegated handler for custom dismissed event in any just-dismissed element which has class='removeOnDismiss'..
      $(this).remove(); // .. just removes the element after it is no longer visible
    })
    .on('click', '.dismissOnClick', function(event) { // delegated handler for the click event which..
      event.stopPropagation(); // ..stops clicks inside a popup panel bubbling up to the document body..
    })
    .on('click', '.closeButton', function() { // but clicks on an element with class='closeButton'..
      $(this).trigger('dismiss'); // ..automatically send a dismiss event to the close button, whcih will bubble up to the enclosing popup and trigger the custom delegated handler above.
    });
});
