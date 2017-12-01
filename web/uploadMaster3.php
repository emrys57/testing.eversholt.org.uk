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
  <?php

  // NO echo() here - session is starting

  require('e21session.php');
  $username = "one2editApiTest@team.expresskcs.com";
  $t = new One2editTalker($username, TRUE); // does one2edit login always, to create separate session here: always log out of this session when this page finishes.

  // NOTE that above code must be run before anything else is sent to the browser. Should it be above <html>?

  $wantOpenEditor = filter_input(INPUT_GET, "open", FILTER_VALIDATE_BOOLEAN, array("flags" => FILTER_NULL_ON_FAILURE)) ? 1 : 0; // https://stackoverflow.com/questions/3384942/true-in-get-variables#3384973

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
    <form method="post" id="fileUploadForm" name="fileinfo" onsubmit="return submitForm();">
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

  function logoutFromServer() { callServer({ command: 'user.session.quit' }, undefined, '#logout'); }

  $(window).on('beforeunload', function(){ logoutFromServer(); }) // Must logout on leaving this page or we'll run out of one2edit licences.

  // All this javascript is triggered when someone hits <submit> on the file upload form in html below.

  var zipFileIdentifier; // asset pathname from server
  var $display; // html where we put notices, not defined yet

  var callSequence0 = [
    doUnzipAtServer,
    doSearchForInddFile,
    doCreateProject,
    doAddContentGroup,
    doPopulateContentGroup
  ];

  if (wantOpenEditor) { callSequence0.push(editDocument); }

  // https://stackoverflow.com/questions/2320069/jquery-ajax-file-upload
  // This uploads the file. Change this to give a progress bar on upload and drag-and-drop fucntionality.
  function submitForm() {
    console.log("submit event");
    $display = $('#display');
    $uploading = $display.find('.uploading')
    $uploading.slideDown();
    var fd = new FormData(document.getElementById("fileUploadForm"));
    fd.append("sessionId", sessionId);
    fd.append("clientId", clientId);
    fd.append("command", "asset.upload");
    fd.append("projectId", projectId);
    fd.append("folderIdentifier", "/UploadedPackages");
    $.ajax({
      url: apiUrl,
      type: "POST",
      data: fd,
      processData: false,  // tell jQuery not to process the data
      contentType: false,   // tell jQuery not to set contentType
      success: function(returnedData, textStatus, jqXHR) {
        // returnedData is already parsed into an object by jquery
        // but it seems very difficult to handle, bizarrely
        // stackoverflow suggests converting to jQuery object, so I do that.
        console.log('submitForm: success: data:', returnedData);
        var $xml = $(returnedData);
        var error = $xml.find('error').text();
        var code = $xml.find('code').text();
        if (code != '') {
          var message = $xml.find('message').text();
          console.log('File upload: server returned error: code: ', code, ' message: ', message);
          $uploading.find('.errorReturned').slideDown();
          $uploading.find('.code').text(code);
          $uploading.find('.message').text(message);
          return;
        }
        $uploading.find('.success').slideDown();
        zipFileIdentifier = $xml.find('identifier').text();
        passOn($xml, callSequence0);
      }
    });
    return false;
  }

  // That is fine, but now we are doing javascript access direct from user's browser to one2edit.
  // Using PHP to set up the session makes sense, because then the one2edit apssword never touches the browser.
  // It's just rather scruffy to have both javascript and php handle the one2edit API.
  // I wish I had a library to handle these APIs direct from the API definitions.

  function doUnzipAtServer($xml, callSequence) {
    // $xml is the result of the asset.upload API call.
    // If callSequence is present, it's an array of functions. If the callServer here succeeds, the top function is removed, called and the remaining callSequence passed on.
    // It's a way of building a sequence of API calls which complete asynchronously.
    var zipFileIdentifier = $xml.find('identifier').text();
    callServer({
      command: 'asset.extract',
      projectId: projectId, // that is the assset project
      identifier: zipFileIdentifier,
      remove: true // we definitely want to remove the zip file
    }, function($xml){
      console.log('doUnzipAtServer: success: xml:', $xml[0]);
      passOn($xml, callSequence);
    }, '.unzipping');
  }

  function passOn($xml, callSequence) {
    // pass on the $xml to the next function in the sequence, if such a function exists
    if ($.isArray(callSequence) && (typeof callSequence[0] == 'function')) {
      var l1 = callSequence.length;
      var topFunction = callSequence.shift(); // pops first entry and returns it
        var l2 = callSequence.length;
        var fs = '';
        callSequence.forEach(function(f) { fs+=','+f.name; });
      console.log('passOn: ', $xml[0], '; to: ', topFunction.name, '; sequence after pop: ', fs, ' l1:', l1, ' l2:', l2);
      topFunction($xml, callSequence);
    } else { console.log('No more to do in sequence, finished.'); }
  }

  function callServer(data, realSuccess, displaySection) {
    // call the one2edit server. Display notices about what is happening.
    // To inhibit notices, give a 'displaySection' that is not implemented in html.
    // the 'realSuccess' function is only called if the server does not return an error code.
    // 'data' is an array of the parameters to pass to the server.
    // callServer autoamtically adds the sessionId and workspaceId to data.

    // TODO: There is no error handling function for the ajax call, so if the network is broken, ...?
    if (typeof $display == 'undefined') { $display = $('#display'); } // in case we do logout before submitting form
    $displaySection =$display.find(displaySection); // this is the bit of the html we will be displaying progress in
    $displaySection.slideDown(); // display what we're just about to do.
    var myData = {
      sessionId: sessionId,
      clientId: clientId
    };
    $.extend(myData, data);
    console.log('callServer: ', displaySection, ' ', myData);
    $.ajax({
      url: apiUrl,
      type: "POST",
      data: myData,
      success: function(returnedData, textStatus, jqXHR) {
        console.log('callServer: ', displaySection, ': success: returnedData:', returnedData);
        var $xml = $(returnedData); // the is the only way I can make sense of the weird returned object
        var code = $xml.find('error').children('code').text();
        if (code != '') { // then an error code has been returned at the top level of the API call
          var message = $xml.find('message').text();
          console.log('callServer: ', displaySection,': server returned error: code: ', code, '; message: ', message);
          $displaySection.find('.errorReturned').slideDown();
          $displaySection.find('.code').text(code);
          $displaySection.find('.message').text(message);
          return;
        }
        $displaySection.find('.success').slideDown();
        if (typeof realSuccess != 'undefined') { realSuccess($xml); }
      }
    })
  }

  function doSearchForInddFile($xml, callSequence) {
    // $xml is the result of the 'asset.extract' call
    var folderIdentifier = $xml.find('identifier').text();
    // Hunt down the .indd file within the folders created by unzipping.
    // Have a separate function for the search because that function uses folder identifiers recursively, not the xml result.
    searchForInddFile(folderIdentifier, callSequence);
  }

  var foundInddFile = false; // global, first descendant to find file sets it for all

  function searchForInddFile(folderIdentifier, callSequence) {
    // 'folderIdentifier' is a complete file path in the asset space
    // find the files and folders in that folder.
    callServerData = {
      command: 'asset.list',
      folderIdentifier: folderIdentifier,
      projectId: projectId
    };
    // console.log('searchForInddFile: Folder: ', folderIdentifier, ' ', callServerData);

    callServer(callServerData, function($xml) {
      $allAssets = $xml.find('asset'); // that finds all the asset entries
      // here, look through the files returned and see if any one is an indd file
      // we use the first indd file we find, assuming that only one file exists
      $allAssets.each(function(index, element){
        $asset = $(element);
        var type = $asset.find('type').text();
        var name = $asset.find('name').text();
        // console.log('searchForInddFile: each file: ', name, ': ', type);
        if (type != 'file') { return true; } // same as 'continue'
        if (name.match(/\.indd$/i) != null) { // use this in case the extension contains upper case. Look for any .indd file
          foundInddFile = true;
          passOn($asset, callSequence); // NOTE, $asset, not $xml
          return false; // same as 'break'
        }
      });
      if (foundInddFile) { return; } // have found file and started project creation, all done here.
      // Here we look for and descend recursively into folders.
      // How do I make this breadth-first? callServer will send asset.list commands async.
      // It is cross-domain so cannot be made sync (jquery docs say)
      // We will ignore this for the moment and assume there is only one indd file.
      $allAssets.each(function(index, element){
        $asset = $(element);
        var type = $asset.find('type').text();
        if (type != 'folder') { return true; } // same as 'continue'
        var newFolderIdentifier = $asset.find('identifier').text();
        console.log('searchForInddFile: each folder: ', newFolderIdentifier, ': ', type);
        searchForInddFile(newFolderIdentifier, callSequence);
        if (foundInddFile) { return false; } // same as break
      })
    }, '.searchForInddFile');
  }

  function doCreateProject($xml, callSequence) {
    // transform the InDesign file in the asset space into an editable project in the one2edit document space.
    // $xml is the result of 'asset.list' and contains just the asset we want to convert.
    var assetIdentifier = $xml.find('identifier').text();
    console.log('doCreateProject: with asset:', assetIdentifier);
    callServer({
      command:'document.link',
      assetProjectId: projectId,
      assetIdentifier: assetIdentifier,
      folderId: uploadedMastersFolderId // where to create the new document
    }, function($xml){
      console.log('doCreateProject: success: ', $xml[0]);
      passOn($xml, callSequence);
    }, '.createProject');
  }

  function doAddContentGroup($xml, callSequence) {
    // Add the 'Editable Content Group' which is the expected one for our workflows
    // if the group already exists (somehow) we get a code-4004 error, which we can ignore.
    // Except we don't yet, which is a mssing feature. Have to allow it in callServer.
    // '$xml' is the result of a call to 'doCreateProject'
    var $document = $xml.find('document');
    console.log('doAddContentGroup: initially: document:', $document[0]);
    var documentId = $document.children('id').text(); // there is a document.owner.id too; don't want that one.
    callServer({
      command: 'document.group.add',
      documentId: documentId,
      name: 'Editable Content Group'
    }, function($xml) {
      $xml.find('success').append($document);
      passOn($xml, callSequence); // $xml is both returned data and document
    }, '.addContentGroup');
  }

  function doPopulateContentGroup($xmlWithDocument, callSequence) {
    // Move any content from an editable layer to the Editable Content Group just created.
    // '$xml' contains the response to a 'document.group.add' API call, plus the document xml.
    $success = $xmlWithDocument.find('success');
    var toGroupId = $success.children('group').children('id').text();
    var documentId = $success.children('document').children('id').text();
    // I cannot filter the layers by name with a regular expression. I need to list the layers and sort out which ones I want here.
    console.log('doPopulateContentGroup: toGroupId: ', toGroupId, '; documentId: ', documentId, '; xml: ', $success[0]);
    callServer({
      command: 'document.layer.list',
      documentId: documentId
    }, function($xml) {
      console.log('doPopulateContentGroup: layer.list success: xml: ', $xml[0]); // we have a successful API call result
      $allLayers = $xml.find('layer');
      var editableLayersXml = '';
      $allLayers.each(function(index, element){
        var $layer = $(element);
        var name = $layer.find('name').text();
        var editable = (name.match(/^editable/i) != null); // any layer starting with 'editable', case-independent, is matched
        console.log('allLayers.each: name: ', name, '; editable: ', editable);
        if (editable) { // then include this layer in the content filter for moving into the Content Group
          var layerId = $layer.find('id').text();
          editableLayersXml = editableLayersXml + ' <id>'+ layerId +'</id> '; // accumulate layer filter xml text.
        }
      });
      console.log('editableLayersXml: ', editableLayersXml);
      if (editableLayersXml == '') { // no editable layers, warn the user
        $display.find('.populateContentGroup').find('.noEditableContent').slideDown();
        return;
      }
      var filterXml = '<filters> <itemlayer> '+editableLayersXml+' </itemlayer> </filters>';
      var serverData = {
        command: 'document.group.item.move',
        documentId: documentId,
        toGroupId: toGroupId,
        filter: filterXml // the filter determines what content is moved
      };
      callServer(serverData, function($xml){
        console.log('moveItemsToContentGroup: serverData: ', serverData, 'responseXml:', $xml[0]);
        passOn($xmlWithDocument, callSequence); // NOTE, not xml returned from callServer
      }, '.moveItemsToContentGroup');
    }, '.populateContentGroup');
  }

  function editDocument($xmlWithDocument, callSequence) {
    var documentId = $xmlWithDocument.find('success').children('document').children('id').text();
    console.log('editDocument: documentId: ', documentId);
    $('#textDiv').hide();
    $('#flashDiv').show();
    var ap = {
      options: { onLogout: function() {
        $(".one2edit").slideUp(function(){ passOn($xmlWithDocument, callSequence); });
         // perhaps do something else after closing editor and sliding window up is finished
      } },
      parameters: { wmode: 'opaque' },
      flashvars: {
        server: baseURL,
        sessionId: sessionId,        // A sessionId is returned when we authenticate a user (see API example)
        clientId: clientId,                    // Id of our Client Workspace
        idleTimeout: 900,
        editor: {
          closeBehavior: one2edit.editor.CLOSE_BEHAVIOR_LOGOUT,
          documentId: documentId
        }
        // jobEditor: {
        //   jobId: jobId               // A jobId is returned when we start a job template (see API example)
        // }
      }
    }
    console.log('openTemplateJob: ap: '+JSON.stringify(ap,null,4)); // just do it like this for debug output. Does not show functions.
    one2edit.create(ap);
  }


  </script>


</body>
</html>
