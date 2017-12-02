<?php
// upload a new InDesign Package to be used as a new master document by one2edit
?>

<html>
<head>
  <title>One2Edit API test</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script type="text/javascript" src="https://demo.one2edit.com/scripts/one2edit.js"></script>
  <script src="https://code.jquery.com/jquery-3.2.1.js"></script>
  <script src="dismiss.js"></script>
  <script src="callServer.js"></script>
  <?php

  // NO echo() here - session is starting

  require('e21session.php');
  $username = "one2editApiTest@team.expresskcs.com";
  $t = new One2editTalker($username, TRUE); // does one2edit login always, to create separate session here: always log out of this session when this page finishes.

  // NOTE that above code must be run before anything else is sent to the browser. Should it be above <html>?

  function get01($name) {
    // https://stackoverflow.com/questions/3384942/true-in-get-variables#3384973
    return filter_input(INPUT_GET, $name, FILTER_VALIDATE_BOOLEAN, array("flags" => FILTER_NULL_ON_FAILURE)) ? 1 : 0;
  }
  $wantOpenEditor = get01('open');
  $wantTemplateslessJob = get01('templateless');

  exportToJavascript('wantTemplateslessJob', $wantTemplateslessJob);
  exportToJavascript('wantOpenEditor', $wantOpenEditor);
  exportToJavascript('baseURL', $t->one2editServerBaseUrl);
  exportToJavascript('apiUrl', $t->one2editServerApiUrl);
  exportToJavascript('sessionId', $t->eSession->sessionId); // this is the one2edit session ID between MediaFerry server and one2edit server
  // not the one between the user's browser and the MediaFerry server (if such a one exists).
  // We export the sessionId to the browser so that the user can upload files direct from their machine to One2editTalker
  // without knowing the one2edit password.
  // But, hang on! If the PHP code reused any existing session, that session could be a different one2edit user!
  // And if we reuse the session and then log out of it, we potentially log out some other activity going on elsewhere.
  // So we should _not_ reuse one2edit sessions and should always log in afresh here. And when we have finished with the code on this
  // page we should log out. On either good or error exit, or on leaving the page.
  exportToJavascript('clientId', $t->one2editWorkspaceId); // one2edit naming is confused, workspaceId used to be called cientId.
  ?>

  <style>
  .one2edit { /* This is the box that the one2edit Flash screen inhabits, if we use it */
    width:100%; /* leaving it at 100% means that the Flash plugin changes content dynamically with the screen size. */
    height:100vh; /* I have seen a bug with this in Safari - screen taller than the window - but that's safari. */
    background-color: #e6ffff; /* Different colour so that we can see if the Flash plugin has been launched. */
  }
  .progress, .success, .errorReturned {
    display: none; /* the progress announcements are hidden to start with, revealed with slideDown() */
  }
  .errorReturned {
    color: red;
    background-color: #e6efc6;
  }
  .alertBox {
    display: none;
    background-color: #ef7f93;
    border-radius: 0.5em;
    border-color: black;
    border-width: 1px;
  }
  </style>

