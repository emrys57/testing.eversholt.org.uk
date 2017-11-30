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
  $t = new One2editTalker($username, FALSE); // does one2edit login always, even if a session exists elsewhere.
  // Have to make sure to logout when leaving this page, or run out of one2edit licences!

  // NOTE that above code must be run before anything else is sent to the browser. Should it be above <html>?

  exportToJavascript('session', $t->eSession->sessionId);
  exportToJavascript('baseURL', $t->one2editServerBaseUrl);
  exportToJavascript('workspaceId', $t->one2editWorkspaceId);
  exportToJavascript('apiUrl', $t->one2editServerApiUrl);
  exportToJavascript('sessionId', $t->eSession->sessionId);
  exportToJavascript('clientId', $t->one2editWorkspaceId);
  ?>

  <style>
  .one2edit {
    width:100%;
    height:100vh;
    background-color: #e6ffff;
  }
  </style>

</head>
<body>

  <h2>Upload an InDesign Package to be used as a new master document</h2>
  A folder should be produced with InDesign - File - Package.
  Then the folder should be compressed into a zip archive.

  <?php
  // Find the Project Folder '/UploadedMasters'
  $data = ['command'=>'document.folder.list', 'id'=>1, 'depth'=>1]; // list all folders in folder 1, which is the document folder
  $xml = $t->talk($data);
  if ($xml === FALSE) {exit();} // turn on debug messages to see info from talk()
  // THIS FAILS if there is only one folder - needs regularising to array
  if (!isset($xml['folders']['folder'][0][id])) { debug(1, 'Cannot find any folders.'); if (debug(1)) { var_dump($xml); echo('<br />'); } exit(); }
  $folders = $xml['folders']['folder'];
  foreach ($folders as $folder) {
    if (isset($folder['id']) and isset($folder['name']) and ($folder['name'] == 'UploadedMasters')) {
      $uploadedMastersFolderId = $folder['id'];
    }
  }
  echo('Found UploadedMasters Project Folder id='.$uploadedMastersFolderId.'<br />');
  // Find the asset project to upload to
  $data = ['command'=>'asset.list'];
  $xml = $t->talk($data);
  if ($xml === FALSE) {exit();}
  if (!isset($xml['assets']['asset']['project'])) {debug(1, 'Cannot find any asset project.'); exit(); }
  $assetProject = $xml['assets']['asset']['project'];
  echo("Found asset project number: $assetProject<br />");
  exportToJavascript('projectId', $assetProject);
  ?>
  <script type="text/javascript">
  var zipFileIdentifier; // asset pathname from server
  var $display; // html where we put notices, not defined yet

  function callServer(data, realSuccess, displaySection) {
    $displaySection =$display.find(displaySection);
    $displaySection.slideDown();
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
        var $xml = $(returnedData);
        var code = $xml.find('code').text();
        if (code != '') {
          var message = $xml.find('message').text();
          console.log('callServer: ', displaySection,': server returned error: code: ', code, '; message: ', message);
          $displaySection.find('.errorReturned').slideDown();
          $displaySection.find('.code').text(code);
          $displaySection.find('.message').text(message);
          return;
        }
        $displaySection.find('.success').slideDown();
        if (typeof realSuccess != 'undefined') {
          realSuccess($xml)
        }
      }
    })
  }

  function doPopulateContentGroup($xml, documentId) {
    // Move any content from an editable layer to the Editable Content Group just created.
    var toGroupId = $xml.find('id').text();
    // I cannot filter the layers by name with a regular expression. I need to list the layers and sort out which ones I want here.
    console.log('doPopulateContentGroup: toGroupId: ', toGroupId, '; documentId: ', documentId, '; xml: ', $xml[0]);
    callServer({
      command: 'document.layer.list',
      documentId: documentId
    }, function($xml) {
      console.log('doPopulateContentGroup: layer.list success: xml: ', $xml[0]);
      $allLayers = $xml.find('layer');
      var editableLayersXml = '';
      $allLayers.each(function(index, element){
        var $layer = $(element);
        var name = $layer.find('name').text();
        var editable = (name.match(/^editable/i) != null);
        console.log('allLayers.each: name: ', name, '; editable: ', editable);
        if (editable) {
          var layerId = $layer.find('id').text();
          editableLayersXml = editableLayersXml + ' <id>'+ layerId +'</id> '; // accumulate layer filter xml text.
        }
      });
      console.log('editableLayersXml: ', editableLayersXml);
      if (editableLayersXml == '') {
        $display.find('.populateContentGroup').find('.noEditableContent').slideDown();
        return;
      }
      var filterXml = '<filters> <itemlayer> '+editableLayersXml+' </itemlayer> </filters>';
      var serverData = {
        command: 'document.group.item.move',
        documentId: documentId,
        toGroupId: toGroupId,
        filter: filterXml
      };
      callServer(serverData, function($xml){
        console.log('moveItemsToContentGroup: serverData: ', serverData, 'responseXml:', $xml[0]);
        return; // all done
      }, '.moveItemsToContentGroup');
    }, '.populateContentGroup');
  }

  function doAddContentGroup($xml) {
    // Add the 'Editable Content Group' which is the expected one for our workflows
    // if the group already exists (somehow) we get a code-4004 error, which we can ignore.
    // Except we don't yet, which is a mssing feature. Have to allow it in callServer.
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

  var foundInddFile = false; // global, first descendant to find file sets it for all

  function searchForInddFile(folderIdentifier) {
    callServerData = {
      command: 'asset.list',
      folderIdentifier: folderIdentifier,
      projectId: projectId
    };
    // console.log('searchForInddFile: Folder: ', folderIdentifier, ' ', callServerData);

    callServer(callServerData, function($xml) {
      $allAssets = $xml.find('asset'); // that finds all the asset entries
      $allAssets.each(function(index, element){
        $asset = $(element);
        var type = $asset.find('type').text();
        var name = $asset.find('name').text();
        // console.log('searchForInddFile: each file: ', name, ': ', type);
        if (type != 'file') { return true; } // same as 'continue'
        if (name.endsWith('.indd')) {
          foundInddFile = true;
          doCreateProject($asset);
          return false; // same as 'break'
        }
      });
      if (foundInddFile) { return; } // have found file and started project creation, all done here.
      $allAssets.each(function(index, element){
        $asset = $(element);
        var type = $asset.find('type').text();
        if (type != 'folder') { return true; } // same as 'continue'
        var newFolderIdentifier = $asset.find('identifier').text();
        console.log('searchForInddFile: each folder: ', newFolderIdentifier, ': ', type);
        searchForInddFile(newFolderIdentifier); // how do I make this breadth-first? callServer will send asset.list commands async.
        // it is cross-domain so cannot be made sync (jquery docs say)
        // we will ignore this for the moment and assume there is only one indd file.
        if (foundInddFile) { return false; } // same as break
      })
    }, '.searchForInddFile');
  }

  function doSearchForInddFile($xml) {
    var folderIdentifier = $xml.find('identifier').text();
    searchForInddFile(folderIdentifier);
  }

  function doCreateProject($xml) {
    var assetIdentifier = $xml.find('identifier').text();
    console.log('doCreateProject: with asset:', assetIdentifier);
    // here, we know the location of the unzipped folder in the asset space.
    // We need to hunt down the .indd file within the unzipped folder.
    // We search for the first indd file we can find, breadth-first.
    callServer({
      command:'document.link',
      assetProjectId: projectId,
      assetIdentifier: assetIdentifier
    }, function(xml){
      console.log('doCreateProject: success: ', xml);
      doAddContentGroup($(xml));
    }, '.createProject');
  }

  function doUnzipAtServer($xml) {
    var zipFileIdentifier = $xml.find('identifier').text();
    callServer({
      command: 'asset.extract',
      projectId: projectId,
      identifier: zipFileIdentifier,
      remove: true
    }, doSearchForInddFile, '.unzipping');
  }

  // https://stackoverflow.com/questions/2320069/jquery-ajax-file-upload
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
</script>
<form method="post" id="fileUploadForm" name="fileinfo" onsubmit="return submitForm();">
  <label>Select Zip Archive File :</label><br />
  <input type="file" name="data" required />
  <input type="submit" value="Upload Zip File" />
</form>
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
</body>
</html>
