<html>
<head>
  <title>One2Edit API test</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script type="text/javascript" src="https://demo.one2edit.com/scripts/one2edit.js"></script>

  <?php

  // NO echo() here - session is starting

  require('e21session.php');
  $username = "one2editApiTest@team.expresskcs.com";
  $t = new One2editTalker($username); // does one2edit login if needed, reuses existing session if one exists.

  // NOTE that above code must be run before anything else is sent to the browser.
  ?>


  <style>
  .one2edit {
    width:940px;
    height:500px;
    background-color: red;
  }
  </style>

</head>
<body>
  <?php
  if (isset($_GET['logout'])) {
    $t->logout();
    debug(0, "Logged out.");
    exit();
  }
  echo("<script>\n");
  echo("session=\"".$t->eSession->sessionId."\"; \n");
  echo("baseURL=\"".$t->one2editServerBaseUrl."\";\n");
  echo("</script>\n");
  $jobId = $t->findTopJob();
  if ($jobId === FALSE) { exit(); }
  $workspaceId = $t->one2editWorkspaceId;
  echo("<script>jobId=$jobId;\nworkspaceID=$workspaceId\n</script>");
  echo("<script>jobId=$jobId;</script>\n"); // jobId is integer not string
  debug(0,"Top job is $jobId.");

  echo('All done.<br />');
  ?>

  <div class="one2edit">
    <!-- Without this div with 'flashContent' as id the swf object can't be placed -->
    <div id="flashContent"> </div>
  </div>

  <script type='text/javascript'>
  // Create a one2edit object with the desired attributes, flashvars, options  and parameters
  console.log("Going to edit job "+jobId+" in workspace "+workspaceID+" in session "+session+" baseURL: "+baseURL);

  var ap = {
    options: {
      onEditorInitialize: function() {
        // cannot run this until editor is running
        one2edit.editor.closeBehavior(one2edit.editor.CLOSE_BEHAVIOR_LOGOUT); // that means logout on close. Note US spelling :-(
      }
    },
    parameters: {
      wmode: 'opaque'
    },
    flashvars: {
      server: baseURL,
      sessionId: session,        // A sessionId is returned when we authenticate a user (see API example)
      clientId: workspaceID,                    // Id of our Client Workspace
      idleTimeout: 900,
      jobEditor: {
        jobId: jobId               // A jobId is returned when we start a job template (see API example)
      }
    }
  }
  console.log('ap: '+JSON.stringify(ap,null,4)); // just do it like this for debug output. Does not show functions.
  one2edit.create(ap);
  </script>
</body>
</html>
