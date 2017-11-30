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
  <?php

  // NO echo() here - session is starting

  require('e21session.php');
  $username = "one2editApiTest@team.expresskcs.com";
  $t = new One2editTalker($username, TRUE); // does one2edit login always, to create separate session here: always log out of this session when this page finishes.

  // NOTE that above code must be run before anything else is sent to the browser. Should it be above <html>?

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
  </style>

</head>
<body>

  <h2>Upload an InDesign Package to be used as a new master document</h2>
  First, create a folder holding everything with InDesign - File - Package.
  Then compress that folder and its files into a zip archive.
  Then upload that zip archive.

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
  echo('Found UploadedMasters Project Folder id='.$uploadedMastersFolderId.'<br />');

  // For the one2edit asset space, we don't need to find the folder ID, because the API uses folder names.
  // We upload all zip files to /UploadedPackages in the asset space, and unzip them there.
  // But we do need to find the asset project to upload to.
  $data = ['command'=>'asset.list'];
  $serverResponse = $t->talk($data);
  if ($serverResponse === FALSE) { exit(); }
  // Can there be multiple asset spaces in one workspace? If so, the below would fail.
  if (!isset($serverResponse['assets']['asset']['project'])) { debug(1, 'Cannot find any asset project.'); exit(); }
  $assetProject = $serverResponse['assets']['asset']['project'];
  echo("Found asset project number: $assetProject<br />");

  exportToJavascript('uploadedMastersFolderId', $uploadedMastersFolderId);
  exportToJavascript('projectId', $assetProject);
  ?>

  <script type="text/javascript">

  // All this javascript is triggered when someone hits <submit> on the file upload form in html below.

  var zipFileIdentifier; // asset pathname from server
  var $display; // html where we put notices, not defined yet


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
    fd.append("folderIdentifier", "/");
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
        doUnzipAtServer($xml);
      }
    });
    return false;
  }

  // That is fine, but now we are doing javascript access direct from user's browser to one2edit.
  // Using PHP to set up the session makes sense, because then the one2edit apssword never touches the browser.
  // It's just rather scruffy to have both javascript and php handle the one2edit API.
  // I wish I had a library to handle these APIs direct from the API definitions.

  function doUnzipAtServer($xml) {
    // $xml is the result of the asset.upload API call.
    var zipFileIdentifier = $xml.find('identifier').text();
    callServer({
      command: 'asset.extract',
      projectId: projectId, // that is the assset project
      identifier: zipFileIdentifier,
      remove: true // we definitely want to remove the zip file
    }, doSearchForInddFile, '.unzipping');
  }

  function callServer(data, realSuccess, displaySection) {
    // call the one2edit server. Display notices about what is happening.
    // To inhibit notices, give a 'displaySection' that is not implemented in html.
    // the 'realSuccess' function is only called if the server does not return an error code.
    // 'data' is an array of the parameters to pass to the server.
    // callServer autoamtically adds the sessionId and workspaceId to data.

    // TODO: There is no error handling function for the ajax call, so if the network is broken, ...?
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
        var code = $xml.children('code').text();
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

  function doSearchForInddFile($xml) {
    // $xml is the result of the 'asset.extract' call
    var folderIdentifier = $xml.find('identifier').text();
    // Hunt down the .indd file within the folders created by unzipping.
    // Have a separate function for the search because that function uses folder identifiers recursively, not the xml result.
    searchForInddFile(folderIdentifier);
  }

  var foundInddFile = false; // global, first descendant to find file sets it for all

  function searchForInddFile(folderIdentifier) {
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
          doCreateProject($asset); // pass specific subset of original xml data as a jQuery object
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
        searchForInddFile(newFolderIdentifier);
        if (foundInddFile) { return false; } // same as break
      })
    }, '.searchForInddFile');
  }

  function doCreateProject($xml) {
    // transform the InDesign file in the asset space into an editable project in the one2edit document space.
    // $xml is the result of 'asset.list' and contains just the asset we want to convert.
    var assetIdentifier = $xml.find('identifier').text();
    console.log('doCreateProject: with asset:', assetIdentifier);
    callServer({
      command:'document.link',
      assetProjectId: projectId,
      assetIdentifier: assetIdentifier
    }, function(xml){
      console.log('doCreateProject: success: ', xml);
      doAddContentGroup($(xml));
    }, '.createProject');
  }

  function doAddContentGroup($xml) {
    // Add the 'Editable Content Group' which is the expected one for our workflows
    // if the group already exists (somehow) we get a code-4004 error, which we can ignore.
    // Except we don't yet, which is a mssing feature. Have to allow it in callServer.
    // '$xml' is the result of a call to 'doCreateProject'
    var $document = $xml.find('document');
    var documentId = $document.children('id').text(); // there is a document.owner.id too; don't want that one.
    callServer({
      command: 'document.group.add',
      documentId: documentId,
      name: 'Editable Content Group'
    }, function($xml) {
      console.log('doAddContentGroup: success: xml:', $xml[0]);
      doPopulateContentGroup($xml, documentId);
    })
  }

  function doPopulateContentGroup($xml, documentId) {
    // Move any content from an editable layer to the Editable Content Group just created.
    // '$xml' contains the response to a 'document.group.add' API call.
    // 'documentId' is the ID of the InDesign document (the one2edit project id) that we are modifying.
    var toGroupId = $xml.find('id').text();
    // I cannot filter the layers by name with a regular expression. I need to list the layers and sort out which ones I want here.
    console.log('doPopulateContentGroup: toGroupId: ', toGroupId, '; documentId: ', documentId, '; xml: ', $xml[0]);
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
        return; // all done
      }, '.moveItemsToContentGroup');
    }, '.populateContentGroup');
  }


  </script>

  <!--  This form here triggers off all the javascript above. Not entirely sure how! -->
  <form method="post" id="fileUploadForm" name="fileinfo" onsubmit="return submitForm();">
    <label>Select Zip Archive File :</label><br />
    <input type="file" name="data" required />
    <input type="submit" value="Upload Zip File" />
  </form>
  <!-- This code here, which is all initially hidden, displays the progress of the operation. -->
  <!-- I'm not sure the 'float left' does any good at all. My css is very rusty :-( -->
  <div id='display'>
    <div class='uploading' style='display:none;'>
      <div style='float; left'>Uploading File:</div> <div class='errorReturned' style='display:none;'> Code: <span class='code'>undefined</span> Message: <span class='message'>undefined too</span></div>
      <div class='success' style='display:none;'> Success! </div>
    </div>
    <div class='unzipping' style='display:none;'>
      <div style='float; left'>Unzipping Archive File at Server:</div> <div class='errorReturned' style='display:none;'> Code: <span class='code'>undefined</span> Message: <span class='message'>undefined too</span></div>
      <div class='success' style='display:none;'> Success! </div>
    </div>
    <div class='createProject' style='display:none;'>
      <div style='float; left'>Creating Project at Server:</div> <div class='errorReturned' style='display:none;'> Code: <span class='code'>undefined</span> Message: <span class='message'>undefined too</span></div>
      <div class='success' style='display:none;'> Success! </div>
    </div>
    <div class='populateContentGroup' style='display:none;'>
      <div style='float; left'>Populate Content Group at Server:</div> <div class='errorReturned' style='display:none;'> Code: <span class='code'>undefined</span> Message: <span class='message'>undefined too</span></div>
      <div class='success' style='display:none;'> Success! </div>
      <div class='noEditableContent' style='display:none;'>NO EDITABLE CONTENT☹️</div>
    </div>
    <div class='moveItemsToContentGroup' style='display:none;'>
      <div style='float; left'>Moving Items to Editable Content Group at Server:</div> <div class='errorReturned' style='display:none;'> Code: <span class='code'>undefined</span> Message: <span class='message'>undefined too</span></div>
      <div class='success' style='display:none;'> Success! </div>
    </div>
  </div>
</body>
</html>
