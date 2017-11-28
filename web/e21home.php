<?php

// log in to one2edit and display the one2edit home screen. On logout, close the window.



?>

<html>
<head>
  <title>One2Edit API test</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script type="text/javascript" src="https://demo.one2edit.com/scripts/one2edit.js"></script>
  <script src="https://code.jquery.com/jquery-3.2.1.js"></script>
  <?php

  // NO echo() here - session is starting

  require('e21session.php');
  $username = "one2editApiTest@team.expresskcs.com";
  $t = new One2editTalker($username); // does one2edit login if needed, reuses existing session if one exists.

  // NOTE that above code must be run before anything else is sent to the browser. Should it be above <html>?

  exportToJavascript('session', $t->eSession->sessionId);
  exportToJavascript('baseURL', $t->one2editServerBaseUrl);
  exportToJavascript('workspaceId', $t->one2editWorkspaceId);
  ?>

  <style>
  .one2edit {
    width:940px;
    height:500px;
    background-color: light grey;
  }
  </style>

</head>
<body>

  <div class="one2edit">
    <!-- Without this div with 'flashContent' as id the swf object can't be placed -->
    <div id="flashContent"> </div>
  </div>

  <script type='text/javascript'>
  // for any page where you have a flash one2edit window open, you have to log out on leaving
  // or you cannot get back in until the session times out.
  $(window).on('beforeunload', function(){ one2edit.logout(); })
  $(document).ready(function(){
    // Create a one2edit object with the desired attributes, flashvars, options  and parameters

    var ap = {
      options: {
        onEditorInitialize: function() {
          // cannot run this until editor is running
          one2edit.editor.closeBehavior(one2edit.editor.CLOSE_BEHAVIOR_LOGOUT); // that means logout on close. Note US spelling :-(
          },
          onLogout: function() {
            // close window on logout
            $(".one2edit").slideUp();
          }
        },
        parameters: {
          wmode: 'opaque'
        },
        flashvars: {
          server: baseURL,
          sessionId: session,        // A sessionId is returned when we authenticate a user (see API example)
          clientId: workspaceId,                    // Id of our Client Workspace
          idleTimeout: 900,
          // jobEditor: {
          //   jobId: jobId               // A jobId is returned when we start a job template (see API example)
          // }
        }
      }
      console.log('ap: '+JSON.stringify(ap,null,4)); // just do it like this for debug output. Does not show functions.
      one2edit.create(ap);

    });
    </script>
</body>
</html>
