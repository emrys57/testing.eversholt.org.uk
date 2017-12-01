// Library of functions for calling the server API


// javascript module pattern design taken from "Loose Augmentation" section of http://www.adequatelygood.com/JavaScript-Module-Pattern-In-Depth.html

var L$ = (function(my) {
  // I don't know, something very very weird going on... relating to timing of loading of callserver.js?
  // It might be a bug in chrome... the first time I do cache-clear-and-reload button in chrome, after having
  // uploaded a new copy of callServer.js, $.ready() seems to run before L$  has been defined.
  // If I hit return in th eurl bar to do teh reload, it works ok, and then the cache-clear reload keeps on working.
  // Shift-reload in firefox works, does not show this bug.
  // Very very weird.

  var $display = $(document); // where callServer etc looks for progress elements to show. Refined later.

  my.$display = function($a) { // set or get the $display variable
    if (typeof $a != 'undefined') { $display = $a; }
    return $display;
  }

  // https://stackoverflow.com/questions/2320069/jquery-ajax-file-upload
  // This uploads a file. Change this to give a progress bar on upload and drag-and-drop functionality.
  my.submitForm = function(element, callSequence) {
    // element is the html form element = document.getElementById("fileUploadForm")
    // callSequence is an array of functions to call as each async API call completes.
    console.log("submit event");
    $uploading = $display.find('.uploading');
    $uploading.slideDown();
    var fd = new FormData(element);
    fd.append("sessionId", sessionId);
    fd.append("clientId", clientId);
    fd.append("command", "asset.upload");
    fd.append("projectId", projectId);
    fd.append("folderIdentifier", "/UploadedPackages");
    $.ajax({
      url: apiUrl,
      type: "POST",
      data: fd,
      processData: false, // tell jQuery not to process the data
      contentType: false, // tell jQuery not to set
      error: function(jqXHR, textStatus, errorThrown) {
        console.log('ajax error: textStatus: ', textStatus, 'errorThrown: ', errorThrown, ' jqXHR: ', jqXHR);
      },
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
        passOn($xml, callSequence0);
      }
    });
  }

  // That is fine, but now we are doing javascript access direct from user's browser to one2edit.
  // Using PHP to set up the session makes sense, because then the one2edit apssword never touches the browser.
  // It's just rather scruffy to have both javascript and php handle the one2edit API.
  // I wish I had a library to handle these APIs direct from the API definitions.

  my.doUnzipAtServer = function($xml, callSequence) {
    // $xml is the result of the asset.upload API call.
    // If callSequence is present, it's an array of functions. If the callServer here succeeds, the top function is removed, called and the remaining callSequence passed on.
    // It's a way of building a sequence of API calls which complete asynchronously.
    var zipFileIdentifier = $xml.find('identifier').text();
    callServer({
      command: 'asset.extract',
      projectId: projectId, // that is the assset project
      identifier: zipFileIdentifier,
      remove: true // we definitely want to remove the zip file
    }, function($xml) {
      console.log('doUnzipAtServer: success: xml:', $xml[0]);
      passOn($xml, callSequence);
    }, '.unzipping');
  }

  function callServer(a, b, c) { my.callServer(a, b, c); } // for compatibility with older code. Grrr

  function passOn($xml, callSequence) {
    // pass on the $xml to the next function in the sequence, if such a function exists
    if ($.isArray(callSequence) && (typeof callSequence[0] == 'function')) {
      var topFunction = callSequence.shift();
      // var fs = '';
      // callSequence.forEach(function(f) {
      //   fs += ',' + f.name;
      // });
      // console.log('passOn: ', $xml[0], '; to: ', topFunction.name, '; sequence after pop: ', fs);
      topFunction($xml, callSequence);
    } else { console.log('No more to do in sequence, finished.'); }
  }

  my.callServer = function(data, realSuccess, displaySection) {
    // call the one2edit server. Display notices about what is happening.
    // To inhibit notices, give a 'displaySection' that is not implemented in html.
    // the 'realSuccess' function is only called if the server does not return an error code.
    // 'data' is an array of the parameters to pass to the server.
    // callServer autoamtically adds the sessionId and workspaceId to data.

    var $displaySection = $display.find(displaySection); // this is the bit of the html we will be displaying progress in
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
          console.log('callServer: ', displaySection, ': server returned error: code: ', code, '; message: ', message);
          $displaySection.find('.errorReturned').slideDown();
          $displaySection.find('.code').text(code);
          $displaySection.find('.message').text(message);
          return;
        }
        $displaySection.find('.success').slideDown();
        if (typeof realSuccess != 'undefined') {
          realSuccess($xml);
        }
      }
    })
  }

  my.doSearchForInddFile = function($xml, callSequence) {
    // $xml is the result of the 'asset.extract' call
    var folderIdentifier = $xml.find('identifier').text();
    var foundInddFile = false; // global, first descendant to find file sets it for all
    // Hunt down the .indd file within the folders created by unzipping.
    // Have a separate function for the search because that function uses folder identifiers recursively, not the xml result.
    searchForInddFile(folderIdentifier, callSequence);



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
        $allAssets.each(function(index, element) {
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
        $allAssets.each(function(index, element) {
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
  }



  my.doCreateProject = function($xml, callSequence) {
    // transform the InDesign file in the asset space into an editable project in the one2edit document space.
    // $xml is the result of 'asset.list' and contains just the asset we want to convert.
    var assetIdentifier = $xml.find('identifier').text();
    console.log('doCreateProject: with asset:', assetIdentifier);
    callServer({
      command: 'document.link',
      assetProjectId: projectId,
      assetIdentifier: assetIdentifier,
      folderId: uploadedMastersFolderId // where to create the new document
    }, function($xml) {
      console.log('doCreateProject: success: ', $xml[0]);
      passOn($xml, callSequence);
    }, '.createProject');
  }

  my.doAddContentGroup = function($xml, callSequence) {
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

  my.doPopulateContentGroup = function($xmlWithDocument, callSequence) {
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
      $allLayers.each(function(index, element) {
        var $layer = $(element);
        var name = $layer.find('name').text();
        var editable = (name.match(/^editable/i) != null); // any layer starting with 'editable', case-independent, is matched
        console.log('allLayers.each: name: ', name, '; editable: ', editable);
        if (editable) { // then include this layer in the content filter for moving into the Content Group
          var layerId = $layer.find('id').text();
          editableLayersXml = editableLayersXml + ' <id>' + layerId + '</id> '; // accumulate layer filter xml text.
        }
      });
      console.log('editableLayersXml: ', editableLayersXml);
      if (editableLayersXml == '') { // no editable layers, warn the user
        $display.find('.populateContentGroup').find('.noEditableContent').slideDown();
        return;
      }
      var filterXml = '<filters> <itemlayer> ' + editableLayersXml + ' </itemlayer> </filters>';
      var serverData = {
        command: 'document.group.item.move',
        documentId: documentId,
        toGroupId: toGroupId,
        filter: filterXml // the filter determines what content is moved
      };
      callServer(serverData, function($xml) {
        console.log('moveItemsToContentGroup: serverData: ', serverData, 'responseXml:', $xml[0]);
        passOn($xmlWithDocument, callSequence); // NOTE, not xml returned from callServer
      }, '.moveItemsToContentGroup');
    }, '.populateContentGroup');
  }

  function openFlash(ap, $xml, callSequence) {
    console.log('openFlash: ap: ', ap);
    $('#textDiv').hide();
    $('#flashDiv').show();
    var ap0 = {
      options: {
        onLogout: function() { $(".one2edit").slideUp(function() { passOn($xmlWithDocument, callSequence); }) }
        // perhaps do something else after closing editor and sliding window up is finished
      },
      parameters: { wmode: 'opaque' },
      flashvars: {
        server: baseURL,
        sessionId: sessionId, // A sessionId is returned when we authenticate a user (see API example)
        clientId: clientId, // Id of our Client Workspace
        idleTimeout: 900,
        editor: {
          closeBehavior: one2edit.editor.CLOSE_BEHAVIOR_LOGOUT,
        }
      }
    };
    var ap2 = $.extend(true, {}, ap0, ap); // deep copy
    console.log('openFlash: ap2: ' + JSON.stringify(ap2, null, 4)); // just do it like this for debug output. Does not show functions.
    one2edit.create(ap2);
  }

  my.editDocument = function($xmlWithDocument, callSequence) {
    var documentId = $xmlWithDocument.find('success').children('document').children('id').text();
    console.log('editDocument: documentId: ', documentId);
    openFlash({
      flashvars: {
        editor: {
          documentId: documentId
        }
      }
    }, $xmlWithDocument, callSequence);
  };

  my.editJob = function($xmlWithJob, callSequence) {
    console.log('editJob: $xmlWithJob:', $xmlWithJob[0]);
    // TODO: from the jobs, find one STARTED and edit it
    var $job = $xmlWithJob.find('jobs').find('status:contains("STARTED")').first().parent(); // first started job
    var jobId = $job.children('id').text();
    console.log('editJob: jobId: ', jobId);
    openFlash({
      flashvars: {
        jobEditor: {
          jobId: jobId
        }
      }
    }, $xmlWithJob, callSequence);
  }


  my.logoutFromServer = function() {
    callServer({
      command: 'user.session.quit'
    }, undefined, '#logout');
  }

  function findTemplatelessWorkflow1($xml, callSequence) {
    findFolderWithName('UploadedWorkflows', 'workflow', $xml, callSequence);
  }

  function findTemplatelessWorkflow2($xml, callSequence) {
    findFileInFolder('TemplatelessWorkflow', 'workflow', $xml, callSequence);
  }

  function findFolderWithName(folderName, type, $xmlPassedIn, callSequence) {
    // type is 'workflow', 'template' or 'document'
    callServer({
      command: type+'.folder.list',
      depth: 0 // recurse indefinitely
    }, function($xml) {
      var $folder = $xml.find('name:contains("'+folderName+'")').parent();
      $xmlPassedIn.find('success').append($folder); // NOTE that this removes $folder from $xml
      passOn($xmlPassedIn, callSequence); // which we hope has the folder in it.
    },
    '.findFolderWithName');
  }

  function findFileInFolder(fileName, type, $xmlPassedIn, callSequence) {
    // type is 'workflow', 'template' or 'document'
    var folderId = $xmlPassedIn.find('success').children('folder').children('id').text();
    callServer({
      command: type+'.list',
      folderId: folderId
    }, function($xml) {
      // TODO: this fails where a second folder includes the text and then more.
      var $file = $xml.find('name:contains("'+fileName+'")').parent();
      $xmlPassedIn.find('success').append($file);
      passOn($xmlPassedIn, callSequence); // which we hope has the file in it.
    }, '.findFileInFolder')
  }

  function startTemplatelessTemplateJobReally($xmlPassedIn, callSequence) {
    console.log('startTemplatelessTemplateJobReally: xmlPassedIn:', $xmlPassedIn[0]);
    var $success = $xmlPassedIn.find('success');
    var documentId = $success.children('document').children('id').text();
    var workflowId = $success.children('workflow').children('id').text();
    var newDocumentName = $success.children('document').children('name').text() + ' Version Copy';
    var ap = {
      command: 'template.start',
      documentName: newDocumentName,
      documentId: documentId,
      workflowId: workflowId
    }
    callServer(ap, function($xml){
      passOn($xml, callSequence);
    }, '.startTemplatelessTemplateJobReally');
  }

  function startEditingJob($xmlPassedIn, callSequence) {

  }

  my.startTemplatelessTemplateJob = function($xmlWithDocument, callSequence) {
    var callSequence1 = [
      findTemplatelessWorkflow1,
      findTemplatelessWorkflow2,
      startTemplatelessTemplateJobReally,
      my.editJob
    ]
    passOn($xmlWithDocument, callSequence1);
  }


  return my;
}(L$ || { nameSpace: 'L$' }));
