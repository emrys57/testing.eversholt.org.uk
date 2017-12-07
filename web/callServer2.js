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

  // All the functions belwo defined like function(a, callSequence) are designed to be chained together.
  // They mostly contain async returns from the API. In the return code, the next function in callSequence
  // is called, passing along a modified version of the object a.

  // https://stackoverflow.com/questions/2320069/jquery-ajax-file-upload
  // This uploads a file. Change this to give a progress bar on upload and drag-and-drop functionality.
  my.submitForm = function(a, callSequence) {
    // a.$form is the jQuery object that is the upload form.
    // callSequence is an array of functions to call as each async API call completes.
    console.log("submit event");
    $uploading = $display.find('.uploading');
    $uploading.slideDown();
    var fd = new FormData(a.$form[0]);
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
        console.log('submitForm: ajax error: textStatus: ', textStatus, 'errorThrown: ', errorThrown, ' jqXHR: ', jqXHR);
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
        a.$xml = $xml;
        passOn(a, callSequence0);
      }
    });
  }

  // That is fine, but now we are doing javascript access direct from user's browser to one2edit.
  // Using PHP to set up the session makes sense, because then the one2edit apssword never touches the browser.
  // It's just rather scruffy to have both javascript and php handle the one2edit API.
  // I wish I had a library to handle these APIs direct from the API definitions.

  my.doUnzipAtServer = function(a, callSequence) {
    // a.$xml is the result of the asset.upload API call.
    // If callSequence is present, it's an array of functions. If the callServer here succeeds, the top function is removed, called and the remaining callSequence passed on.
    // It's a way of building a sequence of API calls which complete asynchronously.
    var zipFileIdentifier = a.$xml.find('identifier').text();
    callServer({
      command: 'asset.extract',
      projectId: projectId, // that is the assset project
      identifier: zipFileIdentifier,
      remove: true // we definitely want to remove the zip file
    }, function($xml) {
      console.log('doUnzipAtServer: success: xml:', $xml[0]);
      a.$xml = $xml;
      passOn(a, callSequence);
    }, '.unzipping');
  }

  function callServer(a, b, c) { my.callServer(a, b, c); } // for compatibility with older code. Grrr

  function passOn(a, callSequence) {
    // pass on the object `a` to the next function in the sequence, if such a function exists
    if ($.isArray(callSequence) && (typeof callSequence[0] == 'function')) {
      var topFunction = callSequence.shift();
      // var fs = '';
      // callSequence.forEach(function(f) { fs += ((fs.length == 0)?'':',') + f.name; });
      // console.log('passOn: ', a, '; to: ', topFunction.name, '; sequence after pop: ', fs);
      topFunction(a, callSequence);
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
      error: function(jqXHR, textStatus, errorThrown) {
        console.log('callServer: ajax error: textStatus: ', textStatus, 'errorThrown: ', errorThrown, ' jqXHR: ', jqXHR);
      },
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

  my.doSearchForInddFile = function(a, callSequence) {
    // a.$xml is the result of the 'asset.extract' call
    var folderIdentifier = a.$xml.find('identifier').text();
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
        // $allFiles = $xml.find('asset').children('type:contains("file")').parent(); // file assets
        // $allFiles.each(function(i,e) {
        //   var $asset = $(e);
        //   if ($asset.children('name').text().match(/\.indd$/i) != null) {
        //     foundInddFile = true;
        //     a.$asset = $asset;
        //     passOn(a, callSequence); // NOTE, $asset, not $xml
        //     return false; // same as 'break'
        //   }
        // });
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
            a.$asset = $asset; // picks up `a` from cotaining function
            // It's important to keep passing the same `a` and not create a new one, because `a` might contain extra info
            // which we don't know about - like some callback routine to be executed much later.
            passOn(a, callSequence); // NOTE, $asset, not $xml
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
          //
          // newFolderIdentifier = $(e).find('type:contains("folder")').parent().find('identifier').text();
          // if (newFolderIdentifier == '') { return true; } // i.e. continue
          // searchForInddFile(newFolderIdentifier, callSequence);
          // if (foundInddFile) { return false; } // same as break
        })
      }, '.searchForInddFile');
    }
  }



  my.doCreateProject = function(a, callSequence) {
    // transform the InDesign file in the asset space into an editable project in the one2edit document space.
    // a.$asset is the result of 'asset.list' and contains just the asset we want to convert.
    var assetIdentifier = a.$asset.find('identifier').text();
    console.log('doCreateProject: with asset:', assetIdentifier);
    callServer({
      command: 'document.link',
      assetProjectId: projectId,
      assetIdentifier: assetIdentifier,
      folderId: uploadedMastersFolderId // where to create the new document
    }, function($xml) {
      console.log('doCreateProject: success: ', $xml[0]);
      a.$xml = $xml;
      passOn(a, callSequence);
    }, '.createProject');
  }

  my.doAddContentGroup = function(a, callSequence) {
    // Add the 'Editable Content Group' which is the expected one for our workflows
    // if the group already exists (somehow) we get a code-4004 error, which we can ignore.
    // Except we don't yet, which is a mssing feature. Have to allow it in callServer.
    // 'a.$xml' is the result of a call to 'doCreateProject'
    a.$document = a.$xml.find('document');
    console.log('doAddContentGroup: initially: document:', a.$document[0]);
    a.documentId = $document.children('id').text(); // there is a document.owner.id too; don't want that one.
    callServer({
      command: 'document.group.add',
      documentId: a.documentId,
      name: 'Editable Content Group'
    }, function($xml) {
      a.$xml = $xml;
      passOn(a, callSequence);
    }, '.addContentGroup');
  }

  my.doPopulateContentGroup = function(a, callSequence) {
    // Move any content from an editable layer to the Editable Content Group just created.
    // 'a.$xml' contains the response to a 'document.group.add' API call. a.$document is the document.
    $success = a.$xml.find('success');
    a.toGroupId = $success.children('group').children('id').text();
    // I cannot filter the layers by name with a regular expression. I need to list the layers and sort out which ones I want here.
    console.log('doPopulateContentGroup: toGroupId: ', a.toGroupId, '; documentId: ', a.documentId, '; xml: ', $success[0]);
    callServer({
      command: 'document.layer.list',
      documentId: a.documentId
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
        documentId: a.documentId,
        toGroupId: a.toGroupId,
        filter: filterXml // the filter determines what content is moved
      };
      callServer(serverData, function($xml) {
        console.log('moveItemsToContentGroup: serverData: ', serverData, 'responseXml:', $xml[0]);
        passOn(a, callSequence); // NOTE, not xml returned from callServer
      }, '.moveItemsToContentGroup');
    }, '.populateContentGroup');
  }

  function openFlash(ap, a, callSequence) {
    console.log('openFlash: ap: ', ap);
    $('#textDiv').hide();
    $('#flashDiv').show();
    var ap0 = {
      options: {
        onLogout: function() { $(".one2edit").slideUp(function() { passOn(a, callSequence); }) }
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

  my.editDocument = function(a, callSequence) {
    console.log('editDocument: documentId: ', a.documentId);
    openFlash({
      flashvars: {
        editor: {
          documentId: a.documentId
        }
      }
    }, a, callSequence);
  };

  my.editJob = function(a, callSequence) {
    console.log('editJob: $xmlWithJob:', a.$xml[0]);
    // TODO: from the jobs, find one STARTED and edit it
    a.$job = a.$xml.find('jobs').find('status:contains("STARTED")').first().parent(); // first started job
    a.jobId = a.$job.children('id').text();
    console.log('editJob: jobId: ', a.jobId);
    openFlash({
      flashvars: {
        jobEditor: {
          jobId: a.jobId
        }
      }
    }, a, callSequence);
  }


  my.logoutFromServer = function() {
    callServer({
      command: 'user.session.quit'
    }, undefined, '#logout');
  }

  function findTemplatelessWorkflow1(a, callSequence) {
    a.folderName = 'UploadedWorkflows';
    a.type = 'workflow';
    findFolderWithName(a, callSequence);
  }

  function findTemplatelessWorkflow2(a, callSequence) {
    a.fileName = 'TemplatelessWorkflow';
    a.type = 'workflow';
    findFileInFolder(a, callSequence);
  }

  function findFolderWithName(a, callSequence) {
    // type is 'workflow', 'template' or 'document'
    callServer({
      command: a.type+'.folder.list',
      depth: 0 // recurse indefinitely
    }, function($xml) {
      a.$folder = $xml.find('name:contains("'+a.folderName+'")').parent();
      passOn(a, callSequence); // which we hope has the folder in it.
    },
    '.findFolderWithName');
  }

  function findFileInFolder(a, callSequence) {
    // a.type is 'workflow', 'template' or 'document'
    a.folderId = a.$folder.children('id').text();
    callServer({
      command: a.type+'.list',
      folderId: a.folderId
    }, function($xml) {
      // TODO: this fails where a second folder includes the text and then more.
      a.$file = $xml.find('name:contains("'+a.fileName+'")').parent();
      passOn(a, callSequence); // which we hope has the file in it.
    }, '.findFileInFolder')
  }

  function startTemplatelessTemplateJobReally(a, callSequence) {
    console.log('startTemplatelessTemplateJobReally: a: ', a, '; xmlPassedIn:', a.$xml[0]);
    a.workflowId = a.$file.children('id').text();
    a.newDocumentName = a.$document.children('name').text() + ' Version Copy';
    var ap = {
      command: 'template.start',
      documentName: a.newDocumentName,
      documentId: a.documentId,
      workflowId: a.workflowId
    }
    callServer(ap, function($xml){
      a.$xml = $xml;
      passOn(a, callSequence);
    }, '.startTemplatelessTemplateJobReally');
  }


  my.startTemplatelessTemplateJob = function(a, callSequence) {
    var callSequence1 = [
      findTemplatelessWorkflow1,
      findTemplatelessWorkflow2,
      startTemplatelessTemplateJobReally,
      my.editJob
    ]
    passOn(a, callSequence1);
  }


  return my;
}(L$ || { nameSpace: 'L$' }));