</head>
<body>
  <div id='textDiv'>
    <h2>Upload an InDesign Package to be used as a new master document</h2>
    First, create a folder holding everything with InDesign - File - Package.
    Then compress that folder and its files into a zip archive.
    Then upload that zip archive.

    <!--  This form here triggers off all the javascript above. Not entirely sure how! -->
    <form method="post" id="fileUploadForm" name="fileinfo" onsubmit="return submitForm2();">
      <label>Select Zip Archive File :</label><br />
      <input type="file" name="data" accept=".zip" required />
      <input type="submit" value="Upload Zip File" />
    </form>
    <!-- This code here, which is all initially hidden, displays the progress of the operation. -->
    <div id='display'>
      <div class='uploading progress'>
        <div>Uploading File:</div>
        <div class='errorReturned'> Error: Code: <span class='code'>undefined</span> Message: <span class='message'>undefined too</span></div>
        <div class='success'> Success! </div>
      </div>
      <div class='unzipping progress'>
        <div>Unzipping Archive File at Server:</div>
        <div class='errorReturned'> Error: Code: <span class='code'>undefined</span> Message: <span class='message'>undefined too</span></div>
        <div class='success'> Success! </div>
      </div>
      <div class='createProject progress'>
        <div>Creating Project at Server:</div>
        <div class='errorReturned'> Error: Code: <span class='code'>undefined</span> Message: <span class='message'>undefined too</span></div>
        <div class='success'> Success! </div>
      </div>
      <div class='addContentGroup progress'>
        <div>Adding Content Group at Server:</div>
        <div class='errorReturned'> Error: Code: <span class='code'>undefined</span> Message: <span class='message'>undefined too</span></div>
        <div class='success'> Success! </div>
      </div>
      <div class='populateContentGroup progress'>
        <div>Populate Content Group at Server:</div>
        <div class='errorReturned'> Error: Code: <span class='code'>undefined</span> Message: <span class='message'>undefined too</span></div>
        <div class='success'> Success! </div>
        <div class='noEditableContent progress'>NO EDITABLE CONTENT☹️</div>
      </div>
      <div class='moveItemsToContentGroup progress'>
        <div>Moving Items to Editable Content Group at Server:</div>
        <div class='errorReturned'> Error: Code: <span class='code'>undefined</span> Message: <span class='message'>undefined too</span></div>
        <div class='success'> Success! </div>
      </div>
    </div>
  </div>
  <div id='flashDiv' class='one2edit' style='display:none'>
    <div id="flashContent"> </div>
  </div>

  <?php
  // Find the Project Folder '/UploadedMasters'
  $data = ['command'=>'document.folder.list', 'id'=>1, 'depth'=>1]; // list all folders in folder 1, which is the document folder
  $serverResponse = $t->talk($data); // serverResponse has been converted to an array
  if ($serverResponse === FALSE) { exit(); } // turn on debug messages if you want to see info from talk()
  if (isset($serverResponse['folders']['folder']) and has_string_keys($serverResponse['folders']['folder'])) { // then there is only one folder and it is not in an array
    $serverResponse['folders']['folder'] = [ $serverResponse['folders']['folder'] ]; // regularise the layout so even if ther eis only one folder it is in an indexed array
  }
  if (!isset($serverResponse['folders']['folder'][0][id])) { debug(1, 'Cannot find any folders.'); if (debug(1)) { var_dump($serverResponse); echo('<br />'); } exit(); }
  $folders = $serverResponse['folders']['folder'];
  foreach ($folders as $folder) {
    if (isset($folder['id']) and isset($folder['name']) and ($folder['name'] == 'UploadedMasters')) {
      $uploadedMastersFolderId = $folder['id'];
    }
  }
  // echo('Found UploadedMasters Project Folder id='.$uploadedMastersFolderId.'<br />');

  // For the one2edit asset space, we don't need to find the folder ID, because the API uses folder names.
  // We upload all zip files to /UploadedPackages in the asset space, and unzip them there.
  // But we do need to find the asset project to upload to.
  $data = ['command'=>'asset.list'];
  $serverResponse = $t->talk($data);
  if ($serverResponse === FALSE) { exit(); }
  // Can there be multiple asset spaces in one workspace? If so, the below would fail.
  if (!isset($serverResponse['assets']['asset']['project'])) { debug(1, 'Cannot find any asset project.'); exit(); }
  $assetProject = $serverResponse['assets']['asset']['project'];
  // echo("Found asset project number: $assetProject<br />");

  exportToJavascript('uploadedMastersFolderId', $uploadedMastersFolderId);
  exportToJavascript('projectId', $assetProject);
  ?>

  <script type="text/javascript">

  // this is the sequence of server API calls to make.
  // We have to declare it here so that submitForm2 can find it
  // but we can only set it later because callServer.js is still loading when this code runs
  var callSequence0;

  function submitForm2() { // called when submit button is pressed on form
    L$.submitForm($('#fileUploadForm'), callSequence0);
    return false; // MUST return false or chaos ensues, browser reloads with POST.
  }

  $(document).ready(function() {

    // definitely have to use .ready() here or all is chaos
    // because otherwise this code tries to run before callServer.js has loaded and the L$ library is a complete mess.

    $(window).on('beforeunload', function(){ console.log('beforeunload running'); L$.logoutFromServer(); }) // Must logout on leaving this page or we'll run out of one2edit licences.

    L$.$display($('#display')); // tell library where to find progress elements.

    // This sequence is handled in order by the library API calls in callServer.js
    callSequence0 = [
      L$.doUnzipAtServer,
      L$.doSearchForInddFile,
      L$.doCreateProject,
      L$.doAddContentGroup,
      L$.doPopulateContentGroup
    ];

    if (wantOpenEditor) { callSequence0.push(L$.editDocument); }
    if (wantTemplateslessJob) { callSequence0.push(L$.startTemplatelessTemplateJob); }

  });


  </script>


</body>
</html>
